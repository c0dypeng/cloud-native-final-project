import type { Request, Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "../lib/db.js";

export const healthCheck = async (_req: Request, res: Response) => {
  let dbStatus = "ok";
  try {
    await db.execute(sql`SELECT 1`);
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  res.status(dbStatus === "ok" ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
    db: dbStatus,
  });
};
