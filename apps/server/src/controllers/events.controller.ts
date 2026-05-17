import type { Request, Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { events } from "@workspace/database";
import { eventCreateInputSchema } from "@workspace/api-contracts";
import { broadcastAll } from "../lib/sse.js";
import { cacheDel, statsCacheKey } from "../lib/redis.js";
import { isUuid } from "../middleware/validate.js";

function serializeEvent(e: typeof events.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    type: e.type,
    status: e.status,
    createdBy: e.createdBy,
    createdAt: e.createdAt.toISOString(),
    closedAt: e.closedAt ? e.closedAt.toISOString() : null,
  };
}

// GET /api/events
// - employee: active only
// - manager/admin: all
export async function listEvents(req: Request, res: Response) {
  const isAdmin = Boolean(req.adminId);
  const isManager = req.user?.role === "manager";

  const where = !isAdmin && !isManager ? eq(events.status, "active") : undefined;

  const rows = await db
    .select()
    .from(events)
    .where(where)
    .orderBy(desc(events.createdAt));

  res.json({ events: rows.map(serializeEvent) });
}

// GET /api/events/:id
export async function getEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  res.json({ event: serializeEvent(event) });
}

// POST /api/events  (admin only — guarded by requireAdmin middleware)
export async function createEvent(req: Request, res: Response) {
  const parsed = eventCreateInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }
  // requireAdmin guarantees req.adminId is set; assert non-null for the
  // FK on events.createdBy.
  const adminId = req.adminId!;

  const [created] = await db
    .insert(events)
    .values({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type,
      createdBy: adminId,
    })
    .returning();

  if (!created) {
    res.status(500).json({ error: "Failed to create event" });
    return;
  }

  broadcastAll({
    type: "event_created",
    eventId: created.id,
    title: created.title,
    eventType: created.type,
    timestamp: new Date().toISOString(),
  });

  res.status(201).json({ event: serializeEvent(created) });
}

// PATCH /api/events/:id/close  (admin only)
// Returns 404 if the event doesn't exist, 409 if it's already closed.
export async function closeEvent(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [existing] = await db
    .select({ id: events.id, status: events.status })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (existing.status !== "active") {
    res.status(409).json({ error: "Event is already closed" });
    return;
  }

  const [updated] = await db
    .update(events)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(events.id, id))
    .returning();
  if (!updated) {
    // Lost a race — someone closed it between the SELECT and UPDATE.
    res.status(409).json({ error: "Event is already closed" });
    return;
  }

  await cacheDel(statsCacheKey(updated.id));

  broadcastAll({
    type: "event_closed",
    eventId: updated.id,
    timestamp: new Date().toISOString(),
  });

  res.json({ event: serializeEvent(updated) });
}

/**
 * Helper used by stats: returns all active event ids.
 */
export async function listActiveEventIds(): Promise<string[]> {
  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.status, "active"));
  return rows.map((r) => r.id);
}

/**
 * Helper used in cron: get full active events to iterate.
 */
export async function listActiveEvents() {
  return db.select().from(events).where(eq(events.status, "active"));
}

/**
 * Helper used by report controller to validate eventId belongs to an active
 * event (employees can't report against closed events).
 */
export async function isEventActive(eventId: string): Promise<boolean> {
  const [event] = await db
    .select({ status: events.status })
    .from(events)
    .where(eq(events.id, eventId))
    .limit(1);
  return event?.status === "active";
}

/**
 * Helper for the SSE controller to pre-resolve event ids visible to the
 * caller (used to filter inbound stats_update events client-side).
 */
export async function listEventIdsByStatus(
  status: "active" | "closed" | "all",
): Promise<string[]> {
  if (status === "all") {
    const rows = await db.select({ id: events.id }).from(events);
    return rows.map((r) => r.id);
  }
  const rows = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.status, status));
  return rows.map((r) => r.id);
}

