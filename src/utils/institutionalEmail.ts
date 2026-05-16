/**
 * Lista en `INSTITUTIONAL_EMAIL_DOMAINS` separada por comas, ej: `unal.edu.co,unal.edu`.
 * Si la variable está vacía o no definida, se acepta cualquier dominio (útil en desarrollo).
 */
export function isInstitutionalEmail(email: string): boolean {
  const raw = process.env.INSTITUTIONAL_EMAIL_DOMAINS?.trim();
  if (!raw) return true;

  const domains = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;

  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 0) return false;
  const host = lower.slice(at + 1);

  return domains.some((d) => {
    const suffix = d.startsWith("@") ? d.slice(1) : d;
    return host === suffix || host.endsWith(`.${suffix}`);
  });
}
