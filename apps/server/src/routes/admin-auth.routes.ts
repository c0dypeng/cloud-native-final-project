import { Router, type Router as ExpressRouter } from "express";
import { adminLogin, adminLogout } from "../controllers/auth.controller.js";

const router: ExpressRouter = Router();

router.post("/login", adminLogin);
router.post("/logout", adminLogout);

export { router as adminAuthRouter };
