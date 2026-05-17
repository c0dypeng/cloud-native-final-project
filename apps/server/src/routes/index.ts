import { Router, type Router as ExpressRouter } from "express";
import { healthCheck } from "../controllers/health.controller.js";
import { authRouter } from "./auth.routes.js";
import { adminAuthRouter } from "./admin-auth.routes.js";
import { eventsRouter } from "./events.routes.js";
import { managerRouter } from "./manager.routes.js";
import { usersRouter } from "./users.routes.js";
import { departmentsRouter } from "./departments.routes.js";
import { sseRouter } from "./sse.routes.js";

const router: ExpressRouter = Router();

router.get("/health", healthCheck);

router.use("/auth", authRouter);
router.use("/admin/auth", adminAuthRouter);
router.use("/events", eventsRouter);
router.use("/manager", managerRouter);
router.use("/users", usersRouter);
router.use("/departments", departmentsRouter);
router.use("/sse", sseRouter);

export { router };
