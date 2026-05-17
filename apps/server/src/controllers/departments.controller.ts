import type { Request, Response } from "express";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { departments, users } from "@workspace/database";
import {
  deptCreateInputSchema,
  deptUpdateInputSchema,
  type DeptTreeNode,
} from "@workspace/api-contracts";
import { isUuid } from "../middleware/validate.js";

function serialize(row: typeof departments.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentId,
    createdAt: row.createdAt.toISOString(),
  };
}

// GET /api/departments
export async function listDepartments(_req: Request, res: Response) {
  const rows = await db.select().from(departments).orderBy(asc(departments.name));
  res.json({ departments: rows.map(serialize) });
}

// GET /api/departments/tree
export async function getDepartmentTree(_req: Request, res: Response) {
  const rows = await db.select().from(departments).orderBy(asc(departments.name));
  const counts = await db
    .select({
      departmentId: users.departmentId,
      count: sql<number>`count(*)::int`,
    })
    .from(users)
    .where(eq(users.isActive, true))
    .groupBy(users.departmentId);
  const countMap = new Map<string, number>();
  for (const c of counts) {
    if (c.departmentId) countMap.set(c.departmentId, c.count);
  }

  const map = new Map<string, DeptTreeNode>();
  for (const r of rows) {
    map.set(r.id, {
      id: r.id,
      name: r.name,
      parentId: r.parentId,
      createdAt: r.createdAt.toISOString(),
      children: [],
      userCount: countMap.get(r.id) ?? 0,
    });
  }
  const tree: DeptTreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      tree.push(node);
    }
  }
  res.json({ tree });
}

// POST /api/departments
export async function createDepartment(req: Request, res: Response) {
  const parsed = deptCreateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  const [created] = await db
    .insert(departments)
    .values({ name: parsed.data.name, parentId: parsed.data.parentId ?? null })
    .returning();
  if (!created) {
    res.status(500).json({ error: "Failed to create department" });
    return;
  }
  res.status(201).json({ department: serialize(created) });
}

// PATCH /api/departments/:id
export async function updateDepartment(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = deptUpdateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  if (parsed.data.parentId === id) {
    res.status(400).json({ error: "Department cannot be its own parent" });
    return;
  }
  const [updated] = await db
    .update(departments)
    .set(parsed.data)
    .where(eq(departments.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Department not found" });
    return;
  }
  res.json({ department: serialize(updated) });
}

// DELETE /api/departments/:id
export async function deleteDepartment(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // refuse if there are still active users or children
  const userCountResult = (await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.departmentId, id))) as Array<{ count: number }>;
  const childCountResult = (await db
    .select({ count: sql<number>`count(*)::int` })
    .from(departments)
    .where(eq(departments.parentId, id))) as Array<{ count: number }>;
  const userCount = userCountResult[0]?.count ?? 0;
  const childCount = childCountResult[0]?.count ?? 0;
  if (userCount > 0 || childCount > 0) {
    res.status(409).json({
      error: "Department still has users or sub-departments",
      details: { userCount, childCount },
    });
    return;
  }
  await db.delete(departments).where(eq(departments.id, id));
  res.json({ ok: true });
}
