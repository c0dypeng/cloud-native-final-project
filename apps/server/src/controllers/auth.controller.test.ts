import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockDb, mockBcrypt, mockSignToken, mockSessions } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: any = { _resolveValue: [] as unknown[] };
  const methods = [
    "select", "from", "where", "limit", "insert", "values",
    "returning", "update", "set", "leftJoin", "orderBy", "offset",
  ];
  for (const m of methods) {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  }
  chainable.then = (resolve: (v: unknown[]) => void) =>
    resolve(chainable._resolveValue as unknown[]);

  return {
    mockDb: chainable as { _resolveValue: unknown[]; then: unknown; [k: string]: unknown },
    mockBcrypt: { compare: vi.fn(), hash: vi.fn() },
    mockSignToken: vi.fn().mockReturnValue("mock-jwt-token"),
    mockSessions: {
      createAdminSession: vi.fn().mockResolvedValue("mock-session-id"),
      deleteAdminSession: vi.fn().mockResolvedValue(undefined),
      getValidAdminSession: vi.fn(),
    },
  };
});

vi.mock("../lib/db.js", () => ({ db: mockDb }));
vi.mock("bcryptjs", () => ({ default: mockBcrypt }));
vi.mock("../lib/jwt.js", () => ({ signToken: mockSignToken }));
vi.mock("../lib/sessions.js", () => mockSessions);

import { login, logout, me, adminLogout, adminMe } from "./auth.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    headers: {},
    cookies: {},
    user: undefined,
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { statusCode: number; body: unknown; cookieArgs: unknown[] } {
  const res = {
    statusCode: 200,
    body: null as unknown,
    cookieArgs: [] as unknown[],
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res.body = data; return res; },
    cookie(...args: unknown[]) { res.cookieArgs = args; return res; },
    clearCookie: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { statusCode: number; body: unknown; cookieArgs: unknown[] };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb._resolveValue = [];
});

describe("login", () => {
  it("returns 400 when body fails validation", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as Record<string, unknown>).error).toBe("Validation failed");
  });

  it("returns 401 when user not found", async () => {
    mockDb._resolveValue = [];
    mockBcrypt.compare.mockResolvedValue(false);
    const req = mockReq({ body: { email: "nobody@test.com", password: "pass123" } });
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when password is wrong", async () => {
    mockDb._resolveValue = [{
      id: "u1", email: "alice@test.com", name: "Alice", role: "employee",
      passwordHash: "$2a$10$hash", isActive: true,
      departmentId: null, managerId: null, locale: "zh-TW",
    }];
    mockBcrypt.compare.mockResolvedValue(false);
    const req = mockReq({ body: { email: "alice@test.com", password: "wrong" } });
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 200 with token on success", async () => {
    mockDb._resolveValue = [{
      id: "u1", email: "alice@test.com", name: "Alice", role: "employee",
      passwordHash: "$2a$10$hash", isActive: true,
      departmentId: "d1", managerId: null, locale: "zh-TW",
    }];
    mockBcrypt.compare.mockResolvedValue(true);
    const req = mockReq({ body: { email: "alice@test.com", password: "correct" } });
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).token).toBe("mock-jwt-token");
    expect(mockSignToken).toHaveBeenCalledOnce();
  });

  it("returns 401 for inactive user", async () => {
    mockDb._resolveValue = [{
      id: "u1", email: "alice@test.com", name: "Alice", role: "employee",
      passwordHash: "$2a$10$hash", isActive: false,
      departmentId: null, managerId: null, locale: "zh-TW",
    }];
    mockBcrypt.compare.mockResolvedValue(true);
    const req = mockReq({ body: { email: "alice@test.com", password: "correct" } });
    const res = mockRes();
    await login(req, res);
    expect(res.statusCode).toBe(401);
  });
});

describe("logout", () => {
  it("clears token cookie", () => {
    const req = mockReq();
    const res = mockRes();
    logout(req, res);
    expect(res.clearCookie).toHaveBeenCalledWith("token");
    expect((res.body as Record<string, unknown>).ok).toBe(true);
  });
});

describe("me", () => {
  it("returns 401 when req.user is missing", async () => {
    const req = mockReq();
    const res = mockRes();
    await me(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns user data on success", async () => {
    mockDb._resolveValue = [{
      id: "u1", email: "alice@test.com", name: "Alice", role: "employee",
      departmentId: "d1", managerId: null, locale: "zh-TW", isActive: true,
    }];
    const req = mockReq({ user: { id: "u1", email: "alice@test.com", role: "employee" as const, departmentId: null, managerId: null } });
    const res = mockRes();
    await me(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { user: { name: string } }).user.name).toBe("Alice");
  });
});

describe("adminMe", () => {
  it("returns 401 when no session header", async () => {
    const req = mockReq({ headers: {} });
    const res = mockRes();
    await adminMe(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 401 when session is invalid", async () => {
    mockSessions.getValidAdminSession.mockResolvedValue(null);
    const req = mockReq({ headers: { "x-admin-session": "bad-session" } });
    const res = mockRes();
    await adminMe(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns admin info on valid session", async () => {
    mockSessions.getValidAdminSession.mockResolvedValue({
      adminId: "a1", username: "admin", createdAt: Date.now(),
    });
    const req = mockReq({ headers: { "x-admin-session": "valid" } });
    const res = mockRes();
    await adminMe(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { admin: { username: string } }).admin.username).toBe("admin");
  });
});

describe("adminLogout", () => {
  it("deletes session and clears cookie", async () => {
    const req = mockReq({
      headers: { "x-admin-session": "session-to-delete" },
      cookies: {},
    });
    const res = mockRes();
    await adminLogout(req, res);
    expect(mockSessions.deleteAdminSession).toHaveBeenCalledWith("session-to-delete");
    expect(res.clearCookie).toHaveBeenCalledWith("admin-session");
  });
});
