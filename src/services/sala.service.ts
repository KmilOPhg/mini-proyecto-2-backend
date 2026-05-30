import { FieldValue, type DocumentData, type Timestamp } from "firebase-admin/firestore";
import { getDb } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";
import type {
  ListarMisSalasResultado,
  MensajePublico,
  SalaFirestore,
  SalaPublica,
} from "../types/sala.types.js";
import { AppError } from "../utils/AppError.js";

const NOMBRE_MIN = 3;
const NOMBRE_MAX = 80;
const MENSAJE_MAX = 2000;
const MENSAJES_DEFAULT_LIMIT = 50;
const MENSAJES_MAX_LIMIT = 100;
const CODIGO_RE = /^CRF-[A-Z0-9]{3}-[A-Z0-9]{3}$/;
const CODIGO_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigoInvitacion(): string {
  const part = (n: number) =>
    Array.from({ length: n }, () => CODIGO_CHARS[Math.floor(Math.random() * CODIGO_CHARS.length)]).join("");
  return `CRF-${part(3)}-${part(3)}`;
}

function normalizarCodigoInvitacion(codigo: string): string {
  const limpio = codigo.trim().toUpperCase();
  if (!CODIGO_RE.test(limpio)) {
    throw new AppError("El código debe tener el formato CRF-XXX-XXX.", 400);
  }
  return limpio;
}

async function codigoInvitacionDisponible(codigo: string): Promise<boolean> {
  const snap = await getDb()
    .collection(collections.salas)
    .where("codigoInvitacion", "==", codigo)
    .limit(1)
    .get();
  return snap.empty;
}

async function resolverCodigoInvitacion(codigoSolicitado?: string): Promise<string> {
  if (codigoSolicitado) {
    const codigo = normalizarCodigoInvitacion(codigoSolicitado);
    if (!(await codigoInvitacionDisponible(codigo))) {
      throw new AppError("Ese código de invitación ya está en uso.", 409);
    }
    return codigo;
  }

  for (let i = 0; i < 8; i++) {
    const codigo = generarCodigoInvitacion();
    if (await codigoInvitacionDisponible(codigo)) return codigo;
  }
  throw new AppError("No se pudo generar un código de invitación único.", 500);
}

function timestampToIso(value: Timestamp | undefined): string | null {
  if (!value || typeof value.toDate !== "function") return null;
  return value.toDate().toISOString();
}

function normalizarNombre(nombre: string): string {
  const limpio = nombre.trim();
  if (limpio.length < NOMBRE_MIN || limpio.length > NOMBRE_MAX) {
    throw new AppError(`El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`, 400);
  }
  return limpio;
}

function normalizarTextoMensaje(texto: string): string {
  const limpio = texto.trim();
  if (!limpio) {
    throw new AppError("El mensaje no puede estar vacío.", 400);
  }
  if (limpio.length > MENSAJE_MAX) {
    throw new AppError(`El mensaje no puede superar ${MENSAJE_MAX} caracteres.`, 400);
  }
  return limpio;
}

