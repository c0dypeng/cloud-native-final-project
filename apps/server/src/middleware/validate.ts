import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny, z } from "zod";

// Lenient UUID shape check — accepts any 8-4-4-4-12 hex layout including the
// nil UUID. We don't enforce RFC 4122 version/variant bits because anything
// Postgres accepts as `uuid` is fine for our purposes; we just want to bail
// before the DB on totally malformed strings.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lightweight UUID shape check used to short-circuit bogus IDs before hitting the DB. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Validate request body against a Zod schema. On success, the parsed value
 * replaces `req.body`. On failure, returns 400 with the issue list.
 */
export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
      return;
    }
    req.body = parsed.data as z.infer<T>;
    next();
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid query parameters",
        details: parsed.error.flatten(),
      });
      return;
    }
    // Note: express 5 makes req.query readonly; we attach to a custom field
    (req as Request & { validatedQuery?: unknown }).validatedQuery =
      parsed.data;
    next();
  };
}
