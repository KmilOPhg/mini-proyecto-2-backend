import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { sendErrorResponse } from "../utils/JSONResponse.js";
import jwt from "jsonwebtoken";
import { getDb } from "../../lib/firebase.js";
import { collections } from "../../lib/firestoreCollections.js";

export type JwtUserPayload = {
  /** ID del documento en `usuarios` */
  id: string;
  nombre: string;
  email: string | null;
  /** ID del documento en `roles` (p. ej. `admin`) */
  rolId: string;
  estado: "ACTIVO" | "INACTIVO";
  clienteId: string | null;
};

export type AuthenticatedRequest = Request & {
  user?: JwtUserPayload;
};

// Verificar errores de express-validator
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, 400, "Error de validación", errors.array());
  }
  next();
};

// Validar unicidad de campos en Firestore antes de crear/actualizar
export const validateUniqueFields = (
  collectionName: string,
  fields: string[],
  options?: { excludeIdParam?: string }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let excludeId: string | undefined;
      if (options?.excludeIdParam) {
        const raw = req.params[options.excludeIdParam];
        if (typeof raw === "string" && raw.length > 0) excludeId = decodeURIComponent(raw);
      }
      const col = getDb().collection(collectionName);
      for (const field of fields) {
        if (req.body[field]) {
          const snap = await col.where(field, "==", req.body[field]).limit(1).get();
          if (!snap.empty) {
            const docId = snap.docs[0].id;
            if (excludeId === undefined || docId !== excludeId) {
              return sendErrorResponse(res, 400, `El ${field} ya está registrado`);
            }
          }
        }
      }
      next();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : error;
      return sendErrorResponse(res, 500, "Error en el servidor", detail);
    }
  };
};

// Verificar JWT y adjuntar user al request
export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return sendErrorResponse(res, 401, "Token no proporcionado");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Record<string, unknown>;
    req.user = {
      id: decoded.id != null ? String(decoded.id) : "",
      nombre: typeof decoded.nombre === "string" ? decoded.nombre : "",
      email: decoded.email == null ? null : String(decoded.email),
      rolId: decoded.rolId != null ? String(decoded.rolId) : "",
      estado: (decoded.estado as JwtUserPayload["estado"]) ?? "ACTIVO",
      clienteId:
        decoded.clienteId === null || decoded.clienteId === undefined
          ? null
          : String(decoded.clienteId),
    };
    next();
  } catch {
    return sendErrorResponse(res, 401, "Token inválido o expirado");
  }
};

// Verificar permisos por código (ej: "despachos.crear")
export const checkPermissions = (permisosRequeridos: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.rolId) return sendErrorResponse(res, 403, "Rol no encontrado");

      const rolSnap = await getDb().collection(collections.roles).doc(req.user.rolId).get();
      if (!rolSnap.exists) return sendErrorResponse(res, 403, "Rol no encontrado");
      const rol = rolSnap.data()!;
      if (!rol.activo) return sendErrorResponse(res, 403, "Rol inactivo");

      const links = await getDb()
        .collection(collections.rolPermisos)
        .where("rolId", "==", req.user.rolId)
        .get();
      const permisoUsuario = links.docs.map((d) => d.data().permisoCodigo as string);
      const tienePermisos = permisosRequeridos.every((p) => permisoUsuario.includes(p));
      if (!tienePermisos) {
        return sendErrorResponse(res, 403, "No tienes permisos para acceder a este recurso");
      }
      next();
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : error;
      return sendErrorResponse(res, 500, "Error en el servidor", detail);
    }
  };
};
