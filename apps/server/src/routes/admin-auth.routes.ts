import { Router, type Router as ExpressRouter } from "express";
import {
  adminLogin,
  adminLogout,
  adminMe,
} from "../controllers/auth.controller.js";
import { adminLoginLimiter } from "../middleware/rate-limit.js";

const router: ExpressRouter = Router();

router.post("/login", adminLoginLimiter, adminLogin);
router.post("/logout", adminLogout);
router.get("/me", adminMe);

export { router as adminAuthRouter };
