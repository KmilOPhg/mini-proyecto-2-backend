import { AppError } from "./AppError.js";

const USERNAME_RE = /^[a-z0-9_]{3,30}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Valida y devuelve el username normalizado (minúsculas). */
export function parseAndValidateUsername(raw: string): string {
  const normalized = normalizeUsername(raw);
  if (!USERNAME_RE.test(normalized)) {
    throw new AppError(
      "El nombre de usuario debe tener entre 3 y 30 caracteres y solo puede incluir letras minúsculas, números y guion bajo.",
      400
    );
  }
  return normalized;
}
