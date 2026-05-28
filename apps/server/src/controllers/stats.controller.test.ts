import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockCacheGet, mockCacheSet, mockStatsCacheKey, mockComputeStats, mockListUnreported, mockGetSubordinates } =
  vi.hoisted(() => ({
    mockCacheGet: vi.fn(),
    mockCacheSet: vi.fn().mockResolvedValue(undefined),
    mockStatsCacheKey: vi.fn((id: string, locale = "zh-TW") => `stats:${id}:${locale}`),
    mockComputeStats: vi.fn(),
    mockListUnreported: vi.fn(),
    mockGetSubordinates: vi.fn(),
  }));

vi.mock("../lib/redis.js", () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  statsCacheKey: mockStatsCacheKey,
}));
vi.mock("./reports.controller.js", () => ({
  computeEventStats: mockComputeStats,
  listUnreportedUsers: mockListUnreported,
}));
vi.mock("../lib/team.js", () => ({
  getSubordinates: mockGetSubordinates,
}));
vi.mock("../lib/metrics.js", () => ({
  statsCacheHits: { inc: vi.fn() },
  statsCacheMisses: { inc: vi.fn() },
}));
vi.mock("../lib/locale.js", () => ({
  getRequestLocale: () => "zh-TW",
}));

import { getStats, getUnreported } from "./stats.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
    adminId: undefined,
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
  } as { statusCode: number; body: unknown } & Response;
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getStats", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { eventId: "bad" } });
    const res = mockRes();
    await getStats(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns cached data on cache hit", async () => {
    const cached = { eventId: "e1", overall: { total: 10, safe: 8, needHelp: 1, notReported: 1 }, byDepartment: [], generatedAt: "2026-01-01T00:00:00Z" };
    mockCacheGet.mockResolvedValue(cached);
    const req = mockReq({ params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await getStats(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(cached);
    expect(mockComputeStats).not.toHaveBeenCalled();
  });

  it("computes fresh stats on cache miss", async () => {
    mockCacheGet.mockResolvedValue(null);
    mockComputeStats.mockResolvedValue({
      overall: { total: 5, safe: 3, needHelp: 1, notReported: 1 },
      byDepartment: [],
    });
    const req = mockReq({ params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await getStats(req, res);
    expect(res.statusCode).toBe(200);
    expect(mockComputeStats).toHaveBeenCalledOnce();
    expect(mockCacheSet).toHaveBeenCalledOnce();
  });
});

describe("getUnreported", () => {
  it("returns 401 for unauthenticated request", async () => {
    const req = mockReq({ params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await getUnreported(req, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns 403 for employee role", async () => {
    const req = mockReq({
      params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      user: { id: "u1", email: "e@t.com", role: "employee" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getUnreported(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("returns empty array for manager with no subordinates", async () => {
    mockGetSubordinates.mockResolvedValue([]);
    const req = mockReq({
      params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      user: { id: "m1", email: "m@t.com", role: "manager" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getUnreported(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { users: unknown[] }).users).toEqual([]);
  });

  it("returns unreported users for admin (no scope filter)", async () => {
    mockListUnreported.mockResolvedValue([{ id: "u1", name: "Alice" }]);
    const req = mockReq({
      params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      adminId: "admin-1",
    });
    const res = mockRes();
    await getUnreported(req, res);
    expect(res.statusCode).toBe(200);
    expect(mockListUnreported).toHaveBeenCalledOnce();
  });
});
