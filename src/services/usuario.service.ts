import bcrypt from "bcrypt";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { getAuth, getDb } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";
import type {
  EstadoUsuario,
  EstudiantePerfilUpdate,
  ListarUsuariosFiltros,
  ListarUsuariosResultado,
  LoginAdminInput,
  LoginAdminResultado,
  UsuarioAdminCreate,
  UsuarioAdminFirestore,
  UsuarioAdminUpdate,
  UsuarioPublico,
} from "../types/usuario.types.js";
import { AppError } from "../utils/AppError.js";
import { isInstitutionalEmail } from "../utils/institutionalEmail.js";
import { signStudentSessionJwt } from "../utils/studentJwt.js";
import { parseAndValidateUsername } from "../utils/username.js";

const SALT_ROUNDS = 10;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function resolverEstado(data: DocumentData): EstadoUsuario {
  const raw = data.estado;
  if (raw === "INACTIVO") return "INACTIVO";
  return "ACTIVO";
}

function esEstudiante(data: DocumentData): boolean {
  return typeof data.firebaseUid === "string";
}

// Mapear documento de Firestore a respuesta pública
function toPublico(id: string, data: DocumentData): UsuarioPublico {
  const estado = resolverEstado(data);
  if (esEstudiante(data)) {
    return {
      id,
      tipo: "estudiante",
      nombre: null,
      nombres: typeof data.nombres === "string" ? data.nombres : null,
      apellidos: typeof data.apellidos === "string" ? data.apellidos : null,
      documento: null,
      username: data.username == null ? null : String(data.username),
      avatar: data.avatar == null ? null : String(data.avatar),
      email: String(data.email ?? ""),
      rolId: String(data.rolId ?? ""),
      estado,
      profileComplete: Boolean(data.profileComplete),
    };
  }

  return {
    id,
    tipo: "admin",
    nombre: typeof data.nombre === "string" ? data.nombre : null,
    nombres: null,
    apellidos: null,
    documento: typeof data.documento === "string" ? data.documento : null,
    username: null,
    avatar: null,
    email: String(data.email ?? ""),
    rolId: String(data.rolId ?? ""),
    estado,
  };
}

function normalizarPaginacion(filtros: ListarUsuariosFiltros): { page: number; limit: number } {
  const page = Math.max(1, Number(filtros.page) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(filtros.limit) || DEFAULT_LIMIT));
  return { page, limit };
}

async function validarRolActivo(rolId: string): Promise<void> {
  const snap = await getDb().collection(collections.roles).doc(rolId).get();
  if (!snap.exists) {
    throw new AppError("El rol indicado no existe.", 400);
  }
  const rol = snap.data()!;
  if (rol.activo === false) {
    throw new AppError("El rol indicado está inactivo.", 400);
  }
}

async function asegurarCampoUnico(
  campo: "email" | "documento",
  valor: string,
  excluirId?: string
): Promise<void> {
  const snap = await getDb().collection(collections.usuarios).where(campo, "==", valor).limit(1).get();
  if (snap.empty) return;
  const docId = snap.docs[0].id;
  if (excluirId && docId === excluirId) return;
  const etiqueta = campo === "email" ? "correo" : "documento";
  throw new AppError(`El ${etiqueta} ya está registrado.`, 409);
}

// Validar que el username no esté reservado por otro estudiante
async function asegurarUsernameDisponible(username: string, excluirUid: string): Promise<void> {
  const ref = getDb().collection(collections.usernames).doc(username);
  const snap = await ref.get();
  if (!snap.exists) return;
  const owner = snap.data()?.uid as string | undefined;
  if (owner === excluirUid) return;
  throw new AppError("Este nombre de usuario ya está en uso.", 409);
}

function mapFirebaseAuthError(err: unknown): never {
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code: string }).code);
    const map: Record<string, { status: number; msg: string }> = {
      "auth/email-already-exists": { status: 409, msg: "El correo electrónico ya está registrado." },
      "auth/invalid-email": { status: 400, msg: "El formato del correo electrónico no es válido." },
    };
    const m = map[code];
    if (m) throw new AppError(m.msg, m.status);
  }
  const msg = err instanceof Error ? err.message : "Error al comunicarse con Firebase Auth";
  throw new AppError(msg, 500);
}

async function obtenerDocumentoUsuario(id: string) {
  const ref = getDb().collection(collections.usuarios).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError("Usuario no encontrado.", 404);
  }
  return { ref, snap, data: snap.data()! };
}

// Iniciar sesión de usuario administrativo (email + contraseña en Firestore)
export async function loginAdmin(input: LoginAdminInput): Promise<LoginAdminResultado> {
  const email = input.email.trim().toLowerCase();
  const snap = await getDb().collection(collections.usuarios).where("email", "==", email).limit(5).get();

  if (snap.empty) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  let adminDoc: (typeof snap.docs)[number] | undefined;
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!esEstudiante(data) && typeof data.passwordHash === "string") {
      adminDoc = doc;
      break;
    }
  }

  if (!adminDoc) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  const data = adminDoc.data();
  const estado = resolverEstado(data);
  if (estado !== "ACTIVO") {
    throw new AppError("La cuenta está inactiva.", 403);
  }

  const ok = await bcrypt.compare(input.password, String(data.passwordHash));
  if (!ok) {
    throw new AppError("Credenciales inválidas.", 401);
  }

  const user = toPublico(adminDoc.id, data);
  const token = signStudentSessionJwt({
    uid: adminDoc.id,
    nombres: user.nombre ?? user.email,
    apellidos: "",
    email: user.email,
    rolId: user.rolId,
    estado: user.estado,
  });

  return { token, user };
}

