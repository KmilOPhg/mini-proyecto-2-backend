import jwt from "jsonwebtoken";
import type { JwtUserPayload } from "../middlewares/auth.middleware.js";
import { AppError } from "./AppError.js";

export function signStudentSessionJwt(input: {
  uid: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  rolId: string;
  estado: JwtUserPayload["estado"];
}): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError("JWT_SECRET no está configurado en el servidor", 500);
  }

  const nombre = `${input.nombres} ${input.apellidos}`.trim() || input.email || input.uid;
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
