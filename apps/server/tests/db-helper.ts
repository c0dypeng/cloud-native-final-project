import postgres from "postgres";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { db } from "../src/lib/db.js";
import {
  adminAccounts,
  departments,
  users,
  events,
} from "@workspace/database";

const TEST_PWD = "test-password-123";
const TEST_HASH = await bcrypt.hash(TEST_PWD, 4);

export const TEST_PASSWORD = TEST_PWD;

export interface Seeded {
  admin: { id: string; username: string };
  topDept: { id: string };
  childDept: { id: string };
  ceo: { id: string; email: string };
  manager: { id: string; email: string };
  employee: { id: string; email: string };
  event: { id: string; title: string };
}

/**
 * Wipes the test DB and seeds a known minimal hierarchy so tests can run
 * independently of the production faker seed.
 */
export async function resetAndSeed(): Promise<Seeded> {
  // Truncate everything in dependency order via a single SQL
  await db.execute(sql`
    TRUNCATE TABLE safety_reports, events, users, admin_accounts, departments
    RESTART IDENTITY CASCADE
  `);

  const [admin] = await db
    .insert(adminAccounts)
    .values({ username: "test-admin", passwordHash: TEST_HASH })
    .returning();
  const [topDept] = await db
    .insert(departments)
    .values({ name: "TestCo" })
    .returning();
  const [childDept] = await db
    .insert(departments)
    .values({ name: "TestDept", parentId: topDept!.id })
    .returning();

  const [ceo] = await db
    .insert(users)
    .values({
      email: "ceo@test.local",
      name: "Test CEO",
      passwordHash: TEST_HASH,
      role: "manager",
      departmentId: topDept!.id,
    })
    .returning();
  const [manager] = await db
    .insert(users)
    .values({
      email: "manager@test.local",
      name: "Test Manager",
      passwordHash: TEST_HASH,
      role: "manager",
      departmentId: childDept!.id,
      managerId: ceo!.id,
    })
    .returning();
  const [employee] = await db
    .insert(users)
    .values({
      email: "employee@test.local",
      name: "Test Employee",
      passwordHash: TEST_HASH,
      role: "employee",
      departmentId: childDept!.id,
      managerId: manager!.id,
    })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      title: "Test Earthquake",
      type: "earthquake",
      createdBy: admin!.id,
    })
    .returning();

  return {
    admin: { id: admin!.id, username: admin!.username },
    topDept: { id: topDept!.id },
    childDept: { id: childDept!.id },
    ceo: { id: ceo!.id, email: ceo!.email },
    manager: { id: manager!.id, email: manager!.email },
    employee: { id: employee!.id, email: employee!.email },
    event: { id: event!.id, title: event!.title },
  };
}

/**
 * Ensures the test DB exists before any test runs. If the DATABASE_URL ends
 * with `_test`, creates the database from the main one if missing. Otherwise
 * trusts the caller to have set it up.
 */
export async function ensureTestDb(): Promise<void> {
  // No-op for now — assume external orchestration created the DB.
  // (Docker-compose dev stack creates `safetydb`; tests can point at it directly,
  // or you can `createdb safetydb_test` locally.)
}

void ensureTestDb;
void postgres;
