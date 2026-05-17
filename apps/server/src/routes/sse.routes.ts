import { Router, type Router as ExpressRouter } from "express";
import { requireAuthOrAdmin } from "../middleware/auth.middleware.js";
import { sseHandler } from "../controllers/sse.controller.js";

const router: ExpressRouter = Router();

router.get("/", requireAuthOrAdmin, sseHandler);

export { router as sseRouter };
