import type { Response } from "express";
import { body, query } from "express-validator";
import asyncWrapper from "../utils/AsyncWrapper.js";
import {
  authenticateToken,
  validateRequest,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { sendSuccessResponse } from "../utils/JSONResponse.js";
import type { FirebaseAuthRequest } from "../middlewares/firebase-id-token.middleware.js";
import { requireFirebaseIdToken } from "../middlewares/firebase-id-token.middleware.js";
import * as studentAuth from "../services/studentAuth.service.js";
import {
  logAuthSesionCierre,
  logAuthSesionInicio,
  nombreVisibleEstudiante,
} from "../utils/authLogger.js";

const registerValidators = [
  body("nombres").trim().notEmpty().withMessage("Los nombres son obligatorios.").isLength({ max: 120 }),
  body("apellidos").trim().notEmpty().withMessage("Los apellidos son obligatorios.").isLength({ max: 120 }),
  body("username").trim().notEmpty().withMessage("El nombre de usuario es obligatorio."),
  body("email").trim().isEmail().withMessage("Correo no válido.").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres.")
    .matches(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/)
    .withMessage("La contraseña debe incluir al menos una letra y un número."),
  body("avatar")
    .optional({ values: "null", checkFalsy: true })
    .isString()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("El avatar debe ser una URL http(s) válida."),
];

export const registerStudentHandler = [
  ...registerValidators,
  validateRequest,
  asyncWrapper(async (req, res: Response) => {
    const avatar =
      req.body.avatar === undefined || req.body.avatar === null || String(req.body.avatar).trim() === ""
        ? null
        : String(req.body.avatar).trim();

    const result = await studentAuth.registerStudentManual({
      nombres: String(req.body.nombres),
      apellidos: String(req.body.apellidos),
      username: String(req.body.username),
      avatar,
      email: String(req.body.email),
      password: String(req.body.password),
    });

    sendSuccessResponse(res, 201, "Cuenta creada en Firebase y perfil guardado en Firestore.", result);
  }),
];

const usernameQueryValidators = [
  query("username").trim().notEmpty().withMessage("Indicá el parámetro username en la query."),
];

export const usernameAvailableHandler = [
  ...usernameQueryValidators,
  validateRequest,
  asyncWrapper(async (req, res: Response) => {
    const raw = String(req.query.username);
    const { available, normalizedUsername } = await studentAuth.checkUsernameAvailability(raw);
    sendSuccessResponse(res, 200, "Consulta de disponibilidad.", { available, username: normalizedUsername });
  }),
];

export const sessionHandler = [
  requireFirebaseIdToken,
  asyncWrapper(async (req, res: Response) => {
    const decoded = (req as FirebaseAuthRequest).firebaseUser;
    const result = await studentAuth.resolveSessionForDecoded(decoded);
    if (!result.needsUsername) {
      logAuthSesionInicio(
        result.user.id,
        nombreVisibleEstudiante(result.user),
        result.user.email
      );
    }
    sendSuccessResponse(res, 200, "Sesión verificada.", result);
  }),
];

const completeGoogleValidators = [
  requireFirebaseIdToken,
  body("username").trim().notEmpty().withMessage("El nombre de usuario es obligatorio."),
  validateRequest,
];

export const completeGoogleUsernameHandler = [
  ...completeGoogleValidators,
  asyncWrapper(async (req, res: Response) => {
    const decoded = (req as FirebaseAuthRequest).firebaseUser;
    const result = await studentAuth.completeGoogleUsernameForDecoded(decoded, String(req.body.username));
    logAuthSesionInicio(
      result.user.id,
      nombreVisibleEstudiante(result.user),
      result.user.email
    );
    sendSuccessResponse(res, 200, "Perfil completado. Podés continuar al dashboard.", result);
  }),
];

export const logoutHandler = [
  authenticateToken,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    logAuthSesionCierre(
      user.id,
      user.nombre.trim() || user.email || user.id,
      user.email
    );
    sendSuccessResponse(res, 200, "Sesión cerrada.", null);
  }),
];
