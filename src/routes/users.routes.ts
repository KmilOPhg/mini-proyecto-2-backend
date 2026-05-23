import { Router } from "express";
import {
  actualizarUsuarioController,
  crearUsuarioController,
  deshabilitarUsuarioController,
  listarUsuariosController,
  obtenerUsuarioController,
} from "../controllers/usuario.controller.js";

const router = Router();

// GET /api/auth/users
router.get("/", listarUsuariosController);

// GET /api/auth/users/:id
router.get("/:id", obtenerUsuarioController);

// POST /api/auth/users
router.post("/", crearUsuarioController);

// PUT /api/auth/users/:id
router.put("/:id", actualizarUsuarioController);

// PATCH /api/auth/users/:id/deshabilitar
router.patch("/:id/deshabilitar", deshabilitarUsuarioController);

export default router;
