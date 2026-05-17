#!/usr/bin/env tsx
/**
 * Seed script — populates departments, users, and an admin account.
 *
 *   bun run seed             → demo scale (5 depts, ~100 users, 4-level hierarchy)
 *   bun run seed:load        → load-test scale (10k users, same dept tree)
 *
 * Idempotent: re-running won't duplicate (onConflictDoNothing for admin;
 * truncates users/departments first if --reset is supplied).
 */
import { createDb } from "./db.js";
import { adminAccounts, departments, users } from "./schema/index.js";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme";
const SCALE = (process.env.SEED_SCALE ?? "demo") as "demo" | "load";
const RESET = process.argv.includes("--reset");

const db = createDb(DATABASE_URL);

// Seed RNG for reproducible names across runs
faker.seed(42);

const DEMO_USER_PASSWORD = process.env.SEED_USER_PASSWORD ?? "password123";
const userPasswordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 10);
const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

// ── Admin ─────────────────────────────────────────────────────────────────
await db
  .insert(adminAccounts)
  .values({ username: ADMIN_USERNAME, passwordHash: adminPasswordHash })
  .onConflictDoNothing();
console.log(`✓ Admin account "${ADMIN_USERNAME}" ensured`);

// ── Reset (optional) ──────────────────────────────────────────────────────
if (RESET) {
  await db.execute(sql`TRUNCATE TABLE safety_reports RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE users RESTART IDENTITY CASCADE`);
  await db.execute(sql`TRUNCATE TABLE departments RESTART IDENTITY CASCADE`);
  console.log("✓ Tables truncated (--reset)");
}

const existingDepts = await db.select({ id: departments.id }).from(departments);
if (existingDepts.length > 0 && !RESET) {
  console.log(
    `↩ Departments already exist (${existingDepts.length}). Skipping department + user seed. Pass --reset to wipe.`,
  );
  process.exit(0);
}

// ── Department hierarchy ──────────────────────────────────────────────────
// Root: 護你安企業
//   ├─ 製造一廠 ─ {鑄造課,加工課,品保課}
//   ├─ 製造二廠 ─ {鑄造課,加工課,品保課}
//   ├─ 資訊處  ─ {基礎架構組,應用系統組,資安組}
//   ├─ 人資處  ─ {招募組,薪酬組,訓練組}
//   └─ 環安處  ─ {安全衛生組,環保組,應變組}

interface DeptSeed {
  name: string;
  children?: DeptSeed[];
}

const tree: DeptSeed = {
  name: "護你安企業",
  children: [
    {
      name: "製造一廠",
      children: [
        { name: "一廠鑄造課" },
        { name: "一廠加工課" },
        { name: "一廠品保課" },
      ],
    },
    {
      name: "製造二廠",
      children: [
        { name: "二廠鑄造課" },
        { name: "二廠加工課" },
        { name: "二廠品保課" },
      ],
    },
    {
      name: "資訊處",
      children: [
        { name: "基礎架構組" },
        { name: "應用系統組" },
        { name: "資安組" },
      ],
    },
    {
      name: "人資處",
      children: [{ name: "招募組" }, { name: "薪酬組" }, { name: "訓練組" }],
    },
    {
      name: "環安處",
      children: [
        { name: "安全衛生組" },
        { name: "環保組" },
        { name: "應變組" },
      ],
    },
  ],
};

interface DeptNode {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  children: DeptNode[];
}

async function insertDept(
  seed: DeptSeed,
  parentId: string | null,
  level: number,
): Promise<DeptNode> {
  const [row] = await db
    .insert(departments)
    .values({ name: seed.name, parentId })
    .returning({ id: departments.id });
  const node: DeptNode = {
    id: row!.id,
    name: seed.name,
    parentId,
    level,
    children: [],
  };
  for (const child of seed.children ?? []) {
    node.children.push(await insertDept(child, node.id, level + 1));
  }
  return node;
}

const rootDept = await insertDept(tree, null, 0);
console.log("✓ Department hierarchy created");

// Flatten leaf departments (used to assign employees)
function leaves(node: DeptNode): DeptNode[] {
  if (node.children.length === 0) return [node];
  return node.children.flatMap(leaves);
}
function midLevelDepts(node: DeptNode): DeptNode[] {
  // mid-level == level 1 (the 5 大處/廠)
  return node.children;
}
function allDescendantLeaves(node: DeptNode): DeptNode[] {
  return leaves(node);
}

