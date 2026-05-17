import { Router, type Router as ExpressRouter } from "express";
import {
  listEvents,
  getEvent,
  createEvent,
  closeEvent,
} from "../controllers/events.controller.js";
import {
  requireAuth,
  requireAdmin,
  requireAuthOrAdmin,
} from "../middleware/auth.middleware.js";
import {
  submitReport,
  listReports,
} from "../controllers/reports.controller.js";
import { getStats, getUnreported } from "../controllers/stats.controller.js";
import { reportLimiter } from "../middleware/rate-limit.js";

const router: ExpressRouter = Router();

router.get("/", requireAuthOrAdmin, listEvents);
router.post("/", requireAdmin, createEvent);
router.get("/:id", requireAuthOrAdmin, getEvent);
router.patch("/:id/close", requireAdmin, closeEvent);

// Nested under :eventId
router.post("/:eventId/report", requireAuth, reportLimiter, submitReport);
router.get("/:eventId/reports", requireAuthOrAdmin, listReports);
router.get("/:eventId/stats", requireAuthOrAdmin, getStats);
router.get("/:eventId/unreported", requireAuthOrAdmin, getUnreported);

export { router as eventsRouter };
