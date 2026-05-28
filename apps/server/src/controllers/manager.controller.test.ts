import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockGetSubordinates, mockDb } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: any = { _resolveValue: [] as unknown[] };
  const methods = ["select", "from", "where", "leftJoin", "orderBy"];
  for (const m of methods) {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  }
  chainable.then = (resolve: (v: unknown[]) => void) =>
    resolve(chainable._resolveValue as unknown[]);

  return {
    mockGetSubordinates: vi.fn(),
    mockDb: chainable as { _resolveValue: unknown[]; then: unknown; [k: string]: unknown },
  };
});

vi.mock("../lib/team.js", () => ({
  getSubordinates: mockGetSubordinates,
}));
vi.mock("../lib/db.js", () => ({ db: mockDb }));
vi.mock("../lib/locale.js", () => ({
  getRequestLocale: () => "zh-TW",
}));

import { getTeam, getTeamStatus } from "./manager.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    headers: {},
    cookies: {},
    user: undefined,
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
  mockDb._resolveValue = [];
});

describe("getTeam", () => {
  it("returns 403 when req.user is missing", async () => {
    const req = mockReq();
    const res = mockRes();
    await getTeam(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("returns 403 when role is employee", async () => {
    const req = mockReq({
      user: { id: "u1", email: "e@t.com", role: "employee" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getTeam(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("returns subordinates for manager", async () => {
    const members = [
      { id: "u2", name: "Alice", email: "a@t.com", depth: 1 },
    ];
    mockGetSubordinates.mockResolvedValue(members);
    const req = mockReq({
      user: { id: "m1", email: "m@t.com", role: "manager" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getTeam(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { members: unknown[] }).members).toEqual(members);
  });
});

describe("getTeamStatus", () => {
  it("returns 403 when not a manager", async () => {
    const req = mockReq({ params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await getTeamStatus(req, res);
    expect(res.statusCode).toBe(403);
  });

  it("returns 400 on invalid eventId", async () => {
    const req = mockReq({
      params: { eventId: "bad" },
      user: { id: "m1", email: "m@t.com", role: "manager" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getTeamStatus(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns empty members when manager has no subordinates", async () => {
    mockGetSubordinates.mockResolvedValue([]);
    const req = mockReq({
      params: { eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      user: { id: "m1", email: "m@t.com", role: "manager" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    await getTeamStatus(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as { members: unknown[] }).members).toEqual([]);
  });
});
