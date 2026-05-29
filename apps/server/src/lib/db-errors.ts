/**
 * Helpers for classifying Postgres errors raised by Drizzle.
 *
 * drizzle-orm wraps the underlying driver error in a `DrizzleQueryError`, so
 * the PG `code` (e.g. "23505") lives on `err.cause.code`, NOT on the top-level
 * error. Checking `err.code` directly silently misses every constraint error —
 * which then escapes the controller as an unhandled rejection and crashes the
 * process. Always classify via these helpers.
 */

const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function pgCode(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const top = (err as { code?: unknown }).code;
  if (typeof top === "string") return top;
  const cause = (err as { cause?: unknown }).cause;
  if (typeof cause === "object" && cause !== null) {
    const inner = (cause as { code?: unknown }).code;
    if (typeof inner === "string") return inner;
  }
  return undefined;
}

/** True for a unique-constraint violation (duplicate key). */
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === UNIQUE_VIOLATION;
}

/** True for a foreign-key violation (referenced row does not exist). */
export function isForeignKeyViolation(err: unknown): boolean {
  return pgCode(err) === FOREIGN_KEY_VIOLATION;
}
