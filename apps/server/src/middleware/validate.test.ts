import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { isUuid, validateBody, validateQuery } from "./validate.js";

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res as typeof res & import("express").Response;
}

describe("isUuid", () => {
  it("accepts valid v4 UUID", () => {
    expect(isUuid("a1b2c3d4-e5f6-4890-abcd-ef1234567890")).toBe(true);
  });

  it("accepts uppercase UUID", () => {
    expect(isUuid("A1B2C3D4-E5F6-4890-ABCD-EF1234567890")).toBe(true);
  });

  it("accepts nil UUID", () => {
    expect(isUuid("00000000-0000-0000-0000-000000000000")).toBe(true);
  });

  it("rejects too-short string", () => {
    expect(isUuid("a1b2c3d4-e5f6-4890-abcd")).toBe(false);
  });

  it("rejects non-hex characters", () => {
    expect(isUuid("g1b2c3d4-e5f6-4890-abcd-ef1234567890")).toBe(false);
  });

  it("rejects 32 hex chars without dashes", () => {
    expect(isUuid("a1b2c3d4e5f64890abcdef1234567890")).toBe(false);
  });

  it("rejects null", () => {
    expect(isUuid(null)).toBe(false);
  });

  it("rejects number", () => {
    expect(isUuid(12345)).toBe(false);
  });
});

describe("validateBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("passes valid data and replaces req.body", () => {
    const req = { body: { name: "Alice" } } as import("express").Request;
    const res = mockRes();
    const next = vi.fn();
    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ name: "Alice" });
  });

  it("returns 400 with error details on invalid data", () => {
    const req = { body: { name: "" } } as import("express").Request;
    const res = mockRes();
    const next = vi.fn();
    validateBody(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
    expect((res.body as Record<string, unknown>).error).toBe(
      "Validation failed",
    );
  });
});

describe("validateQuery", () => {
  const schema = z.object({ limit: z.coerce.number().int().positive() });

  it("returns 400 on invalid query", () => {
    const req = { query: { limit: "abc" } } as unknown as import("express").Request;
    const res = mockRes();
    const next = vi.fn();
    validateQuery(schema)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});
