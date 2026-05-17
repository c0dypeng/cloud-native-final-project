import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { events } from "@workspace/database";
import { isUuid } from "../middleware/validate.js";
import { runReminderForEvent } from "../jobs/reminder.job.js";
import { logger } from "../lib/logger.js";

/**
 * POST /api/admin/events/:id/remind — manually trigger the unreported
 * reminder flow for a single event. Useful during a real incident when the
 * 5-min cron cadence is too slow, and as a "Send reminder now" demo button
 * on the live command center.
 *
 * Bypasses the cron Redis lock (operator override) but still applies the
 * per-user 3-emails-per-event cap via the Redis counter.
 */
export async function adminTriggerReminder(req: Request, res: Response) {
  const id = req.params.id;
  if (!isUuid(id)) {
    res.status(400).json({ error: "Invalid event id" });
    return;
  }

  const [event] = await db
    .select({ id: events.id, title: events.title, status: events.status })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event.status !== "active") {
    res.status(409).json({ error: "Event is not active" });
    return;
  }

  try {
    const result = await runReminderForEvent({
      id: event.id,
      title: event.title,
    });
    logger.info(
      {
        eventId: event.id,
        triggeredBy: req.adminUsername,
        unreported: result.unreported,
      },
      "admin manually triggered reminder",
    );
    res.json({
      ok: true,
      unreported: result.unreported,
      eventId: event.id,
    });
  } catch (err) {
    logger.error({ err, eventId: event.id }, "manual reminder failed");
    res.status(500).json({ error: "Reminder failed" });
  }
}
