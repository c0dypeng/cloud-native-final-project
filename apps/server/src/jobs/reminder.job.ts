import cron, { type ScheduledTask } from "node-cron";
import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import {
  acquireLock,
  counterIncrWithTtl,
  reminderCounterKey,
} from "../lib/redis.js";
import { sendToUser, sendToManagerChain } from "../lib/sse.js";
import {
  sendEmail,
  unreportedReminderEmail,
  managerReminderEmail,
} from "../lib/resend.js";
import { logger } from "../lib/logger.js";
import { listActiveEvents } from "../controllers/events.controller.js";
import {
  activeEventsTotal,
  unreportedUsersTotal,
} from "../lib/metrics.js";

const MAX_EMAILS_PER_USER = 3;
const REMINDER_TTL_SECONDS = 8 * 60 * 60; // 8h
const CRON_LOCK_KEY = "huyouan:cron:reminder";
const CRON_LOCK_TTL_SECONDS = 290; // < 5min interval so a crashed worker releases the lock before the next tick

interface UnreportedRow {
  id: string;
  name: string;
  email: string;
  managerId: string | null;
}

interface ManagerRow {
  managerId: string;
  managerName: string;
  managerEmail: string;
  unreportedCount: number;
}

async function processEvent(event: {
  id: string;
  title: string;
}): Promise<void> {
  // 1. Unreported users for this event
  const userResult = await db.execute(sql`
    SELECT u.id, u.name, u.email, u.manager_id AS "managerId"
    FROM users u
    LEFT JOIN safety_reports r
      ON r.user_id = u.id AND r.event_id = ${event.id}
    WHERE u.is_active = true
      AND u.role IN ('employee', 'manager')
      AND (r.id IS NULL OR r.status = 'not_reported')
  `);
  const unreported = userResult as unknown as UnreportedRow[];

  if (unreported.length === 0) return;

  // 2. SSE reminders + capped emails (per-user)
  const dashboardUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000") + "/dashboard";

  for (const u of unreported) {
    sendToUser(u.id, {
      type: "reminder",
      eventId: event.id,
      eventTitle: event.title,
      timestamp: new Date().toISOString(),
    });

    const count = await counterIncrWithTtl(
      reminderCounterKey(event.id, u.id),
      REMINDER_TTL_SECONDS,
    );
    if (count <= MAX_EMAILS_PER_USER && u.email) {
      const tpl = unreportedReminderEmail({
        name: u.name,
        eventTitle: event.title,
        reportUrl: dashboardUrl,
      });
      await sendEmail({ to: u.email, ...tpl });
    }
  }

  // 3. Manager reminders — managers whose subordinates are still unreported
  const managerResult = await db.execute(sql`
    WITH RECURSIVE subordinates AS (
      SELECT id, manager_id, name, email, 1 AS depth
      FROM users WHERE manager_id IS NOT NULL AND is_active = true
      UNION ALL
      SELECT u.id, s.manager_id, u.name, u.email, s.depth + 1
      FROM users u JOIN subordinates s ON u.manager_id = s.id
      WHERE u.is_active = true
    ),
    unreported_subs AS (
      SELECT DISTINCT s.id, s.manager_id
      FROM subordinates s
      LEFT JOIN safety_reports r
        ON r.user_id = s.id AND r.event_id = ${event.id}
      WHERE r.id IS NULL OR r.status = 'not_reported'
    )
    SELECT m.id AS "managerId", m.name AS "managerName",
           m.email AS "managerEmail",
           COUNT(*)::int AS "unreportedCount"
    FROM unreported_subs us
    JOIN users m ON m.id = us.manager_id
    WHERE m.is_active = true
    GROUP BY m.id, m.name, m.email
  `);
  const managers = managerResult as unknown as ManagerRow[];

  for (const m of managers) {
    sendToManagerChain([m.managerId], {
      type: "manager_reminder",
      eventId: event.id,
      eventTitle: event.title,
      unreportedCount: m.unreportedCount,
      timestamp: new Date().toISOString(),
    });
    // Manager email also rate-limited via shared counter key
    const count = await counterIncrWithTtl(
      reminderCounterKey(event.id, `mgr:${m.managerId}`),
      REMINDER_TTL_SECONDS,
    );
    if (count <= MAX_EMAILS_PER_USER && m.managerEmail) {
      const tpl = managerReminderEmail({
        name: m.managerName,
        eventTitle: event.title,
        unreportedCount: m.unreportedCount,
        dashboardUrl: dashboardUrl + "/team",
      });
      await sendEmail({ to: m.managerEmail, ...tpl });
    }
  }

  logger.info(
    {
      eventId: event.id,
      unreported: unreported.length,
      managersNotified: managers.length,
    },
    "reminder.job tick",
  );
}

/**
 * Manually trigger the reminder flow for a single event. Used by the admin
 * "Send reminder now" button on the live command center — does not respect
 * the cron lock (operator override) but still applies the per-user
 * 3-emails-per-event cap.
 */
export async function runReminderForEvent(event: {
  id: string;
  title: string;
}): Promise<{ unreported: number; managersNotified: number }> {
  const beforeUnreported = await db
    .execute(sql`
      SELECT COUNT(*)::int AS count
      FROM users u
      LEFT JOIN safety_reports r
        ON r.user_id = u.id AND r.event_id = ${event.id}
      WHERE u.is_active = true
        AND u.role IN ('employee', 'manager')
        AND (r.id IS NULL OR r.status = 'not_reported')
    `)
    .then((rows) => (rows as unknown as Array<{ count: number }>)[0]?.count ?? 0);

  await processEvent(event);
  // processEvent doesn't return counts, but the metric was updated; surface
  // the unreported count we measured here so the admin gets a confirmation.
  return { unreported: beforeUnreported, managersNotified: 0 };
}

export async function runReminderTick(): Promise<void> {
  // Distributed lock: only one replica runs the cron per tick.
  const gotLock = await acquireLock(CRON_LOCK_KEY, CRON_LOCK_TTL_SECONDS);
  if (!gotLock) {
    logger.debug("reminder.job skipped — another replica holds the lock");
    return;
  }

  const active = await listActiveEvents();
  activeEventsTotal.set(active.length);

  if (active.length === 0) {
    unreportedUsersTotal.set(0);
    return;
  }

  let totalUnreported = 0;
  for (const event of active) {
    try {
      const result = await db.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM users u
        LEFT JOIN safety_reports r
          ON r.user_id = u.id AND r.event_id = ${event.id}
        WHERE u.is_active = true
          AND u.role IN ('employee', 'manager')
          AND (r.id IS NULL OR r.status = 'not_reported')
      `);
      const rows = result as unknown as Array<{ count: number }>;
      totalUnreported += rows[0]?.count ?? 0;
      await processEvent({ id: event.id, title: event.title });
    } catch (err) {
      logger.error({ err, eventId: event.id }, "reminder.job event failed");
    }
  }
  unreportedUsersTotal.set(totalUnreported);
}

let task: ScheduledTask | null = null;

export function startReminderJob(): void {
  if (task) return;
  task = cron.schedule("*/5 * * * *", () => {
    runReminderTick().catch((err) =>
      logger.error({ err }, "reminder.job tick threw"),
    );
  });
  logger.info("reminder.job scheduled every 5 minutes");
}

export function stopReminderJob(): void {
  task?.stop();
  task = null;
}
