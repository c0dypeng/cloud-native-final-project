import {
  pgTable,
  uuid,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { adminAccounts } from "./admin-accounts.js";

export const eventTypeEnum = pgEnum("event_type", [
  "earthquake",
  "fire",
  "security",
  "accident",
  "drill",
  "other",
]);

export const eventStatusEnum = pgEnum("event_status", ["active", "closed"]);

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  type: eventTypeEnum("type").notNull(),
  status: eventStatusEnum("status").notNull().default("active"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => adminAccounts.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});
