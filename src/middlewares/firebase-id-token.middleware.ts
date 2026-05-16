import type { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAuth } from "../../lib/firebase.js";
import { sendErrorResponse } from "../utils/JSONResponse.js";

export type FirebaseAuthRequest = Request & {
  firebaseUser: DecodedIdToken;
};

/**
 * Espera `Authorization: Bearer <Firebase ID token>` (token emitido al cliente tras login/registro).
 */
export const requireFirebaseIdToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return sendErrorResponse(
      res,
      401,
      "Token de Firebase no proporcionado. Enviá el ID token en la cabecera Authorization: Bearer <token>."
    );
  }
  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as FirebaseAuthRequest).firebaseUser = decoded;
    next();
  } catch {
    return sendErrorResponse(res, 401, "Token de Firebase inválido o expirado.");
  }
};
