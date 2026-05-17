import { z } from "zod";
import { statsResponseSchema } from "./stats.js";

/**
 * Server → client SSE event envelope.
 * Discriminated union on `type`. The server emits these via /api/sse.
 */
export const sseEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("connected"),
    userId: z.string().uuid(),
    role: z.enum(["employee", "manager", "admin"]),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("event_created"),
    eventId: z.string().uuid(),
    title: z.string(),
    eventType: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("event_closed"),
    eventId: z.string().uuid(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("stats_update"),
    eventId: z.string().uuid(),
    stats: statsResponseSchema,
  }),
  z.object({
    type: z.literal("need_help"),
    eventId: z.string().uuid(),
    userId: z.string().uuid(),
    userName: z.string(),
    departmentName: z.string().nullable(),
    message: z.string().nullable(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("reminder"),
    eventId: z.string().uuid(),
    eventTitle: z.string(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("manager_reminder"),
    eventId: z.string().uuid(),
    eventTitle: z.string(),
    unreportedCount: z.number().int().nonnegative(),
    timestamp: z.string().datetime(),
  }),
  z.object({
    type: z.literal("report_submitted"),
    eventId: z.string().uuid(),
    userId: z.string().uuid(),
    status: z.enum(["safe", "need_help"]),
    timestamp: z.string().datetime(),
  }),
]);
export type SseEvent = z.infer<typeof sseEventSchema>;

export type SseEventType = SseEvent["type"];
