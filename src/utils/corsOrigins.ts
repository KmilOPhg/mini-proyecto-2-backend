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

export function origenPermitido(origin: string | undefined, extra: string[] = []): boolean {
  if (!origin) return true;
  const permitidos = new Set(obtenerOrigenesPermitidos(extra));
  return permitidos.has(normalizarOrigen(origin));
}