const leafDepts = leaves(rootDept);
const midDepts = midLevelDepts(rootDept);

// ── Users ─────────────────────────────────────────────────────────────────
// Hierarchy per mid-level dept (e.g., 製造一廠):
//   1 dept-head (manager)
//     for each leaf under it:
//       1 leaf-manager (manager)
//         N employees (employee)
//
// Plus a single CEO (manager) at root, who is manager of all dept-heads.

const TOTAL_EMPLOYEES = SCALE === "load" ? 10_000 : 100;
const employeesPerLeaf = Math.max(
  1,
  Math.floor(TOTAL_EMPLOYEES / leafDepts.length),
);

console.log(
  `→ Seeding ${SCALE} scale: ~${TOTAL_EMPLOYEES} employees across ${leafDepts.length} leaf depts (${employeesPerLeaf}/leaf)`,
);

// CEO
const [ceo] = await db
  .insert(users)
  .values({
    email: "ceo@huyouan.local",
    name: "陳執行長",
    passwordHash: userPasswordHash,
    departmentId: rootDept.id,
    managerId: null,
    role: "manager",
    phone: "0911000000",
  })
  .returning({ id: users.id });

let userCounter = 0;
function nextEmail(prefix: string): string {
  userCounter += 1;
  return `${prefix}${userCounter.toString().padStart(5, "0")}@huyouan.local`;
}

// Per mid-level dept
for (const mid of midDepts) {
  const [deptHead] = await db
    .insert(users)
    .values({
      email: nextEmail("head"),
      name: `${mid.name}主管`,
      passwordHash: userPasswordHash,
      departmentId: mid.id,
      managerId: ceo!.id,
      role: "manager",
      phone: faker.phone.number({ style: "international" }),
    })
    .returning({ id: users.id });

  for (const leaf of allDescendantLeaves(mid)) {
    const [leafManager] = await db
      .insert(users)
      .values({
        email: nextEmail("mgr"),
        name: `${leaf.name}組長`,
        passwordHash: userPasswordHash,
        departmentId: leaf.id,
        managerId: deptHead!.id,
        role: "manager",
        phone: faker.phone.number({ style: "international" }),
      })
      .returning({ id: users.id });

    const batch: Array<typeof users.$inferInsert> = [];
    for (let i = 0; i < employeesPerLeaf; i += 1) {
      const fullName = faker.person.fullName();
      batch.push({
        email: nextEmail("emp"),
        name: fullName,
        passwordHash: userPasswordHash,
        departmentId: leaf.id,
        managerId: leafManager!.id,
        role: "employee",
        phone: faker.phone.number({ style: "international" }),
      });
    }
    // Chunked insert to avoid query size issues at 10k scale
    const CHUNK = 500;
    for (let i = 0; i < batch.length; i += CHUNK) {
      await db.insert(users).values(batch.slice(i, i + CHUNK));
    }
  }
}

// ── Friendly demo logins (predictable emails for the 5/26 demo) ──────────
// These overwrite whatever was inserted with known credentials.
// Only in demo scale — load scale uses anonymous emails for k6.
if (SCALE === "demo") {
  await db
    .insert(users)
    .values({
      email: "employee@huyouan.local",
      name: "示範員工",
      passwordHash: userPasswordHash,
      departmentId: leafDepts[0]!.id,
      managerId: ceo!.id,
      role: "employee",
      phone: "0911111111",
    })
    .onConflictDoNothing();
  await db
    .insert(users)
    .values({
      email: "manager@huyouan.local",
      name: "示範主管",
      passwordHash: userPasswordHash,
      departmentId: midDepts[0]!.id,
      managerId: ceo!.id,
      role: "manager",
      phone: "0922222222",
    })
    .onConflictDoNothing();

  // Make the demo employee report to the demo manager
  const [demoMgr] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`email = 'manager@huyouan.local'`)
    .limit(1);
  if (demoMgr) {
    await db.execute(
      sql`UPDATE users SET manager_id = ${demoMgr.id}, department_id = ${leafDepts[0]!.id} WHERE email = 'employee@huyouan.local'`,
    );
  }
  console.log(
    `✓ Demo logins: employee@huyouan.local / manager@huyouan.local (password: ${DEMO_USER_PASSWORD})`,
  );
}

console.log(`✓ Seeded ${userCounter} users (plus CEO + demo accounts)`);
process.exit(0);
