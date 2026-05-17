import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt.js";
import { getValidAdminSession, type AdminSession } from "../lib/sessions.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      adminId?: string;
      adminUsername?: string;
    }
  }
}

const USER_COOKIE = "token";
const ADMIN_COOKIE = "admin-session";

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
  const cookieToken = req.cookies?.[USER_COOKIE] as string | undefined;
  return cookieToken ?? null;
}

function extractAdminSession(req: Request): string | null {
  const headerSession = req.headers["x-admin-session"] as string | undefined;
  const cookieSession = req.cookies?.[ADMIN_COOKIE] as string | undefined;
  return headerSession ?? cookieSession ?? null;
}

async function resolveAdminSession(req: Request): Promise<AdminSession | null> {
  const sessionId = extractAdminSession(req);
  if (!sessionId) return null;
  return getValidAdminSession(sessionId);
}

/**
 * Require a valid user JWT. Accepts either `Authorization: Bearer <token>`
 * or the `token` cookie. Populates `req.user`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}

export function requireRole(...roles: Array<"employee" | "manager">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

/**
 * Require a valid admin session. Accepts either the `X-Admin-Session` header
 * (used by admin app SSR) or the `admin-session` cookie (used by browser
 * EventSource connections). Populates `req.adminId` / `req.adminUsername`.
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await resolveAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Admin session required" });
    return;
  }
  req.adminId = session.adminId;
  req.adminUsername = session.username;
  next();
}

/**
 * Accept either a user JWT or an admin session. Used by endpoints visible
 * to both (events list, stats, SSE).
 */
export async function requireAuthOrAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await resolveAdminSession(req);
  if (session) {
    req.adminId = session.adminId;
    req.adminUsername = session.username;
    next();
    return;
  }
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = payload;
  next();
}
