import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { sendErrorResponse } from "./JSONResponse.js";
import { Response } from "express";

export const errorPrisma = (res: Response, error: PrismaClientKnownRequestError) => {
  switch (error.code) {
    case "P2003": {
      // Error de clave foránea — intentar traducir el campo técnico a nombre amigable
      const meta = error.meta as Record<string, unknown> | undefined;
      const field = typeof meta?.field_name === "string" ? meta.field_name : "";
      const modelName = typeof meta?.modelName === "string" ? meta.modelName : "";
      const contextoError = `${field} ${modelName} ${error.message}`.toLowerCase();
      const diccionario: Record<string, string> = {
        clienteId: "El Cliente",
        rolId: "El Rol",
        usuarioId: "El Usuario",
      };
      const campoEncontrado = Object.keys(diccionario).find((k) =>
        contextoError.includes(k.toLowerCase())
      );
      const entidad = campoEncontrado ? diccionario[campoEncontrado] : "El registro relacionado";
      return sendErrorResponse(res, 400, `${entidad} especificado no existe`);
    }
    case "P2002": {
      // Error de duplicado
      const campo = error.meta?.target;
      const diccionario: Record<string, string> = {
        email: "Correo Electrónico",
        documento: "Documento de Identidad",
      };
      if (Array.isArray(campo) && campo.length >= 1) {
        const traducido = diccionario[campo[0]] || campo[0];
        return sendErrorResponse(res, 409, `El ${traducido} ya está registrado`);
      }
      return sendErrorResponse(res, 409, "Ya existe un registro con esos datos");
    }
    case "P2025":
      return sendErrorResponse(res, 404, "El registro especificado no existe");
    default:
      return sendErrorResponse(res, 500, error.message || "Error desconocido");
  }
};
