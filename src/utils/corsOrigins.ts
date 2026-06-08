export function normalizarOrigen(valor?: string): string {
  return (valor || "").replace(/\/$/, "").toLowerCase();
}

/** FRONTEND_URL admite uno o varios orígenes separados por coma. */
export function obtenerOrigenesPermitidos(extra: string[] = []): string[] {
  const fromEnv = (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return [...fromEnv, ...extra].map((origen) => normalizarOrigen(origen));
}

const LAN_DEV_ORIGIN =
  /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):(517[3-6])$/;

export function origenPermitido(origin: string | undefined, extra: string[] = []): boolean {
  if (!origin) return true;
  const normalizado = normalizarOrigen(origin);
  const permitidos = new Set(obtenerOrigenesPermitidos(extra));
  if (permitidos.has(normalizado)) return true;
  if (process.env.NODE_ENV !== "production") {
    if (LAN_DEV_ORIGIN.test(normalizado)) return true;
    if (/^https:\/\/(localhost|127\.0\.0\.1):(517[3-6])$/.test(normalizado)) return true;
  }
  return false;
}
