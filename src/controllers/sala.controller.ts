import type { Response } from "express";
import { body, param, query } from "express-validator";
import asyncWrapper from "../utils/AsyncWrapper.js";
import { authenticateToken, validateRequest, type AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import { requireEstudianteUid } from "../middlewares/estudiante.middleware.js";
import { sendSuccessResponse } from "../utils/JSONResponse.js";
import * as salaService from "../services/sala.service.js";
import { notificarSalaTerminada } from "../socket/index.js";

// Listar salas creadas por el estudiante autenticado (US-06)
export const listarMisSalasController = [
  authenticateToken,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const data = await salaService.listarMisSalas(uid);
    const msg = data.vacio
      ? "Aún no creaste salas. ¡Creá tu primera sala de estudio!"
      : "Salas obtenidas correctamente.";
    sendSuccessResponse(res, 200, msg, data);
  }),
];

// Crear sala de estudio (US-06)
export const crearSalaController = [
  authenticateToken,
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio.")
    .isLength({ min: 3, max: 80 })
    .withMessage("El nombre debe tener entre 3 y 80 caracteres."),
  body("codigoInvitacion")
    .trim()
    .notEmpty()
    .withMessage("El ID de la sala es obligatorio.")
    .matches(/^CRF-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/)
    .withMessage("El ID debe tener el formato CRF-XXX-XXX."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const data = await salaService.crearSala(uid, {
      nombre: String(req.body.nombre),
      codigoInvitacion: String(req.body.codigoInvitacion),
    });
    sendSuccessResponse(res, 201, "Sala creada correctamente.", data);
  }),
];

// Obtener detalle de una sala
export const obtenerSalaController = [
  authenticateToken,
  param("id", "El id es obligatorio.").trim().notEmpty(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const salaId = decodeURIComponent(String(req.params.id));
    const data = await salaService.obtenerSala(salaId, uid);
    sendSuccessResponse(res, 200, "Sala obtenida correctamente.", data);
  }),
];

// Unirse a una sala por ID (TS-02)
export const unirseSalaController = [
  authenticateToken,
  param("id", "El id es obligatorio.").trim().notEmpty(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const salaId = decodeURIComponent(String(req.params.id));
    const data = await salaService.unirseASala(salaId, uid);
    sendSuccessResponse(res, 200, "Te uniste a la sala correctamente.", data);
  }),
];

// Unirse a una sala por código CRF-XXX-XXX (TS-02)
export const unirsePorCodigoController = [
  authenticateToken,
  body("codigo")
    .trim()
    .notEmpty()
    .withMessage("El código es obligatorio.")
    .matches(/^CRF-[A-Za-z0-9]{3}-[A-Za-z0-9]{3}$/)
    .withMessage("El código debe tener el formato CRF-XXX-XXX."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const data = await salaService.unirsePorCodigo(String(req.body.codigo), uid);
    sendSuccessResponse(res, 200, "Te uniste a la sala correctamente.", data);
  }),
];

// Actualizar nombre de sala (US-07)
export const actualizarSalaController = [
  authenticateToken,
  param("id", "El id es obligatorio.").trim().notEmpty(),
  body("nombre")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio.")
    .isLength({ min: 3, max: 80 })
    .withMessage("El nombre debe tener entre 3 y 80 caracteres."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const salaId = decodeURIComponent(String(req.params.id));
    const data = await salaService.actualizarNombreSala(salaId, uid, String(req.body.nombre));
    sendSuccessResponse(res, 200, "Sala actualizada correctamente.", data);
  }),
];

// Eliminar sala (US-07)
export const eliminarSalaController = [
  authenticateToken,
  param("id", "El id es obligatorio.").trim().notEmpty(),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const salaId = decodeURIComponent(String(req.params.id));
    await salaService.eliminarSala(salaId, uid);
    notificarSalaTerminada(salaId);
    sendSuccessResponse(res, 200, "Sala eliminada correctamente.", null);
  }),
];

// Listar mensajes de una sala
export const listarMensajesController = [
  authenticateToken,
  param("id", "El id es obligatorio.").trim().notEmpty(),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit debe estar entre 1 y 100."),
  validateRequest,
  asyncWrapper(async (req: AuthenticatedRequest, res: Response) => {
    const uid = requireEstudianteUid(req);
    const salaId = decodeURIComponent(String(req.params.id));
    const data = await salaService.listarMensajes(
      salaId,
      uid,
      req.query.limit !== undefined ? Number(req.query.limit) : undefined
    );
    sendSuccessResponse(res, 200, "Mensajes obtenidos correctamente.", data);
  }),
];
