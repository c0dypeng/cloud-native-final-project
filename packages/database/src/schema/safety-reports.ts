import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
  decimal,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { events } from "./events.js";
import { users } from "./users.js";

export const reportStatusEnum = pgEnum("report_status", [
  "safe",
  "need_help",
  "not_reported",
]);

export const safetyReports = pgTable(
  "safety_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: reportStatusEnum("status").notNull().default("not_reported"),
    message: text("message"),
    // Reserved for future GPS feature — not used in UI yet
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    reportedAt: timestamp("reported_at"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("uq_report_event_user").on(t.eventId, t.userId)],
);
