import { Router, type Router as ExpressRouter } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";
import { adminAuthRouter } from "./admin-auth.routes.js";

const router: ExpressRouter = Router();

// Health check
router.get("/health", healthCheck);

// Auth
router.use("/auth", authRouter);
router.use("/admin/auth", adminAuthRouter);

// Feature routes — added by Person 1
// router.use("/events", eventsRouter);
// router.use("/users", usersRouter);
// router.use("/departments", departmentsRouter);
// router.use("/manager", managerRouter);

export { router };
