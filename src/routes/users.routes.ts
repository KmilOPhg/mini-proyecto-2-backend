import { Router } from "express";
import {
  actualizarMiPerfilController,
  actualizarUsuarioController,
  crearUsuarioController,
  deshabilitarUsuarioController,
  eliminarMiCuentaController,
  listarUsuariosController,
  obtenerMiPerfilController,
  obtenerUsuarioController,
} from "../controllers/usuario.controller.js";

const router = Router();

// GET /api/auth/users/me (US-04)
router.get("/me", obtenerMiPerfilController);

// PUT /api/auth/users/me (US-04)
router.put("/me", actualizarMiPerfilController);

// DELETE /api/auth/users/me (US-05)
router.delete("/me", eliminarMiCuentaController);

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
