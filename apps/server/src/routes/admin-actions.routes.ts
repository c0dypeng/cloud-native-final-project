import { Router, type Router as ExpressRouter } from "express";
import { requireAdmin } from "../middleware/auth.middleware.js";
import { adminTriggerReminder } from "../controllers/admin-actions.controller.js";

const router: ExpressRouter = Router();

router.post("/events/:id/remind", requireAdmin, adminTriggerReminder);

export { router as adminActionsRouter };
