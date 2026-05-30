import { Router } from "express";
import {
  completeGoogleUsernameHandler,
  logoutHandler,
  registerStudentHandler,
  sessionHandler,
  usernameAvailableHandler,
} from "../controllers/studentAuth.controller.js";
import { loginAdminController } from "../controllers/usuario.controller.js";
import usersRouter from "./users.routes.js";

const router = Router();

router.post("/login", loginAdminController);
router.post("/register", registerStudentHandler);
router.get("/username-available", usernameAvailableHandler);
router.post("/session", sessionHandler);
router.post("/logout", logoutHandler);
router.post("/google/complete-username", completeGoogleUsernameHandler);
router.use("/users", usersRouter);

export default router;
