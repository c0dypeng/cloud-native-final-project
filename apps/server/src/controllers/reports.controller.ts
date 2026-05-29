import type { Request, Response } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import {
  departmentTranslations,
  safetyReports,
  users,
  departments,
} from "@workspace/database";
import { reportSubmitInputSchema } from "@workspace/api-contracts";
import { cacheDel, statsCacheKeys } from "../lib/redis.js";
import {
  reportSubmitTotal,
  unreportedUsersTotal,
} from "../lib/metrics.js";
import { getSubordinates } from "../lib/team.js";
import { isEventActive } from "./events.controller.js";
import { isUuid } from "../middleware/validate.js";
import { getRequestLocale, type SupportedLocale } from "../lib/locale.js";
import { publishReportEvent } from "../lib/queue.js";

// POST /api/events/:eventId/report
export async function submitReport(req: Request, res: Response) {
  const eventId = req.params.eventId;
  if (!isUuid(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = reportSubmitInputSchema.safeParse(req.body);
  if (!parsed.success) {
    reportSubmitTotal.inc({ status: "unknown", result: "error" });
    res
      .status(400)
      .json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const active = await isEventActive(eventId);
  if (!active) {
    reportSubmitTotal.inc({ status: parsed.data.status, result: "error" });
    res.status(404).json({ error: "Event not found or already closed" });
    return;
  }

  const now = new Date();
  const locale = getRequestLocale(req);
  const [report] = await db
    .insert(safetyReports)
    .values({
      eventId,
      userId: req.user.id,
      status: parsed.data.status,
      message: parsed.data.message ?? null,
      reportedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [safetyReports.eventId, safetyReports.userId],
      set: {
        status: parsed.data.status,
        message: parsed.data.message ?? null,
        reportedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  if (!report) {
    reportSubmitTotal.inc({ status: parsed.data.status, result: "error" });
    res.status(500).json({ error: "Failed to upsert report" });
    return;
  }

  await cacheDel(...statsCacheKeys(eventId));
  reportSubmitTotal.inc({ status: parsed.data.status, result: "success" });

  // Hand off side-effects (SSE fan-out + email) to the report-event stream.
  // Keeps the HTTP path fast and absorbs traffic bursts during real incidents.
  await publishReportEvent({
    type: "report_submitted",
    eventId,
    userId: req.user.id,
    status: parsed.data.status,
    locale,
    timestamp: now.toISOString(),
  });
  if (parsed.data.status === "need_help") {
    await publishReportEvent({
      type: "need_help_followup",
      eventId,
      userId: req.user.id,
      message: parsed.data.message ?? null,
      locale,
      timestamp: now.toISOString(),
    });
  }

  res.status(200).json({
    report: {
      id: report.id,
      eventId: report.eventId,
      userId: report.userId,
      status: report.status,
      message: report.message,
      reportedAt: report.reportedAt ? report.reportedAt.toISOString() : null,
      updatedAt: report.updatedAt.toISOString(),
    },
  });
}

// GET /api/events/:eventId/reports
// employee → own only · manager → subordinates · admin → all
export async function listReports(req: Request, res: Response) {
  const eventId = req.params.eventId;
  if (!isUuid(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }
  const isAdmin = Boolean(req.adminId);
  const user = req.user;
  const locale = getRequestLocale(req);

  let userIdFilter: string[] | null = null;
  if (!isAdmin) {
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role === "manager") {
      const sub = await getSubordinates(user.id);
      userIdFilter = [user.id, ...sub.map((s) => s.id)];
    } else {
      userIdFilter = [user.id];
    }
  }

  const base = db
    .select({
      id: safetyReports.id,
      eventId: safetyReports.eventId,
      userId: safetyReports.userId,
      status: safetyReports.status,
      message: safetyReports.message,
      reportedAt: safetyReports.reportedAt,
      updatedAt: safetyReports.updatedAt,
      userName: users.name,
      userEmail: users.email,
      userPhone: users.phone,
      departmentId: users.departmentId,
      departmentName: sql<string | null>`coalesce(${departmentTranslations.name}, ${departments.name})`,
    })
    .from(safetyReports)
    .innerJoin(users, eq(users.id, safetyReports.userId))
    .leftJoin(departments, eq(departments.id, users.departmentId))
    .leftJoin(
      departmentTranslations,
      and(
        eq(departmentTranslations.departmentId, departments.id),
        eq(departmentTranslations.locale, locale),
      ),
    )
    .where(
      userIdFilter
        ? and(
            eq(safetyReports.eventId, eventId),
            inArray(safetyReports.userId, userIdFilter),
          )
        : eq(safetyReports.eventId, eventId),
    )
    .orderBy(desc(safetyReports.updatedAt));

  const rows = await base;

  res.json({
    reports: rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      userId: r.userId,
      status: r.status,
      message: r.message,
      reportedAt: r.reportedAt ? r.reportedAt.toISOString() : null,
      updatedAt: r.updatedAt.toISOString(),
      user: {
        id: r.userId,
        name: r.userName,
        email: r.userEmail,
        phone: r.userPhone,
        departmentId: r.departmentId,
        departmentName: r.departmentName,
      },
    })),
  });
}

/** Helper for stats — total active users grouped by department + report counts. */
export async function computeEventStats(
  eventId: string,
  locale: SupportedLocale = "zh-TW",
) {
  // One query: for every active user, left-join their safety_report for this event.
  // Counts per department + grand total.
  const rows = await db.execute(sql`
    SELECT
      u.department_id AS "departmentId",
      COALESCE(dt.name, d.name) AS "departmentName",
      COUNT(*)::int                                                    AS "total",
      COUNT(*) FILTER (WHERE r.status = 'safe')::int                   AS "safe",
      COUNT(*) FILTER (WHERE r.status = 'need_help')::int              AS "needHelp",
      COUNT(*) FILTER (WHERE r.id IS NULL OR r.status = 'not_reported')::int AS "notReported"
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN department_translations dt
      ON dt.department_id = d.id AND dt.locale = ${locale}
    LEFT JOIN safety_reports r
      ON r.user_id = u.id AND r.event_id = ${eventId}
    WHERE u.is_active = true AND u.role IN ('employee', 'manager')
    GROUP BY u.department_id, COALESCE(dt.name, d.name)
    ORDER BY COALESCE(dt.name, d.name) NULLS LAST
  `);
  const data = rows as unknown as Array<{
    departmentId: string | null;
    departmentName: string | null;
    total: number;
    safe: number;
    needHelp: number;
    notReported: number;
  }>;

  const overall = data.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      safe: acc.safe + r.safe,
      needHelp: acc.needHelp + r.needHelp,
      notReported: acc.notReported + r.notReported,
    }),
    { total: 0, safe: 0, needHelp: 0, notReported: 0 },
  );

  const byDepartment = data
    .filter((r): r is typeof r & { departmentId: string; departmentName: string } =>
      Boolean(r.departmentId && r.departmentName),
    )
    .map((r) => ({
      departmentId: r.departmentId,
      departmentName: r.departmentName,
      total: r.total,
      safe: r.safe,
      needHelp: r.needHelp,
      notReported: r.notReported,
    }));

  // Update gauges (cheap aggregate over all events would be done on cron;
  // for stats endpoint we just publish this event's notReported)
  unreportedUsersTotal.set(overall.notReported);

  return { overall, byDepartment };
}

/** Helper for unreported list — all users without report (or 'not_reported'). */
export async function listUnreportedUsers(
  eventId: string,
  scope?: string[],
  locale: SupportedLocale = "zh-TW",
) {
  const result = await db.execute(sql`
    SELECT
      u.id, u.name, u.email, u.phone,
      u.department_id AS "departmentId",
      COALESCE(dt.name, d.name) AS "departmentName"
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN department_translations dt
      ON dt.department_id = d.id AND dt.locale = ${locale}
    LEFT JOIN safety_reports r
      ON r.user_id = u.id AND r.event_id = ${eventId}
    WHERE u.is_active = true
      AND u.role IN ('employee', 'manager')
      AND (r.id IS NULL OR r.status = 'not_reported')
      ${scope ? sql`AND u.id IN (${sql.join(scope.map((x) => sql`${x}`), sql`, `)})` : sql``}
    ORDER BY COALESCE(dt.name, d.name) NULLS LAST, u.name
  `);
  return result as unknown as Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    departmentId: string | null;
    departmentName: string | null;
  }>;
}
