import { z } from "zod";

export const eventTypeSchema = z.enum([
  "earthquake",
  "fire",
  "security",
  "accident",
  "drill",
  "other",
]);
export type EventType = z.infer<typeof eventTypeSchema>;

export const eventStatusSchema = z.enum(["active", "closed"]);
export type EventStatus = z.infer<typeof eventStatusSchema>;

export const eventSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  type: eventTypeSchema,
  status: eventStatusSchema,
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
});
export type Event = z.infer<typeof eventSchema>;

export const eventCreateInputSchema = z.object({
  title: z.string().min(1, "請輸入事件名稱").max(200),
  description: z.string().max(2000).optional().nullable(),
  type: eventTypeSchema,
});
export type EventCreateInput = z.infer<typeof eventCreateInputSchema>;

export const eventListResponseSchema = z.object({
  events: z.array(eventSchema),
});
export type EventListResponse = z.infer<typeof eventListResponseSchema>;

export const eventResponseSchema = z.object({ event: eventSchema });
export type EventResponse = z.infer<typeof eventResponseSchema>;
