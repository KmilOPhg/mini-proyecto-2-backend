import { Router } from "express";
import authRouter from "./auth.routes.js";
import salasRouter from "./salas.routes.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/salas", salasRouter);
// router.use("/entidades", entidadRouter);

export default router;
