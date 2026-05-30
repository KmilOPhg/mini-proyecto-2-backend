import colors from "colors";

function logAuth(
  accion: "inició sesión" | "cerró sesión",
  uid: string,
  nombre: string,
  email: string | null
): void {
  const etiqueta = accion === "inició sesión" ? colors.green : colors.yellow;
  const correo = email?.trim() || "—";
  console.log(etiqueta(`[Auth] ${nombre} (${uid}) ${accion} — ${correo}`));
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
