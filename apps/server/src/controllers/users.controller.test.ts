import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockDb, mockBcrypt } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: any = { _resolveValue: [] as unknown[] };
  const methods = [
    "select", "from", "where", "limit", "insert", "values",
    "returning", "update", "set", "leftJoin", "orderBy", "offset",
    "groupBy",
  ];
  for (const m of methods) {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  }
  chainable.then = (resolve: (v: unknown[]) => void) =>
    resolve(chainable._resolveValue as unknown[]);

  return {
    mockDb: chainable as { _resolveValue: unknown[]; then: unknown; [k: string]: unknown },
    mockBcrypt: {
      hash: vi.fn().mockResolvedValue("$2a$10$hashed"),
      compare: vi.fn(),
    },
  };
});

vi.mock("../lib/db.js", () => ({ db: mockDb }));
vi.mock("bcryptjs", () => ({ default: mockBcrypt }));
vi.mock("../lib/locale.js", () => ({
  getRequestLocale: () => "zh-TW",
}));

import {
  createUser,
  updateUser,
  softDeleteUser,
  resetUserPassword,
} from "./users.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

function mockRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res.body = data; return res; },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb._resolveValue = [];
});

describe("createUser", () => {
  it("returns 400 on invalid body", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await createUser(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("hashes password with bcrypt on success", async () => {
    mockDb._resolveValue = [{ id: "u1", email: "alice@example.com" }];
    const req = mockReq({
      body: { email: "Alice@Example.com", name: "Alice", password: "password123" },
    });
    const res = mockRes();
    await createUser(req, res);
    expect(mockBcrypt.hash).toHaveBeenCalledWith("password123", 10);
    expect(res.statusCode).toBe(201);
  });

  it("returns 409 on duplicate email", async () => {
    mockDb.returning = vi.fn().mockRejectedValue(
      Object.assign(new Error("unique violation"), { code: "23505" }),
    );
    const req = mockReq({
      body: { email: "alice@example.com", name: "Alice", password: "password123" },
    });
    const res = mockRes();
    await createUser(req, res);
    expect(res.statusCode).toBe(409);
    mockDb.returning = vi.fn().mockReturnValue(mockDb);
  });
});

describe("updateUser", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" }, body: { name: "Bob" } });
    const res = mockRes();
    await updateUser(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects self-reference managerId", async () => {
    const id = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
    const req = mockReq({
      params: { id },
      body: { managerId: id },
    });
    const res = mockRes();
    await updateUser(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as Record<string, unknown>).error).toContain("own manager");
  });

  it("returns 404 when user not found", async () => {
    mockDb._resolveValue = [];
    const req = mockReq({
      params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      body: { name: "Updated" },
    });
    const res = mockRes();
    await updateUser(req, res);
    expect(res.statusCode).toBe(404);
  });
});

describe("softDeleteUser", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" } });
    const res = mockRes();
    await softDeleteUser(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when user not found", async () => {
    mockDb._resolveValue = [];
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await softDeleteUser(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("returns isActive: false on success", async () => {
    mockDb._resolveValue = [{ id: "u1", isActive: false }];
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await softDeleteUser(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { user: { isActive: boolean } }).user.isActive).toBe(false);
  });
});

describe("resetUserPassword", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" }, body: { password: "newpass123" } });
    const res = mockRes();
    await resetUserPassword(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when password too short", async () => {
    const req = mockReq({
      params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      body: { password: "short" },
    });
    const res = mockRes();
    await resetUserPassword(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("hashes new password on success", async () => {
    mockDb._resolveValue = [{ id: "u1" }];
    const req = mockReq({
      params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      body: { password: "newpassword123" },
    });
    const res = mockRes();
    await resetUserPassword(req, res);
    expect(mockBcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
    expect(res.statusCode).toBe(200);
  });
});
