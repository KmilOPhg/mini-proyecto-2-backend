import { Router } from "express";
import {
  actualizarSalaController,
  crearSalaController,
  eliminarSalaController,
  listarMensajesController,
  listarMisSalasController,
  obtenerSalaController,
  unirseSalaController,
} from "../controllers/sala.controller.js";

const router = Router();

// GET /api/salas/mias (US-06)
router.get("/mias", listarMisSalasController);

// POST /api/salas (US-06)
router.post("/", crearSalaController);

// GET /api/salas/:id/mensajes
router.get("/:id/mensajes", listarMensajesController);

// POST /api/salas/:id/unirse (TS-02)
router.post("/:id/unirse", unirseSalaController);

// GET /api/salas/:id
router.get("/:id", obtenerSalaController);

// PUT /api/salas/:id (US-07)
router.put("/:id", actualizarSalaController);

// DELETE /api/salas/:id (US-07)
router.delete("/:id", eliminarSalaController);

export default router;
