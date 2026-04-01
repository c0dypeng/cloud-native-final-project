import { Router, type Router as ExpressRouter } from "express";
import {
  login,
  logout,
  me,
  adminLogin,
  adminLogout,
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router: ExpressRouter = Router();

// User auth
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export { router as authRouter };