// Listar usuarios con filtros y paginación en memoria
export async function listarUsuarios(filtros: ListarUsuariosFiltros): Promise<ListarUsuariosResultado> {
  const { page, limit } = normalizarPaginacion(filtros);
  const snap = await getDb().collection(collections.usuarios).get();

  let items = snap.docs.map((d) => toPublico(d.id, d.data()));

  if (filtros.rolId) {
    items = items.filter((u) => u.rolId === filtros.rolId);
  }
  if (filtros.estado) {
    items = items.filter((u) => u.estado === filtros.estado);
  }
  if (filtros.email) {
    const q = filtros.email.trim().toLowerCase();
    items = items.filter((u) => u.email.toLowerCase().includes(q));
  }

  items.sort((a, b) => a.email.localeCompare(b.email));

  const total = items.length;
  const start = (page - 1) * limit;
  const paginated = items.slice(start, start + limit);

  return { items: paginated, total, page, limit };
}

// Obtener un usuario por id de documento
export async function obtenerUsuarioPorId(id: string): Promise<UsuarioPublico> {
  const { data } = await obtenerDocumentoUsuario(id);
  return toPublico(id, data);
}

// Crear usuario administrativo en Firestore
export async function crearUsuarioAdmin(input: UsuarioAdminCreate): Promise<UsuarioPublico> {
  await validarRolActivo(input.rolId);

  const email = input.email.trim().toLowerCase();
  const documento = input.documento.trim();
  const nombre = input.nombre.trim();

  await asegurarCampoUnico("email", email);
  await asegurarCampoUnico("documento", documento);

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const now = FieldValue.serverTimestamp();
  const row: Omit<UsuarioAdminFirestore, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
    updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
  } = {
    nombre,
    documento,
    email,
    passwordHash,
    rolId: input.rolId,
    estado: "ACTIVO",
    createdAt: now,
    updatedAt: now,
  };

  const ref = await getDb().collection(collections.usuarios).add(row);
  const created = await ref.get();
  return toPublico(ref.id, created.data()!);
}

// Actualizar usuario administrativo o campos permitidos de estudiante
export async function actualizarUsuario(id: string, input: UsuarioAdminUpdate): Promise<UsuarioPublico> {
  const { ref, data } = await obtenerDocumentoUsuario(id);
  const esAlumno = esEstudiante(data);

  if (input.rolId) {
    await validarRolActivo(input.rolId);
  }

  if (esAlumno) {
    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (input.rolId !== undefined) patch.rolId = input.rolId;
    if (input.estado !== undefined) patch.estado = input.estado;
    if (Object.keys(patch).length === 1) {
      throw new AppError("No hay campos válidos para actualizar en un perfil de estudiante.", 400);
    }
    await ref.update(patch);
    const updated = await ref.get();
    return toPublico(id, updated.data()!);
  }

  const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (input.nombre !== undefined) patch.nombre = input.nombre.trim();
  if (input.documento !== undefined) {
    const documento = input.documento.trim();
    await asegurarCampoUnico("documento", documento, id);
    patch.documento = documento;
  }
  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    await asegurarCampoUnico("email", email, id);
    patch.email = email;
  }
  if (input.rolId !== undefined) patch.rolId = input.rolId;
  if (input.estado !== undefined) patch.estado = input.estado;
  if (input.password !== undefined) {
    patch.passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  }

  if (Object.keys(patch).length === 1) {
    throw new AppError("No hay campos para actualizar.", 400);
  }

  await ref.update(patch);
  const updated = await ref.get();
  return toPublico(id, updated.data()!);
}

// Obtener perfil del estudiante autenticado (US-04)
export async function obtenerMiPerfilEstudiante(uid: string): Promise<UsuarioPublico> {
  const { data } = await obtenerDocumentoUsuario(uid);
  if (!esEstudiante(data)) {
    throw new AppError("Solo los estudiantes pueden acceder a este perfil.", 403);
  }
  return toPublico(uid, data);
}

