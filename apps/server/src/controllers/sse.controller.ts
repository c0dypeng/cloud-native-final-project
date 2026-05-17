import type { Request, Response } from "express";
import { register } from "../lib/sse.js";

// GET /api/sse
// Requires either a user JWT (cookie/Bearer) or admin session (cookie/header).
// requireAuthOrAdmin middleware should have already populated req.user / req.adminId.
export function sseHandler(req: Request, res: Response) {
  if (req.adminId) {
    register(res, { adminId: req.adminId, role: "admin" });
    return;
  }
  if (req.user) {
    register(res, {
      userId: req.user.id,
      role: req.user.role,
    });
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}
