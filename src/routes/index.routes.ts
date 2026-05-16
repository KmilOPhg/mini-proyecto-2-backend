import { Router } from "express";
import authRouter from "./auth.routes.js";

const router = Router();

router.use("/auth", authRouter);
// router.use("/entidades", entidadRouter);

export default router;
