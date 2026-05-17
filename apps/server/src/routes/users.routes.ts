import { Router, type Router as ExpressRouter } from "express";
import { requireAdmin } from "../middleware/auth.middleware.js";
import {
  listUsers,
  createUser,
  updateUser,
  softDeleteUser,
  resetUserPassword,
} from "../controllers/users.controller.js";

const router: ExpressRouter = Router();

router.get("/", requireAdmin, listUsers);
router.post("/", requireAdmin, createUser);
router.patch("/:id", requireAdmin, updateUser);
router.delete("/:id", requireAdmin, softDeleteUser);
router.post("/:id/password", requireAdmin, resetUserPassword);

export { router as usersRouter };
