import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { users, adminAccounts } from "@workspace/database";
import { signToken } from "../lib/jwt.js";
import { createAdminSession, adminSessions } from "../lib/sessions.js";

const COOKIE_NAME = "token";
const ADMIN_COOKIE_NAME = "admin-session";
const IS_PROD = process.env.NODE_ENV === "production";

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ?? null,
    managerId: user.managerId ?? null,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8h
  });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      managerId: user.managerId,
    },
  });
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

// GET /api/auth/me
export function me(req: Request, res: Response) {
  res.json({ user: req.user });
}

// POST /api/admin/auth/login
export async function adminLogin(req: Request, res: Response) {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password are required" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminAccounts)
    .where(eq(adminAccounts.username, username))
    .limit(1);

  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Update last_login
  await db
    .update(adminAccounts)
    .set({ lastLogin: new Date() })
    .where(eq(adminAccounts.id, admin.id));

  const sessionId = createAdminSession(admin.id, admin.username);

  res.cookie(ADMIN_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24h
  });

  res.json({ sessionId, username: admin.username });
}

// POST /api/admin/auth/logout
export function adminLogout(req: Request, res: Response) {
  const sessionId = req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined;
  if (sessionId) adminSessions.delete(sessionId);
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ ok: true });
}
