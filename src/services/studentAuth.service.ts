import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAuth, getDb } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";
import type { StudentUserPublic, StudentUsuarioFirestore } from "../types/studentUser.js";
import { AppError } from "../utils/AppError.js";
import { isInstitutionalEmail } from "../utils/institutionalEmail.js";
import { parseAndValidateUsername } from "../utils/username.js";
import { signStudentSessionJwt } from "../utils/studentJwt.js";

/** Id del documento en `roles` (seed). */
export const ROL_ESTUDIANTE_ID = "estudiante";

function toPublic(id: string, row: StudentUsuarioFirestore): StudentUserPublic {
  return {
    id,
    nombres: row.nombres,
    apellidos: row.apellidos,
    username: row.username,
    avatar: row.avatar,
    email: row.email,
    rolId: row.rolId,
    estado: row.estado,
    profileComplete: row.profileComplete,
  };
}

function asStudentRow(data: DocumentData | undefined): StudentUsuarioFirestore | null {
  if (!data || typeof data.firebaseUid !== "string") return null;
  return data as StudentUsuarioFirestore;
}

function requireInstitutionalEmail(email: string | undefined | null): void {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) {
    throw new AppError("No se pudo verificar el correo de la cuenta.", 400);
  }
  if (!isInstitutionalEmail(normalized)) {
    throw new AppError(
      "Solo se permiten correos institucionales con dominio autorizado (por ejemplo @universidad.edu.co).",
      403
    );
  }
}

async function ensureInstitutionalClaim(uid: string, decoded: DecodedIdToken): Promise<void> {
  if (decoded.institutional === true) return;
  await getAuth().setCustomUserClaims(uid, { institutional: true });
}

function mapFirebaseAuthError(err: unknown): never {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    const map: Record<string, { status: number; msg: string }> = {
      "auth/email-already-exists": { status: 409, msg: "El correo electrónico ya está registrado." },
      "auth/invalid-email": { status: 400, msg: "El formato del correo electrónico no es válido." },
      "auth/invalid-password": { status: 400, msg: "La contraseña no cumple las políticas de seguridad." },
      "auth/weak-password": { status: 400, msg: "La contraseña es demasiado débil." },
    };
    const m = map[code];
    if (m) throw new AppError(m.msg, m.status);
  }
  const msg = err instanceof Error ? err.message : "Error al comunicarse con Firebase Auth";
  throw new AppError(msg, 500);
}

export async function checkUsernameAvailability(raw: string): Promise<{
  available: boolean;
  normalizedUsername: string;
}> {
  const normalizedUsername = parseAndValidateUsername(raw);
  const snap = await getDb().collection(collections.usernames).doc(normalizedUsername).get();
  return { available: !snap.exists, normalizedUsername };
}

export type RegisterManualInput = {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string | null;
  email: string;
  password: string;
};

export async function registerStudentManual(
  input: RegisterManualInput
): Promise<{ customToken: string; user: StudentUserPublic }> {
  if (!isInstitutionalEmail(input.email)) {
    throw new AppError(
      "El correo no pertenece a un dominio institucional permitido. Revisá la configuración del servidor o usá un correo válido.",
      400
    );
  }

  const normalizedUsername = parseAndValidateUsername(input.username);
  const db = getDb();
  const usernameRef = db.collection(collections.usernames).doc(normalizedUsername);
  const pre = await usernameRef.get();
  if (pre.exists) {
    throw new AppError("Este nombre de usuario ya está en uso.", 409);
  }

  let firebaseUid: string | undefined;
  try {
    const auth = getAuth();
    const displayName = `${input.nombres.trim()} ${input.apellidos.trim()}`.trim();
    const userRecord = await auth.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      displayName: displayName || undefined,
      photoURL: input.avatar?.trim() || undefined,
      emailVerified: true,
    });
    firebaseUid = userRecord.uid;
    const newUid = firebaseUid;
    
    await auth.setCustomUserClaims(newUid, {
      institutional: true,
    });    

    const userRef = db.collection(collections.usuarios).doc(newUid);
    const now = FieldValue.serverTimestamp();

    await db.runTransaction(async (tx) => {
      const unSnap = await tx.get(usernameRef);
      if (unSnap.exists) {
        const owner = unSnap.data()?.uid as string | undefined;
        if (owner !== newUid) {
          throw new AppError("Este nombre de usuario ya está en uso.", 409);
        }
      }
      const row: Omit<StudentUsuarioFirestore, "createdAt" | "updatedAt"> & {
        createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
        updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
      } = {
        firebaseUid: newUid,
        nombres: input.nombres.trim(),
        apellidos: input.apellidos.trim(),
        username: normalizedUsername,
        usernameNormalized: normalizedUsername,
        avatar: input.avatar?.trim() || null,
        email: input.email.trim().toLowerCase(),
        rolId: ROL_ESTUDIANTE_ID,
        estado: "ACTIVO",
        profileComplete: true,
        authProviders: ["password"],
        createdAt: now,
        updatedAt: now,
      };
      tx.set(usernameRef, { uid: newUid });
      tx.set(userRef, row);
    });

    const customToken = await auth.createCustomToken(newUid, {
      institutional: true,
    });
    
    const userSnap = await userRef.get();
    const row = asStudentRow(userSnap.data());
    if (!row) throw new AppError("No se pudo leer el perfil recién creado.", 500);

    return { customToken, user: toPublic(newUid, row) };
  } catch (err) {
    if (firebaseUid) {
      try {
        await getAuth().deleteUser(firebaseUid);
      } catch {
        /* noop */
      }
    }
    if (err instanceof AppError) throw err;
    mapFirebaseAuthError(err);
  }
}

