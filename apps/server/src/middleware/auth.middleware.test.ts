import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

vi.mock("../lib/jwt.js", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("../lib/sessions.js", () => ({
  getValidAdminSession: vi.fn(),
}));

import { verifyToken } from "../lib/jwt.js";
import { getValidAdminSession } from "../lib/sessions.js";
import {
  requireAuth,
  requireRole,
  requireAdmin,
  requireAuthOrAdmin,
} from "./auth.middleware.js";

const mockedVerify = vi.mocked(verifyToken);
const mockedGetSession = vi.mocked(getValidAdminSession);

function mockReqResNext(overrides?: {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  user?: unknown;
}) {
  const headers = overrides?.headers ?? {};
  const req = {
    headers,
    cookies: overrides?.cookies ?? {},
    user: overrides?.user,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as unknown as Request;

  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) { res.statusCode = code; return res; },
    json(data: unknown) { res.body = data; return res; },
  } as { statusCode: number; body: unknown } & Response;

  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
}

const VALID_PAYLOAD = {
  id: "user-1",
  email: "alice@test.com",
  role: "employee" as const,
  departmentId: "dept-1",
  managerId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireAuth", () => {
  it("returns 401 when no token in header or cookie", () => {
    const { req, res, next } = mockReqResNext();
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is invalid", () => {
    mockedVerify.mockReturnValue(null);
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer bad-token" },
    });
    requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("populates req.user on valid Bearer token", () => {
    mockedVerify.mockReturnValue(VALID_PAYLOAD);
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer good-token" },
    });
    requireAuth(req, res, next);
    expect(req.user).toEqual(VALID_PAYLOAD);
    expect(next).toHaveBeenCalledOnce();
  });

  it("reads token from cookie when no Authorization header", () => {
    mockedVerify.mockReturnValue(VALID_PAYLOAD);
    const { req, res, next } = mockReqResNext({
      cookies: { token: "cookie-token" },
    });
    requireAuth(req, res, next);
    expect(mockedVerify).toHaveBeenCalledWith("cookie-token");
    expect(req.user).toEqual(VALID_PAYLOAD);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireRole", () => {
  it("passes for matching role", () => {
    const { req, res, next } = mockReqResNext({
      user: { ...VALID_PAYLOAD, role: "manager" },
    });
    req.user = { ...VALID_PAYLOAD, role: "manager" };
    requireRole("manager")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 for mismatched role", () => {
    const { req, res, next } = mockReqResNext();
    req.user = { ...VALID_PAYLOAD, role: "employee" };
    requireRole("manager")(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("passes when user has any of multiple allowed roles", () => {
    const { req, res, next } = mockReqResNext();
    req.user = { ...VALID_PAYLOAD, role: "employee" };
    requireRole("employee", "manager")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 403 when req.user is undefined", () => {
    const { req, res, next } = mockReqResNext();
    requireRole("manager")(req, res, next);
    expect(res.statusCode).toBe(403);
  });
});

describe("requireAdmin", () => {
  it("returns 401 when no session in header or cookie", async () => {
    const { req, res, next } = mockReqResNext();
    await requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when session is invalid", async () => {
    mockedGetSession.mockResolvedValue(null);
    const { req, res, next } = mockReqResNext({
      headers: { "x-admin-session": "bad-session" },
    });
    await requireAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
  });

  it("populates req.adminId on valid session", async () => {
    mockedGetSession.mockResolvedValue({
      adminId: "admin-1",
      username: "admin",
      createdAt: Date.now(),
    });
    const { req, res, next } = mockReqResNext({
      headers: { "x-admin-session": "valid-session" },
    });
    await requireAdmin(req, res, next);
    expect(req.adminId).toBe("admin-1");
    expect(req.adminUsername).toBe("admin");
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("requireAuthOrAdmin", () => {
  it("passes with valid admin session", async () => {
    mockedGetSession.mockResolvedValue({
      adminId: "admin-1",
      username: "admin",
      createdAt: Date.now(),
    });
    const { req, res, next } = mockReqResNext({
      headers: { "x-admin-session": "valid" },
    });
    await requireAuthOrAdmin(req, res, next);
    expect(req.adminId).toBe("admin-1");
    expect(next).toHaveBeenCalledOnce();
  });

  it("passes with valid user JWT when no admin session", async () => {
    mockedGetSession.mockResolvedValue(null);
    mockedVerify.mockReturnValue(VALID_PAYLOAD);
    const { req, res, next } = mockReqResNext({
      headers: { authorization: "Bearer good" },
    });
    await requireAuthOrAdmin(req, res, next);
    expect(req.user).toEqual(VALID_PAYLOAD);
    expect(next).toHaveBeenCalledOnce();
  });

  it("returns 401 when neither admin nor user auth present", async () => {
    mockedGetSession.mockResolvedValue(null);
    const { req, res, next } = mockReqResNext();
    await requireAuthOrAdmin(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });
});
