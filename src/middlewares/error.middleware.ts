import { NextFunction, Request, Response } from "express";
import { sendErrorResponse } from "../utils/JSONResponse.js";
import { AppError } from "../utils/AppError.js";
import { isFirestoreLikeError, sendFirestoreError } from "../utils/FirestoreErrors.js";
import { MulterError } from "multer";

export const errorMiddleware = (err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return sendErrorResponse(res, err.statusCode as number, err.message, err.errores);
  }
  if (isFirestoreLikeError(err)) {
    return sendFirestoreError(res, err);
  }
  if (err instanceof MulterError && err.code === "LIMIT_FILE_SIZE") {
    return sendErrorResponse(res, 400, "El tamaño del archivo no puede ser mayor a 200MB.");
  }
  const message = err instanceof Error ? err.message : "Error interno del servidor";
  return sendErrorResponse(res, 500, message);
};
