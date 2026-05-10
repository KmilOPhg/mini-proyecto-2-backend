import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { sendErrorResponse } from "../utils/JSONResponse.js";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";

export type JwtUserPayload = {
  id: number;
  nombre: string;
  email: string | null;
  rolId: number;
  estado: "ACTIVO" | "INACTIVO";
  clienteId: number | null;
};

export type AuthenticatedRequest = Request & {
  user?: JwtUserPayload;
};

/** Subconjunto del delegate Prisma suficiente para validateUniqueFields */
type PrismaModelWithFindFirst = {
  findFirst(args: { where: Record<string, unknown> }): Promise<unknown | null>;
};

// Verificar errores de express-validator
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendErrorResponse(res, 400, "Error de validación", errors.array());
  }
  next();
};

// Validar unicidad de campos en BD antes de crear/actualizar
export const validateUniqueFields = (
  model: PrismaModelWithFindFirst,
  fields: string[],
  options?: { excludeIdParam?: string }
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let excludeId: number | undefined;
      if (options?.excludeIdParam) {
        const raw = req.params[options.excludeIdParam];
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) excludeId = parsed;
      }
      for (const field of fields) {
        if (req.body[field]) {
          const existing = await model.findFirst({
            where: {
              [field]: req.body[field],
              ...(excludeId !== undefined ? { id: { not: excludeId } } : {}),
            },
          });
          if (existing) {
            return sendErrorResponse(res, 400, `El ${field} ya está registrado`);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as Partial<JwtUserPayload> & { id: number };
    req.user = {
      id: decoded.id,
      nombre: decoded.nombre ?? "",
      email: decoded.email ?? null,
      rolId: typeof decoded.rolId === "number" ? decoded.rolId : 0,
      estado: (decoded.estado as JwtUserPayload["estado"]) ?? "ACTIVO",
      clienteId: decoded.clienteId ?? null,
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
      const rol = await prisma.rol.findFirst({ where: { id: req.user?.rolId } });
      if (!rol) return sendErrorResponse(res, 403, "Rol no encontrado");
      if (!rol.activo) return sendErrorResponse(res, 403, "Rol inactivo");

      const rolPermiso = await prisma.rolPermiso.findMany({
        where: { rolId: rol.id },
        include: { permiso: true },
      });
      const permisoUsuario = rolPermiso.map((rp) => rp.permiso.codigo);
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
