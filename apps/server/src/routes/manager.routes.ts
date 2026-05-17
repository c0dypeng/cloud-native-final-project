import { Router, type Router as ExpressRouter } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getTeam,
  getTeamStatus,
} from "../controllers/manager.controller.js";

const router: ExpressRouter = Router();

router.get("/team", requireAuth, getTeam);
router.get("/team/:eventId/status", requireAuth, getTeamStatus);

export { router as managerRouter };
