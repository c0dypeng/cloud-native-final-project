import { createDb, type Db } from "@workspace/database";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const db: Db = createDb(process.env.DATABASE_URL);
