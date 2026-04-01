import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { adminSessions } from "../lib/sessions.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      adminId?: string;
    }
  }
}

// Validates JWT from Authorization: Bearer <token> header
// Attaches req.user on success
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
}

// Restricts to specific roles (call after requireAuth)
export function requireRole(...roles: Array<"employee" | "manager">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

// Validates admin session from X-Admin-Session header
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers["x-admin-session"] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Admin session required" });
    return;
  }

  const session = adminSessions.get(sessionId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired admin session" });
    return;
  }

  // 24h TTL check
  const age = Date.now() - session.createdAt;
  if (age > 24 * 60 * 60 * 1000) {
    adminSessions.delete(sessionId);
    res.status(401).json({ error: "Admin session expired" });
    return;
  }

  req.adminId = session.adminId;
  next();
}
