import { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../utils/JSONResponse.js";
import { AppError } from "../utils/AppError.js";
import { errorPrisma } from "../utils/PrismaErrors.js";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { MulterError } from "multer";

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return sendErrorResponse(res, err.statusCode as number, err.message, err.errores);
  }
  if (err instanceof PrismaClientKnownRequestError) {
    return errorPrisma(res, err);
  }
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    return sendErrorResponse(res, 400, "El tamaño del archivo no puede ser mayor a 200MB.");
  }
  return sendErrorResponse(res, 500, err.message || "Error interno del servidor");
};
