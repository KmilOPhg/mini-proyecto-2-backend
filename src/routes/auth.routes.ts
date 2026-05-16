import { Router } from "express";
import {
  completeGoogleUsernameHandler,
  registerStudentHandler,
  sessionHandler,
  usernameAvailableHandler,
} from "../controllers/studentAuth.controller.js";

const router = Router();

router.post("/register", registerStudentHandler);
router.get("/username-available", usernameAvailableHandler);
router.post("/session", sessionHandler);
router.post("/google/complete-username", completeGoogleUsernameHandler);

export default router;
