import { sql } from "drizzle-orm";
import { db } from "./db.js";
import type { SupportedLocale } from "./locale.js";

export interface TeamRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "employee" | "manager";
  departmentId: string | null;
  departmentName: string | null;
  managerId: string | null;
  depth: number;
}

/**
 * Return every active user underneath `managerId` in the management chain
 * (recursive). `depth = 1` is a direct report. Excludes self.
 */
export async function getSubordinates(
  managerId: string,
  locale: SupportedLocale = "zh-TW",
): Promise<TeamRow[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE subordinates AS (
      SELECT u.id, u.name, u.email, u.phone, u.role,
             u.department_id, u.manager_id, 1 AS depth
      FROM users u
      WHERE u.manager_id = ${managerId} AND u.is_active = true

      UNION ALL

      SELECT u.id, u.name, u.email, u.phone, u.role,
             u.department_id, u.manager_id, s.depth + 1 AS depth
      FROM users u
      JOIN subordinates s ON u.manager_id = s.id
      WHERE u.is_active = true
    )
    SELECT s.id, s.name, s.email, s.phone, s.role,
           s.department_id AS "departmentId",
           COALESCE(dt.name, d.name) AS "departmentName",
           s.manager_id AS "managerId",
           s.depth
    FROM subordinates s
    LEFT JOIN departments d ON d.id = s.department_id
    LEFT JOIN department_translations dt
      ON dt.department_id = d.id AND dt.locale = ${locale}
    ORDER BY s.depth ASC, s.name ASC
  `);
  return result as unknown as TeamRow[];
}

/**
 * Return the chain of manager ids going UP from a user (including the user's
 * own managers, manager-of-manager, etc.). Used to fan out need_help alerts.
 */
export async function getManagerChain(userId: string): Promise<string[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE chain AS (
      SELECT u.manager_id AS id, 1 AS depth
      FROM users u
      WHERE u.id = ${userId} AND u.manager_id IS NOT NULL

      UNION ALL

      SELECT u.manager_id AS id, c.depth + 1
      FROM users u
      JOIN chain c ON u.id = c.id
      WHERE u.manager_id IS NOT NULL
    )
    SELECT id FROM chain ORDER BY depth ASC
  `);
  const rows = result as unknown as Array<{ id: string }>;
  return rows.map((r) => r.id).filter((id): id is string => Boolean(id));
}

/**
 * The direct manager (level-1) for a user, or null.
 */
export async function getDirectManager(
  userId: string,
): Promise<{ id: string; name: string; email: string } | null> {
  const result = await db.execute(sql`
    SELECT m.id, m.name, m.email
    FROM users u
    JOIN users m ON m.id = u.manager_id
    WHERE u.id = ${userId}
    LIMIT 1
  `);
  const rows = result as unknown as Array<{
    id: string;
    name: string;
    email: string;
  }>;
  return rows[0] ?? null;
}
