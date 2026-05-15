import type { Response } from "express";
import { sendErrorResponse } from "./JSONResponse.js";

/** gRPC / Firestore: 3 INVALID_ARGUMENT, 5 NOT_FOUND, 6 ALREADY_EXISTS, 9 FAILED_PRECONDITION */
const ALREADY_EXISTS = 6;
const NOT_FOUND = 5;

function errorCode(err: unknown): string | number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  return (err as { code?: string | number }).code;
}

export function sendFirestoreError(res: Response, err: unknown) {
  const code = errorCode(err);
  const message = err instanceof Error ? err.message : String(err);

  if (code === ALREADY_EXISTS || code === "already-exists") {
    return sendErrorResponse(res, 409, "Ya existe un recurso con esos datos");
  }
  if (code === NOT_FOUND || code === "not-found") {
    return sendErrorResponse(res, 404, "El recurso no existe");
  }
  return sendErrorResponse(res, 500, message || "Error en Firestore");
}

export function isFirestoreLikeError(err: unknown): boolean {
  const code = errorCode(err);
  if (typeof code === "number") return [3, 5, 6, 9].includes(code);
  if (typeof code === "string") return code.includes("firestore/") || code.includes("already-exists");
  return false;
}
