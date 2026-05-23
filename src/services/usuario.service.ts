import bcrypt from "bcrypt";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { getAuth, getDb } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";
import type {
  EstadoUsuario,
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
import { signStudentSessionJwt } from "../utils/studentJwt.js";

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