export type SessionResult =
  | {
      needsUsername: true;
      token: null;
      user: StudentUserPublic;
    }
  | {
      needsUsername: false;
      token: string;
      user: StudentUserPublic;
    };

function pickGoogleNames(decoded: DecodedIdToken): { nombres: string; apellidos: string } {
  const ext = decoded as DecodedIdToken & { given_name?: string; family_name?: string };
  const given = ext.given_name?.trim();
  const family = ext.family_name?.trim();
  if (given || family) {
    return { nombres: given || "Estudiante", apellidos: family || "" };
  }
  const full = decoded.name?.trim();
  if (full) {
    const parts = full.split(/\s+/);
    const nombres = parts[0] || "Estudiante";
    const apellidos = parts.slice(1).join(" ");
    return { nombres, apellidos };
  }
  return { nombres: "Estudiante", apellidos: "" };
}

/** `decoded` debe provenir de `verifyIdToken` (p. ej. middleware). */
export async function resolveSessionForDecoded(decoded: DecodedIdToken): Promise<SessionResult> {
  requireInstitutionalEmail(decoded.email);

  const uid = decoded.uid;
  await ensureInstitutionalClaim(uid, decoded);

  const db = getDb();
  const userRef = db.collection(collections.usuarios).doc(uid);
  let snap = await userRef.get();

  if (!snap.exists) {
    const provider = decoded.firebase?.sign_in_provider;
    if (provider === "google.com") {
      const { nombres, apellidos } = pickGoogleNames(decoded);
      const now = FieldValue.serverTimestamp();
      await userRef.set({
        firebaseUid: uid,
        nombres,
        apellidos,
        username: null,
        usernameNormalized: null,
        avatar: decoded.picture || null,
        email: (decoded.email || "").trim().toLowerCase(),
        rolId: ROL_ESTUDIANTE_ID,
        estado: "ACTIVO",
        profileComplete: false,
        authProviders: ["google.com"],
        createdAt: now,
        updatedAt: now,
      });
      snap = await userRef.get();
    } else {
      throw new AppError(
        "No hay perfil asociado a esta cuenta. Registrate con el formulario manual o iniciá sesión con Google.",
        404
      );
    }
  }

  const row = asStudentRow(snap.data());
  if (!row) {
    throw new AppError("Tu cuenta no corresponde al perfil de estudiante esperado.", 403);
  }

  if (row.estado !== "ACTIVO") {
    throw new AppError("Tu cuenta está inactiva. Contactá a soporte.", 403);
  }

  const user = toPublic(uid, row);

  if (!row.profileComplete || !row.username) {
    return { needsUsername: true, token: null, user };
  }

  const token = signStudentSessionJwt({
    uid,
    nombres: row.nombres,
    apellidos: row.apellidos,
    username: row.username,
    email: row.email,
    rolId: row.rolId,
    estado: row.estado,
  });

  return { needsUsername: false, token, user };
}

export async function completeGoogleUsernameForDecoded(
  decoded: DecodedIdToken,
  usernameRaw: string
): Promise<{ token: string; user: StudentUserPublic }> {
  if (decoded.firebase?.sign_in_provider !== "google.com") {
    throw new AppError("Este paso solo aplica cuando te autenticaste con Google en esta sesión.", 400);
  }

  requireInstitutionalEmail(decoded.email);

  const uid = decoded.uid;
  await ensureInstitutionalClaim(uid, decoded);
  const norm = parseAndValidateUsername(usernameRaw);
  const db = getDb();
  const userRef = db.collection(collections.usuarios).doc(uid);
  const usernameRef = db.collection(collections.usernames).doc(norm);

  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const row = asStudentRow(userSnap.data());
    if (!row) {
      throw new AppError("No se encontró tu perfil. Volvé a iniciar sesión con Google.", 404);
    }
    if (row.profileComplete && row.username) {
      throw new AppError("Tu perfil ya está completo. No hace falta elegir otro nombre de usuario.", 400);
    }

    const unSnap = await tx.get(usernameRef);
    if (unSnap.exists) {
      const owner = unSnap.data()?.uid as string | undefined;
      if (owner !== uid) {
        throw new AppError("Este nombre de usuario ya está en uso.", 409);
      }
    }

    const now = FieldValue.serverTimestamp();
    tx.set(usernameRef, { uid });
    tx.set(
      userRef,
      {
        username: norm,
        usernameNormalized: norm,
        profileComplete: true,
        nombres: row.nombres,
        apellidos: row.apellidos,
        avatar: row.avatar ?? decoded.picture ?? null,
        email: row.email || (decoded.email || "").trim().toLowerCase(),
        updatedAt: now,
      },
      { merge: true }
    );
  });

  const finalSnap = await userRef.get();
  const finalRow = asStudentRow(finalSnap.data());
  if (!finalRow || !finalRow.username) {
    throw new AppError("No se pudo actualizar el perfil.", 500);
  }

  const token = signStudentSessionJwt({
    uid,
    nombres: finalRow.nombres,
    apellidos: finalRow.apellidos,
    username: finalRow.username,
    email: finalRow.email,
    rolId: finalRow.rolId,
    estado: finalRow.estado,
  });

  return { token, user: toPublic(uid, finalRow) };
}
