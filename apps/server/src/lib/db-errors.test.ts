import { describe, it, expect } from "vitest";
import { isUniqueViolation, isForeignKeyViolation } from "./db-errors.js";

describe("db-errors classification", () => {
  it("detects a unique violation on a top-level code", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("detects a unique violation wrapped in DrizzleQueryError.cause", () => {
    // Regression: drizzle-orm wraps the driver error, so the PG code lives on
    // err.cause.code. Missing this let the rejection escape and crash the pod.
    const wrapped = Object.assign(new Error("Failed query: insert ..."), {
      cause: Object.assign(new Error("duplicate key"), { code: "23505" }),
    });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it("detects a foreign-key violation wrapped in cause", () => {
    const wrapped = Object.assign(new Error("Failed query: insert ..."), {
      cause: Object.assign(new Error("fk"), { code: "23503" }),
    });
    expect(isForeignKeyViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(wrapped)).toBe(false);
  });

  it("returns false for unrelated / non-error inputs", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation("boom")).toBe(false);
    expect(isUniqueViolation({ code: "42P01" })).toBe(false);
    expect(isForeignKeyViolation({ cause: { code: "23505" } })).toBe(false);
  });
});
