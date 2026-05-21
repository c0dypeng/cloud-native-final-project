import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { departmentTranslations, users, departments } from "@workspace/database";
import {
  userCreateInputSchema,
  userUpdateInputSchema,
  userResetPasswordInputSchema,
  userListQuerySchema,
} from "@workspace/api-contracts";
import { isUuid } from "../middleware/validate.js";
import { getRequestLocale } from "../lib/locale.js";

function serializeUser(row: {
  id: string;
  email: string;
  name: string;
  role: "employee" | "manager";
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  managerName: string | null;
  phone: string | null;
  locale: string;
  isActive: boolean;
  createdAt: Date;
}) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    departmentId: row.departmentId,
    departmentName: row.departmentName,
    managerId: row.managerId,
    managerName: row.managerName,
    phone: row.phone,
    locale: row.locale,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/users
export async function listUsers(req: Request, res: Response) {
  const parsed = userListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid query", details: parsed.error.flatten() });
    return;
  }
  const { q, role, departmentId, isActive, limit, offset } = parsed.data;
  const locale = getRequestLocale(req);

  const conditions = [] as ReturnType<typeof eq>[];
  if (role) conditions.push(eq(users.role, role));
  if (departmentId) conditions.push(eq(users.departmentId, departmentId));
  if (isActive !== undefined) conditions.push(eq(users.isActive, isActive));
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(ilike(users.name, like), ilike(users.email, like)) as unknown as ReturnType<
        typeof eq
      >,
    );
  }

  const managerSelf = sql<string | null>`mgr.name`;

  const query = db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      departmentId: users.departmentId,
      departmentName: sql<string | null>`coalesce(${departmentTranslations.name}, ${departments.name})`,
      managerId: users.managerId,
      managerName: managerSelf,
      phone: users.phone,
      locale: users.locale,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .leftJoin(
      departmentTranslations,
      and(
        eq(departmentTranslations.departmentId, departments.id),
        eq(departmentTranslations.locale, locale),
      ),
    )
    .leftJoin(
      sql`users AS mgr`,
      sql`mgr.id = ${users.managerId}`,
    )
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(users.name))
    .limit(limit)
    .offset(offset);

  const rows = await query;

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  const total = totalResult[0]?.count ?? 0;

  res.json({
    users: rows.map(serializeUser),
    total,
  });
}

// POST /api/users
export async function createUser(req: Request, res: Response) {
  const parsed = userCreateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const { password, ...rest } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const [created] = await db
      .insert(users)
      .values({
        email: rest.email.toLowerCase(),
        name: rest.name,
        passwordHash,
        role: rest.role,
        departmentId: rest.departmentId ?? null,
        managerId: rest.managerId ?? null,
        phone: rest.phone ?? null,
        locale: rest.locale ?? "zh-TW",
      })
      .returning();
    if (!created) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }
    res.status(201).json({ user: { id: created.id, email: created.email } });
  } catch (err) {
    const error = err as { code?: string; constraint?: string };
    if (error.code === "23505") {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
    throw err;
  }
}

// PATCH /api/users/:id
export async function updateUser(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = userUpdateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  // Reject self-reference (would break the recursive CTE for getSubordinates).
  if (parsed.data.managerId && parsed.data.managerId === id) {
    res.status(400).json({ error: "User cannot be their own manager" });
    return;
  }

  const [updated] = await db
    .update(users)
    .set(parsed.data)
    .where(eq(users.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: { id: updated.id } });
}

// DELETE /api/users/:id  (soft delete)
export async function softDeleteUser(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [updated] = await db
    .update(users)
    .set({ isActive: false })
    .where(eq(users.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user: { id: updated.id, isActive: false } });
}

// POST /api/users/:id/password
export async function resetUserPassword(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = userResetPasswordInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ ok: true });
}

