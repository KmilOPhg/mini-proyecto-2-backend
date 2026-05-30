import jwt from "jsonwebtoken";
import type { JwtUserPayload } from "../middlewares/auth.middleware.js";
import { nombreVisibleEstudiante } from "./authLogger.js";
import { AppError } from "./AppError.js";

export function signStudentSessionJwt(input: {
  uid: string;
  nombres: string;
  apellidos: string;
  username?: string | null;
  email: string | null;
  rolId: string;
  estado: JwtUserPayload["estado"];
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET no está configurado en el servidor", 500);
  }

  const nombre = nombreVisibleEstudiante({
    id: input.uid,
    username: input.username,
    nombres: input.nombres,
    apellidos: input.apellidos,
    email: input.email,
  });
  const payload: JwtUserPayload = {
    id: input.uid,
    nombre,
    email: input.email,
    rolId: input.rolId,
    estado: input.estado,
    clienteId: null,
  };

  return jwt.sign(payload, secret, { expiresIn: "7d" });
}
