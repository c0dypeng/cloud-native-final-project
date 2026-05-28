import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockDb, mockBroadcastAll, mockCacheDel } = vi.hoisted(() => {
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
    mockBroadcastAll: vi.fn(),
    mockCacheDel: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../lib/db.js", () => ({ db: mockDb }));
vi.mock("../lib/sse.js", () => ({ broadcastAll: mockBroadcastAll }));
vi.mock("../lib/redis.js", () => ({
  cacheDel: mockCacheDel,
  statsCacheKeys: (id: string) => [`stats:${id}:zh-TW`, `stats:${id}:en`, `stats:${id}:ja`],
}));
vi.mock("../lib/locale.js", () => ({
  getRequestLocale: () => "zh-TW",
}));

import { getEvent, createEvent, closeEvent } from "./events.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    adminId: undefined,
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
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDb._resolveValue = [];
});

describe("getEvent", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "not-a-uuid" } });
    const res = mockRes();
    await getEvent(req, res);
    expect(res.statusCode).toBe(400);
  });

});

describe("createEvent", () => {
  it("returns 400 on invalid body", async () => {
    const req = mockReq({ body: {}, adminId: "admin-1" });
    const res = mockRes();
    await createEvent(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 201 and broadcasts SSE on success", async () => {
    const created = {
      id: "e1", title: "Fire Drill", description: null,
      type: "drill" as const, status: "active" as const,
      createdBy: "admin-1", createdAt: new Date(), closedAt: null,
    };
    mockDb._resolveValue = [created];
    const req = mockReq({
      body: { title: "Fire Drill", type: "drill" },
      adminId: "admin-1",
    });
    const res = mockRes();
    await createEvent(req, res);
    expect(res.statusCode).toBe(201);
    expect(mockBroadcastAll).toHaveBeenCalledOnce();
    expect(mockBroadcastAll.mock.calls[0]![0].type).toBe("event_created");
  });
});

describe("closeEvent", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" } });
    const res = mockRes();
    await closeEvent(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 404 when event not found", async () => {
    mockDb._resolveValue = [];
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await closeEvent(req, res);
    expect(res.statusCode).toBe(404);
  });

  it("returns 409 when event already closed", async () => {
    mockDb._resolveValue = [{ id: "e1", status: "closed" }];
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await closeEvent(req, res);
    expect(res.statusCode).toBe(409);
  });

  it("closes event, invalidates cache, and broadcasts SSE", async () => {
    const closedEvent = {
      id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      title: "Quake", description: null, type: "earthquake" as const,
      status: "closed" as const, createdBy: "admin-1",
      createdAt: new Date(), closedAt: new Date(),
    };
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown[]) => void) => {
      callCount++;
      if (callCount === 1) resolve([{ id: closedEvent.id, status: "active" }]);
      else resolve([closedEvent]);
    };
    const req = mockReq({ params: { id: closedEvent.id } });
    const res = mockRes();
    await closeEvent(req, res);
    expect(res.statusCode).toBe(200);
    expect(mockCacheDel).toHaveBeenCalledOnce();
    expect(mockBroadcastAll).toHaveBeenCalledOnce();
    expect(mockBroadcastAll.mock.calls[0]![0].type).toBe("event_closed");
  });
});
