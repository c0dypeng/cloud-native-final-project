import { Router, type Router as ExpressRouter } from "express";
import {
  requireAdmin,
  requireAuthOrAdmin,
} from "../middleware/auth.middleware.js";
import {
  listDepartments,
  getDepartmentTree,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departments.controller.js";

const router: ExpressRouter = Router();

router.get("/", requireAuthOrAdmin, listDepartments);
router.get("/tree", requireAuthOrAdmin, getDepartmentTree);
router.post("/", requireAdmin, createDepartment);
router.patch("/:id", requireAdmin, updateDepartment);
router.delete("/:id", requireAdmin, deleteDepartment);

export { router as departmentsRouter };
