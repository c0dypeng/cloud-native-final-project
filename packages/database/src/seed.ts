#!/usr/bin/env tsx
/**
 * Seed script — inserts the initial admin account.
 * Run: DATABASE_URL=... tsx src/seed.ts
 * Or via Makefile: make seed
 */
import { createDb } from "./db.js";
import { adminAccounts } from "./schema/index.js";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "changeme";

const db = createDb(DATABASE_URL);

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

await db
  .insert(adminAccounts)
  .values({ username: ADMIN_USERNAME, passwordHash })
  .onConflictDoNothing();

console.log(`✓ Admin account "${ADMIN_USERNAME}" seeded`);
process.exit(0);
