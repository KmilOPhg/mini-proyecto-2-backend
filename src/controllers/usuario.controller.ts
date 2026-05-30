import type { Response } from "express";
import { body, param, query } from "express-validator";
import asyncWrapper from "../utils/AsyncWrapper.js";
import {
  authenticateToken,
  checkPermissions,
  validateRequest,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { sendSuccessResponse } from "../utils/JSONResponse.js";
import * as usuarioService from "../services/usuario.service.js";
import type { EstadoUsuario } from "../types/usuario.types.js";
import { requireEstudianteUid } from "../middlewares/estudiante.middleware.js";
import { signStudentSessionJwt } from "../utils/studentJwt.js";
import { logAuthSesionInicio } from "../utils/authLogger.js";

const passwordRules = body("password")
  .isLength({ min: 8 })
  .withMessage("La contraseña debe tener al menos 8 caracteres.")
  .matches(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/)
  .withMessage("La contraseña debe incluir al menos una letra y un número.");

// Iniciar sesión administrativa
export const loginAdminController = [
  body("email").trim().isEmail().withMessage("Correo no válido.").normalizeEmail(),
  body("password").notEmpty().withMessage("La contraseña es obligatoria."),
  validateRequest,
  asyncWrapper(async (req, res: Response) => {
    const result = await usuarioService.loginAdmin({
      email: String(req.body.email),
      password: String(req.body.password),
    });
    logAuthSesionInicio(
      result.user.id,
      result.user.nombre ?? result.user.email,
      result.user.email
    );
    sendSuccessResponse(res, 200, "Sesión iniciada correctamente.", result);
  }),
];

// Listar usuarios
export const listarUsuariosController = [
  authenticateToken,
  checkPermissions(["usuarios.consultar"]),
  query("page").optional().isInt({ min: 1 }).withMessage("page debe ser un entero ≥ 1."),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe estar entre 1 y 100."),
  query("rolId").optional().isString().trim(),
  query("estado").optional().isIn(["ACTIVO", "INACTIVO"]).withMessage("estado debe ser ACTIVO o INACTIVO."),
  query("email").optional().isString().trim(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const data = await usuarioService.listarUsuarios({
      page: req.query.page !== undefined ? String(req.query.page) : undefined,
      limit: req.query.limit !== undefined ? String(req.query.limit) : undefined,
      rolId: req.query.rolId ? String(req.query.rolId) : undefined,
      estado: req.query.estado ? (req.query.estado as EstadoUsuario) : undefined,
      email: req.query.email ? String(req.query.email) : undefined,
    });
    sendSuccessResponse(res, 200, "Usuarios obtenidos correctamente.", data);
  }),
];

// Obtener usuario por id
export const obtenerUsuarioController = [
  authenticateToken,
  checkPermissions(["usuarios.consultar"]),
  param("id", "El id es obligatorio.").trim().notEmpty(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const id = decodeURIComponent(String(req.params.id));
    const data = await usuarioService.obtenerUsuarioPorId(id);
    sendSuccessResponse(res, 200, "Usuario obtenido correctamente.", data);
  }),
];

// Crear usuario administrativo
export const crearUsuarioController = [
  authenticateToken,
  checkPermissions(["usuarios.crear"]),
  body("nombre").trim().notEmpty().withMessage("El nombre es obligatorio.").isLength({ max: 200 }),
  body("documento").trim().notEmpty().withMessage("El documento es obligatorio.").isLength({ max: 30 }),
  body("email").trim().isEmail().withMessage("Correo no válido.").normalizeEmail(),
  passwordRules,
  body("rolId").trim().notEmpty().withMessage("El rolId es obligatorio."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const data = await usuarioService.crearUsuarioAdmin({
      nombre: String(req.body.nombre),
      documento: String(req.body.documento),
      email: String(req.body.email),
      password: String(req.body.password),
      rolId: String(req.body.rolId),
    });
    sendSuccessResponse(res, 201, "Usuario creado correctamente.", data);
  }),
];