// Actualizar perfil del estudiante autenticado (US-04)
export async function actualizarPerfilEstudiante(
  uid: string,
  input: EstudiantePerfilUpdate
): Promise<UsuarioPublico> {
  const db = getDb();
  const userRef = db.collection(collections.usuarios).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AppError("Usuario no encontrado.", 404);
  }
  const data = userSnap.data()!;
  if (!esEstudiante(data)) {
    throw new AppError("Solo los estudiantes pueden actualizar este perfil.", 403);
  }
  if (resolverEstado(data) !== "ACTIVO") {
    throw new AppError("Tu cuenta está inactiva. Contactá a soporte.", 403);
  }

  const patch: Record<string, unknown> = {};
  let nuevoUsername: string | undefined;
  const usernameAnterior =
    typeof data.usernameNormalized === "string"
      ? data.usernameNormalized
      : typeof data.username === "string"
        ? data.username
        : null;

  if (input.nombres !== undefined) patch.nombres = input.nombres.trim();
  if (input.apellidos !== undefined) patch.apellidos = input.apellidos.trim();
  if (input.avatar !== undefined) patch.avatar = input.avatar?.trim() || null;

  if (input.username !== undefined) {
    nuevoUsername = parseAndValidateUsername(input.username);
    if (nuevoUsername !== usernameAnterior) {
      await asegurarUsernameDisponible(nuevoUsername, uid);
      patch.username = nuevoUsername;
      patch.usernameNormalized = nuevoUsername;
    }
  }

  if (input.email !== undefined) {
    const email = input.email.trim().toLowerCase();
    if (!isInstitutionalEmail(email)) {
      throw new AppError(
        "El correo no pertenece a un dominio institucional permitido.",
        400
      );
    }
    const emailActual = String(data.email ?? "").trim().toLowerCase();
    if (email !== emailActual) {
      await asegurarCampoUnico("email", email, uid);
      patch.email = email;
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new AppError("No hay campos para actualizar.", 400);
  }

  patch.updatedAt = FieldValue.serverTimestamp();

  const usernameRef =
    nuevoUsername && nuevoUsername !== usernameAnterior
      ? db.collection(collections.usernames).doc(nuevoUsername)
      : null;
  const usernameAnteriorRef = usernameAnterior
    ? db.collection(collections.usernames).doc(usernameAnterior)
    : null;

  await db.runTransaction(async (tx) => {
    if (nuevoUsername && nuevoUsername !== usernameAnterior && usernameRef) {
      const unSnap = await tx.get(usernameRef);
      if (unSnap.exists) {
        const owner = unSnap.data()?.uid as string | undefined;
        if (owner !== uid) {
          throw new AppError("Este nombre de usuario ya está en uso.", 409);
        }
      }
      tx.set(usernameRef, { uid });
      if (usernameAnteriorRef && usernameAnterior !== nuevoUsername) {
        tx.delete(usernameAnteriorRef);
      }
    }
    tx.update(userRef, patch);
  });

  const authPatch: { email?: string; displayName?: string; photoURL?: string | null } = {};
  if (typeof patch.email === "string") authPatch.email = patch.email;
  if (patch.nombres !== undefined || patch.apellidos !== undefined) {
    const nombres = typeof patch.nombres === "string" ? patch.nombres : String(data.nombres ?? "");
    const apellidos = typeof patch.apellidos === "string" ? patch.apellidos : String(data.apellidos ?? "");
    authPatch.displayName = `${nombres} ${apellidos}`.trim() || undefined;
  }
  if (patch.avatar !== undefined) {
    authPatch.photoURL = patch.avatar === null ? null : String(patch.avatar);
  }

  if (Object.keys(authPatch).length > 0) {
    try {
      await getAuth().updateUser(uid, authPatch);
    } catch (err) {
      mapFirebaseAuthError(err);
    }
  }

  const updated = await userRef.get();
  return toPublico(uid, updated.data()!);
}

// Eliminar cuenta del estudiante autenticado (US-05)
export async function eliminarCuentaEstudiante(uid: string): Promise<void> {
  const db = getDb();
  const userRef = db.collection(collections.usuarios).doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new AppError("Usuario no encontrado.", 404);
  }
  const data = userSnap.data()!;
  if (!esEstudiante(data)) {
    throw new AppError("Solo los estudiantes pueden eliminar esta cuenta.", 403);
  }

  const username =
    typeof data.usernameNormalized === "string"
      ? data.usernameNormalized
      : typeof data.username === "string"
        ? data.username
        : null;
  const usernameRef = username ? db.collection(collections.usernames).doc(username) : null;

  await db.runTransaction(async (tx) => {
    if (usernameRef) {
      tx.delete(usernameRef);
    }
    tx.delete(userRef);
  });

  try {
    await getAuth().deleteUser(uid);
  } catch (err) {
    mapFirebaseAuthError(err);
  }
}

// Deshabilitar usuario (estado INACTIVO); en estudiantes también desactiva Firebase Auth
export async function deshabilitarUsuario(id: string): Promise<UsuarioPublico> {
  const { ref, data } = await obtenerDocumentoUsuario(id);

  if (resolverEstado(data) === "INACTIVO") {
    throw new AppError("El usuario ya está inactivo.", 400);
  }

  await ref.update({
    estado: "INACTIVO",
    updatedAt: FieldValue.serverTimestamp(),
  });

  if (esEstudiante(data)) {
    try {
      await getAuth().updateUser(id, { disabled: true });
    } catch {
      /* Si falla Auth, el perfil en Firestore ya quedó inactivo */
    }
  }

  const updated = await ref.get();
  return toPublico(id, updated.data()!);
}
