import type { Request, Response } from "express";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../lib/db.js";
import { safetyReports } from "@workspace/database";
import { getSubordinates } from "../lib/team.js";
import { isUuid } from "../middleware/validate.js";
import { getRequestLocale } from "../lib/locale.js";

// GET /api/manager/team
export async function getTeam(req: Request, res: Response) {
  if (!req.user || req.user.role !== "manager") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const members = await getSubordinates(req.user.id, getRequestLocale(req));
  res.json({ members });
}

// GET /api/manager/team/:eventId/status
export async function getTeamStatus(req: Request, res: Response) {
  if (!req.user || req.user.role !== "manager") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const eventId = req.params.eventId;
  if (!isUuid(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }

  const members = await getSubordinates(req.user.id, getRequestLocale(req));
  if (members.length === 0) {
    res.json({ eventId, members: [] });
    return;
  }

  const memberIds = members.map((m) => m.id);
  const reports = await db
    .select({
      userId: safetyReports.userId,
      status: safetyReports.status,
      message: safetyReports.message,
      reportedAt: safetyReports.reportedAt,
    })
    .from(safetyReports)
    .where(
      and(
        eq(safetyReports.eventId, eventId),
        inArray(safetyReports.userId, memberIds),
      ),
    );

  const byUser = new Map(reports.map((r) => [r.userId, r]));

  res.json({
    eventId,
    members: members.map((m) => {
      const r = byUser.get(m.id);
      return {
        ...m,
        reportStatus: r?.status ?? "not_reported",
        reportedAt: r?.reportedAt ? r.reportedAt.toISOString() : null,
        reportMessage: r?.message ?? null,
      };
    }),
  });
}

