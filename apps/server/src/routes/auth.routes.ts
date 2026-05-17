import { Router, type Router as ExpressRouter } from "express";
import { login, logout, me } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginLimiter } from "../middleware/rate-limit.js";

const router: ExpressRouter = Router();

router.post("/login", loginLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export { router as authRouter };