// Actualizar usuario
export const actualizarUsuarioController = [
  authenticateToken,
  checkPermissions(["usuarios.actualizar"]),
  param("id", "El id es obligatorio.").trim().notEmpty(),
  body("nombre").optional().trim().notEmpty().isLength({ max: 200 }),
  body("documento").optional().trim().notEmpty().isLength({ max: 30 }),
  body("email").optional().trim().isEmail().normalizeEmail(),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres.")
    .matches(/^(?=.*[A-Za-zÁÉÍÓÚáéíóúÑñ])(?=.*\d).+$/)
    .withMessage("La contraseña debe incluir al menos una letra y un número."),
  body("rolId").optional().trim().notEmpty(),
  body("estado").optional().isIn(["ACTIVO", "INACTIVO"]),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const id = decodeURIComponent(String(req.params.id));
    const data = await usuarioService.actualizarUsuario(id, {
      nombre: req.body.nombre !== undefined ? String(req.body.nombre) : undefined,
      documento: req.body.documento !== undefined ? String(req.body.documento) : undefined,
      email: req.body.email !== undefined ? String(req.body.email) : undefined,
      password:
        req.body.password !== undefined && String(req.body.password).length > 0
          ? String(req.body.password)
          : undefined,
      rolId: req.body.rolId !== undefined ? String(req.body.rolId) : undefined,
      estado: req.body.estado !== undefined ? (req.body.estado as EstadoUsuario) : undefined,
    });
    sendSuccessResponse(res, 200, "Usuario actualizado correctamente.", data);
  }),
];

// Obtener perfil del estudiante autenticado (US-04)
export const obtenerMiPerfilController = [
  authenticateToken,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const data = await usuarioService.obtenerMiPerfilEstudiante(uid);
    sendSuccessResponse(res, 200, "Perfil obtenido correctamente.", data);
  }),
];

// Actualizar perfil del estudiante autenticado (US-04)
export const actualizarMiPerfilController = [
  authenticateToken,
  body("nombres").optional().trim().notEmpty().isLength({ max: 120 }),
  body("apellidos").optional().trim().notEmpty().isLength({ max: 120 }),
  body("username").optional().trim().notEmpty(),
  body("email").optional().trim().isEmail().normalizeEmail(),
  body("avatar")
    .optional({ values: "null", checkFalsy: true })
    .isString()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("El avatar debe ser una URL http(s) válida."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const avatar =
      req.body.avatar === undefined
        ? undefined
        : req.body.avatar === null || String(req.body.avatar).trim() === ""
          ? null
          : String(req.body.avatar).trim();

    const data = await usuarioService.actualizarPerfilEstudiante(uid, {
      nombres: req.body.nombres !== undefined ? String(req.body.nombres) : undefined,
      apellidos: req.body.apellidos !== undefined ? String(req.body.apellidos) : undefined,
      username: req.body.username !== undefined ? String(req.body.username) : undefined,
      email: req.body.email !== undefined ? String(req.body.email) : undefined,
      avatar,
    });
    const token = signStudentSessionJwt({
      uid,
      nombres: data.nombres ?? "",
      apellidos: data.apellidos ?? "",
      username: data.username,
      email: data.email,
      rolId: data.rolId,
      estado: data.estado,
    });
    sendSuccessResponse(res, 200, "Perfil actualizado correctamente.", { user: data, token });
  }),
];

// Eliminar cuenta del estudiante autenticado (US-05)
export const eliminarMiCuentaController = [
  authenticateToken,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    await usuarioService.eliminarCuentaEstudiante(uid);
    sendSuccessResponse(res, 200, "Cuenta eliminada correctamente.", null);
  }),
];

// Deshabilitar usuario
export const deshabilitarUsuarioController = [
  authenticateToken,
  checkPermissions(["usuarios.deshabilitar"]),
  param("id", "El id es obligatorio.").trim().notEmpty(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const id = decodeURIComponent(String(req.params.id));
    const data = await usuarioService.deshabilitarUsuario(id);
    sendSuccessResponse(res, 200, "Usuario deshabilitado correctamente.", data);
  }),
];
