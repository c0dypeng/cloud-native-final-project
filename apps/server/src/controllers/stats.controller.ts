import type { Request, Response } from "express";
import type { StatsResponse } from "@workspace/api-contracts";
import {
  cacheGet,
  cacheSet,
  statsCacheKey,
} from "../lib/redis.js";
import { statsCacheHits, statsCacheMisses } from "../lib/metrics.js";
import {
  computeEventStats,
  listUnreportedUsers,
} from "./reports.controller.js";
import { getSubordinates } from "../lib/team.js";
import { isUuid } from "../middleware/validate.js";

// 15s smooths bursts well while still feeling instant alongside SSE pushes
// that arrive on every report submission.
const STATS_TTL_SECONDS = 15;

// GET /api/events/:eventId/stats
export async function getStats(req: Request, res: Response) {
  const eventId = req.params.eventId;
  if (!isUuid(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }

  const key = statsCacheKey(eventId);
  const cached = await cacheGet<StatsResponse>(key);
  if (cached) {
    statsCacheHits.inc();
    res.json(cached);
    return;
  }
  statsCacheMisses.inc();

  const { overall, byDepartment } = await computeEventStats(eventId);
  const payload = {
    eventId,
    overall,
    byDepartment,
    generatedAt: new Date().toISOString(),
  };
  await cacheSet(key, payload, STATS_TTL_SECONDS);
  res.json(payload);
}

// GET /api/events/:eventId/unreported
// Manager/admin only. Manager → only their subordinates. Admin → all unreported.
export async function getUnreported(req: Request, res: Response) {
  const eventId = req.params.eventId;
  if (!isUuid(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }

  const isAdmin = Boolean(req.adminId);
  const user = req.user;

  let scope: string[] | undefined;
  if (!isAdmin) {
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (user.role !== "manager") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const sub = await getSubordinates(user.id);
    scope = sub.map((s) => s.id);
    if (scope.length === 0) {
      res.json({ users: [] });
      return;
    }
  }

  const users = await listUnreportedUsers(eventId, scope);
  res.json({ users });
}
