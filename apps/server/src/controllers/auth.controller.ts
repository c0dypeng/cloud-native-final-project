import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { users, adminAccounts } from "@workspace/database";
import {
  loginInputSchema,
  adminLoginInputSchema,
} from "@workspace/api-contracts";
import { signToken } from "../lib/jwt.js";
import {
  createAdminSession,
  deleteAdminSession,
  getValidAdminSession,
} from "../lib/sessions.js";

const COOKIE_NAME = "token";
const ADMIN_COOKIE_NAME = "admin-session";
const IS_PROD = process.env.NODE_ENV === "production";

// Dummy bcrypt hash used to keep the work-factor cost paid even when the
// requested account doesn't exist — defends against username enumeration via
// response-time side channel. The plaintext is never the right answer for any
// real account.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8Q9o3oS3JX5g7M/0xRzG7t.bg3jJl6";

// POST /api/auth/login
export async function login(req: Request, res: Response) {
  const parsed = loginInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Always run bcrypt to avoid leaking account existence via response time.
  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );
  if (!user || !user.isActive || !valid) {
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
      locale: user.locale,
    },
  });
}

// POST /api/auth/logout
export function logout(_req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

// GET /api/auth/me — returns the full UserPublic shape (matches userPublicSchema).
// The JWT payload alone is missing `name` and `locale`, so we query the DB.
export async function me(req: Request, res: Response) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      departmentId: users.departmentId,
      managerId: users.managerId,
      locale: users.locale,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
      managerId: user.managerId,
      locale: user.locale,
    },
  });
}

// POST /api/admin/auth/login
export async function adminLogin(req: Request, res: Response) {
  const parsed = adminLoginInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { username, password } = parsed.data;

  const [admin] = await db
    .select()
    .from(adminAccounts)
    .where(eq(adminAccounts.username, username))
    .limit(1);

  // Constant-time-ish defense against username enumeration.
  const valid = await bcrypt.compare(
    password,
    admin?.passwordHash ?? DUMMY_HASH,
  );
  if (!admin || !valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // Update last_login
  await db
    .update(adminAccounts)
    .set({ lastLogin: new Date() })
    .where(eq(adminAccounts.id, admin.id));

  const sessionId = await createAdminSession(admin.id, admin.username);

  res.cookie(ADMIN_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24h
  });

  res.json({ sessionId, username: admin.username });
}

// POST /api/admin/auth/logout
export async function adminLogout(req: Request, res: Response) {
  const headerSession = req.headers["x-admin-session"] as string | undefined;
  const cookieSession = req.cookies?.[ADMIN_COOKIE_NAME] as string | undefined;
  const sessionId = headerSession ?? cookieSession;
  if (sessionId) await deleteAdminSession(sessionId);
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ ok: true });
}

// GET /api/admin/auth/me — validates session id from X-Admin-Session header
export async function adminMe(req: Request, res: Response) {
  const sessionId = req.headers["x-admin-session"] as string | undefined;
  if (!sessionId) {
    res.status(401).json({ error: "Admin session required" });
    return;
  }
  const session = await getValidAdminSession(sessionId);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired admin session" });
    return;
  }
  res.json({ admin: { adminId: session.adminId, username: session.username } });
}
