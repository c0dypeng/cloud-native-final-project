import { Router, type Router as ExpressRouter } from "express";
import {
  requireAuth,
  requireRole,
} from "../middleware/auth.middleware.js";
import {
  getTeam,
  getTeamStatus,
} from "../controllers/manager.controller.js";

const router: ExpressRouter = Router();

// Defense-in-depth: requireRole("manager") rejects employee JWTs at the
// middleware boundary so each controller doesn't need to repeat the check.
router.get("/team", requireAuth, requireRole("manager"), getTeam);
router.get(
  "/team/:eventId/status",
  requireAuth,
  requireRole("manager"),
  getTeamStatus,
);

export { router as managerRouter };
