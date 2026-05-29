import type { AuthenticatedRequest } from "./auth.middleware.js";
import { AppError } from "../utils/AppError.js";

export const ROL_ESTUDIANTE_ID = "estudiante";

// Obtener UID del estudiante autenticado o rechazar la petición
export function requireEstudianteUid(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new AppError("Token no proporcionado.", 401);
  }
  if (req.user.rolId !== ROL_ESTUDIANTE_ID) {
    throw new AppError("Solo los estudiantes pueden acceder a este recurso.", 403);
  }
  if (req.user.estado !== "ACTIVO") {
    throw new AppError("Tu cuenta está inactiva. Contactá a soporte.", 403);
  }
  return req.user.id;
}