function asSalaRow(data: DocumentData | undefined): SalaFirestore | null {
  if (!data || typeof data.nombre !== "string" || typeof data.creadorUid !== "string") return null;
  const participantes = Array.isArray(data.participantes)
    ? data.participantes.filter((p): p is string => typeof p === "string")
    : [];
  return {
    nombre: data.nombre,
    creadorUid: data.creadorUid,
    participantes,
    codigoInvitacion:
      typeof data.codigoInvitacion === "string" ? data.codigoInvitacion : undefined,
    createdAt: data.createdAt as Timestamp | undefined,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
}

function toSalaPublica(id: string, row: SalaFirestore, uidConsulta: string): SalaPublica {
  return {
    id,
    nombre: row.nombre,
    creadorUid: row.creadorUid,
    participantes: row.participantes,
    codigoInvitacion: row.codigoInvitacion ?? null,
    esCreador: row.creadorUid === uidConsulta,
    createdAt: timestampToIso(row.createdAt),
    updatedAt: timestampToIso(row.updatedAt),
  };
}

function tieneAccesoSala(row: SalaFirestore, uid: string): boolean {
  if (row.creadorUid === uid) return true;
  return row.participantes.includes(uid);
}

async function obtenerDocumentoSala(salaId: string) {
  const ref = getDb().collection(collections.salas).doc(salaId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new AppError("La sala no existe.", 404);
  }
  const row = asSalaRow(snap.data());
  if (!row) {
    throw new AppError("La sala tiene un formato inválido.", 500);
  }
  return { ref, snap, row };
}

async function obtenerUsername(uid: string): Promise<string> {
  const snap = await getDb().collection(collections.usuarios).doc(uid).get();
  if (!snap.exists) {
    throw new AppError("Usuario no encontrado.", 404);
  }
  const data = snap.data()!;
  if (typeof data.username === "string" && data.username.trim()) {
    return data.username.trim();
  }
  const nombres = typeof data.nombres === "string" ? data.nombres.trim() : "";
  const apellidos = typeof data.apellidos === "string" ? data.apellidos.trim() : "";
  const compuesto = `${nombres} ${apellidos}`.trim();
  if (compuesto) return compuesto;
  return typeof data.email === "string" ? data.email : uid;
}

// Crear sala de estudio (US-06)
export async function crearSala(
  creadorUid: string,
  nombre: string,
  codigoSolicitado?: string
): Promise<SalaPublica> {
  const nombreNormalizado = normalizarNombre(nombre);
  const codigoInvitacion = await resolverCodigoInvitacion(codigoSolicitado);
  const db = getDb();
  const now = FieldValue.serverTimestamp();
  const row: Omit<SalaFirestore, "createdAt" | "updatedAt"> & {
    createdAt: ReturnType<typeof FieldValue.serverTimestamp>;
    updatedAt: ReturnType<typeof FieldValue.serverTimestamp>;
  } = {
    nombre: nombreNormalizado,
    creadorUid,
    participantes: [creadorUid],
    codigoInvitacion,
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection(collections.salas).add(row);
  const created = await ref.get();
  const createdRow = asSalaRow(created.data());
  if (!createdRow) {
    throw new AppError("No se pudo leer la sala recién creada.", 500);
  }
  return toSalaPublica(ref.id, createdRow, creadorUid);
}

// Listar salas creadas por el anfitrión (US-06)
export async function listarMisSalas(creadorUid: string): Promise<ListarMisSalasResultado> {
  const snap = await getDb()
    .collection(collections.salas)
    .where("creadorUid", "==", creadorUid)
    .get();

  const items = snap.docs
    .map((doc) => {
      const row = asSalaRow(doc.data());
      if (!row) return null;
      return toSalaPublica(doc.id, row, creadorUid);
    })
    .filter((item): item is SalaPublica => item !== null)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    items,
    total: items.length,
    vacio: items.length === 0,
  };
}

// Obtener detalle de sala validando acceso
export async function obtenerSala(salaId: string, uid: string): Promise<SalaPublica> {
  const { row } = await obtenerDocumentoSala(salaId);
  if (!tieneAccesoSala(row, uid)) {
    throw new AppError("No tenés acceso a esta sala.", 403);
  }
  return toSalaPublica(salaId, row, uid);
}

// Unirse a una sala por ID (TS-02)
export async function unirseASala(salaId: string, uid: string): Promise<SalaPublica> {
  const { ref, row } = await obtenerDocumentoSala(salaId);
  if (tieneAccesoSala(row, uid)) {
    return toSalaPublica(salaId, row, uid);
  }

  await ref.update({
    participantes: FieldValue.arrayUnion(uid),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const updatedRow = asSalaRow(updated.data());
  if (!updatedRow) {
    throw new AppError("No se pudo actualizar la sala.", 500);
  }
  return toSalaPublica(salaId, updatedRow, uid);
}

// Unirse a una sala por código CRF-XXX-XXX (TS-02)
export async function unirsePorCodigo(codigo: string, uid: string): Promise<SalaPublica> {
  const codigoNormalizado = normalizarCodigoInvitacion(codigo);
  const snap = await getDb()
    .collection(collections.salas)
    .where("codigoInvitacion", "==", codigoNormalizado)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new AppError("No existe una sala con ese código.", 404);
  }

  const doc = snap.docs[0]!;
  return unirseASala(doc.id, uid);
}

// Actualizar nombre de sala (US-07, solo creador)
export async function actualizarNombreSala(
  salaId: string,
  uid: string,
  nombre: string
): Promise<SalaPublica> {
  const nombreNormalizado = normalizarNombre(nombre);
  const { ref, row } = await obtenerDocumentoSala(salaId);
  if (row.creadorUid !== uid) {
    throw new AppError("Solo el creador de la sala puede editarla.", 403);
  }

  await ref.update({
    nombre: nombreNormalizado,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  const updatedRow = asSalaRow(updated.data());
  if (!updatedRow) {
    throw new AppError("No se pudo actualizar la sala.", 500);
  }
  return toSalaPublica(salaId, updatedRow, uid);
}

// Eliminar sala y sus mensajes (US-07, solo creador)
export async function eliminarSala(salaId: string, uid: string): Promise<void> {
  const { ref, row } = await obtenerDocumentoSala(salaId);
  if (row.creadorUid !== uid) {
    throw new AppError("Solo el creador de la sala puede eliminarla.", 403);
  }

  const db = getDb();
  const mensajesSnap = await ref.collection(collections.mensajes).get();
  if (!mensajesSnap.empty) {
    let batch = db.batch();
    let n = 0;
    for (const doc of mensajesSnap.docs) {
      batch.delete(doc.ref);
      n++;
      if (n >= 400) {
        await batch.commit();
        batch = db.batch();
        n = 0;
      }
    }
    if (n > 0) await batch.commit();
  }

  await ref.delete();
}

// Guardar mensaje de texto en Firestore (TS-02)
export async function guardarMensaje(
  salaId: string,
  uid: string,
  texto: string
): Promise<MensajePublico> {
  const textoNormalizado = normalizarTextoMensaje(texto);
  const { ref, row } = await obtenerDocumentoSala(salaId);
  if (!tieneAccesoSala(row, uid)) {
    throw new AppError("No tenés acceso a esta sala.", 403);
  }

  const username = await obtenerUsername(uid);
  const mensajeRef = ref.collection(collections.mensajes).doc();
  const now = FieldValue.serverTimestamp();
  await mensajeRef.set({
    uid,
    username,
    texto: textoNormalizado,
    createdAt: now,
  });

  const created = await mensajeRef.get();
  const data = created.data();
  return {
    id: mensajeRef.id,
    salaId,
    uid,
    username,
    texto: textoNormalizado,
    createdAt: timestampToIso(data?.createdAt as Timestamp | undefined),
  };
}

// Listar mensajes recientes de una sala
export async function listarMensajes(
  salaId: string,
  uid: string,
  limit?: number
): Promise<MensajePublico[]> {
  const { ref, row } = await obtenerDocumentoSala(salaId);
  if (!tieneAccesoSala(row, uid)) {
    throw new AppError("No tenés acceso a esta sala.", 403);
  }

  const limite = Math.min(MENSAJES_MAX_LIMIT, Math.max(1, Number(limit) || MENSAJES_DEFAULT_LIMIT));
  const snap = await ref
    .collection(collections.mensajes)
    .orderBy("createdAt", "desc")
    .limit(limite)
    .get();

  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        salaId,
        uid: String(data.uid ?? ""),
        username: String(data.username ?? ""),
        texto: String(data.texto ?? ""),
        createdAt: timestampToIso(data.createdAt as Timestamp | undefined),
      };
    })
    .reverse();
}

// Verificar acceso a sala (WebSocket)
export async function verificarAccesoSala(salaId: string, uid: string): Promise<SalaPublica> {
  return obtenerSala(salaId, uid);
}
