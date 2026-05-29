/**
 * Vitest pre-test environment setup.
 * - Provides a JWT secret so `lib/jwt.ts` doesn't throw at import time.
 * - Falls back to common local URLs if the env doesn't set DATABASE_URL/REDIS_URL.
 * - Disables the reminder cron so tests don't fire it unintentionally.
 */
process.env.JWT_SECRET ||= "test-secret-" + "x".repeat(56);
process.env.JWT_EXPIRES_IN ||= "1h";
process.env.NODE_ENV ||= "test";
process.env.DATABASE_URL ||=
  "postgresql://safety:safety@localhost:5432/safetydb_test";
process.env.REDIS_URL ||= "redis://localhost:6379";
process.env.REMINDER_JOB_DISABLED = "1";
process.env.REPORT_WORKER_DISABLED = "1";
