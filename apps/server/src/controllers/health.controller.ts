import type { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";
import { redis } from "../lib/redis.js";

export const healthCheck = async (_req: Request, res: Response) => {
  const [dbStatus, redisStatus] = await Promise.all([
    db
      .execute(sql`SELECT 1`)
      .then(() => "ok" as const)
      .catch(() => "error" as const),
    redis
      .ping()
      .then(() => "ok" as const)
      .catch(() => "error" as const),
  ]);

  const allOk = dbStatus === "ok" && redisStatus === "ok";
  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    db: dbStatus,
    redis: redisStatus,
  });
};
