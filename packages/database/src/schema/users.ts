import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { departments } from "./departments.js";

export const userRoleEnum = pgEnum("user_role", ["employee", "manager"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  departmentId: uuid("department_id").references(() => departments.id),
  managerId: uuid("manager_id").references((): AnyPgColumn => users.id),
  role: userRoleEnum("role").notNull().default("employee"),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
