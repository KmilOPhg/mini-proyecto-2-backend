import colors from "colors";

const AUTH_LOG_DEDUPE_MS = 4000;
const recentAuthLogs = new Map<string, number>();

function shouldLogAuth(uid: string, accion: "inició sesión" | "cerró sesión"): boolean {
  const key = `${accion}:${uid}`;
  const now = Date.now();
  const last = recentAuthLogs.get(key);
  if (last !== undefined && now - last < AUTH_LOG_DEDUPE_MS) return false;
  recentAuthLogs.set(key, now);
  return true;
}

function logAuth(
  accion: "inició sesión" | "cerró sesión",
  uid: string,
  nombre: string,
  email: string | null
): void {
  if (!shouldLogAuth(uid, accion)) return;
  const etiqueta = accion === "inició sesión" ? colors.green : colors.yellow;
  const correo = email?.trim() || "—";
  const visible = nombre.trim() || correo;
  console.log(etiqueta(`[Auth] ${visible} (${uid}) ${accion} — ${correo}`));
}

export function logAuthSesionInicio(
  uid: string,
  nombre: string,
  email: string | null
): void {
  logAuth("inició sesión", uid, nombre, email);
}

export function logAuthSesionCierre(
  uid: string,
  nombre: string,
  email: string | null
): void {
  logAuth("cerró sesión", uid, nombre, email);
}

export function nombreVisibleEstudiante(input: {
  username?: string | null;
  nombres?: string | null;
  apellidos?: string | null;
  email?: string | null;
  id: string;
}): string {
  if (input.username?.trim()) return input.username.trim();
  const full = `${input.nombres ?? ""} ${input.apellidos ?? ""}`.trim();
  return full || input.email?.trim() || input.id;
}

export function logSalaUsuario(
  accion: "unió" | "salió",
  codigoSala: string,
  uid: string,
  nombre: string
): void {
  const etiqueta = accion === "unió" ? colors.green : colors.yellow;
  const visible = nombre.trim() || uid;
  const verbo = accion === "unió" ? "se unió a" : "salió de";
  console.log(etiqueta(`[Sala] ${visible} (${uid}) ${verbo} la sala ${codigoSala}`));
}
