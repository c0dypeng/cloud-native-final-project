import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockDb } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chainable: any = { _resolveValue: [] as unknown[] };
  const methods = [
    "select", "from", "where", "limit", "insert", "values",
    "returning", "update", "set", "delete", "leftJoin", "orderBy",
    "groupBy",
  ];
  for (const m of methods) {
    chainable[m] = vi.fn().mockReturnValue(chainable);
  }
  chainable.then = (resolve: (v: unknown[]) => void) =>
    resolve(chainable._resolveValue as unknown[]);

  return { mockDb: chainable as { _resolveValue: unknown[]; then: unknown; [k: string]: unknown } };
});

vi.mock("../lib/db.js", () => ({ db: mockDb }));
vi.mock("../lib/locale.js", () => ({
  getRequestLocale: () => "zh-TW",
}));

import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "./departments.controller.js";

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

describe("createDepartment", () => {
  it("returns 400 on invalid body", async () => {
    const req = mockReq({ body: {} });
    const res = mockRes();
    await createDepartment(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 201 on success", async () => {
    mockDb._resolveValue = [{
      id: "d1", name: "Engineering", parentId: null,
      createdAt: new Date(),
    }];
    const req = mockReq({ body: { name: "Engineering" } });
    const res = mockRes();
    await createDepartment(req, res);
    expect(res.statusCode).toBe(201);
    expect(
      (res.body as { department: { name: string } }).department.name,
    ).toBe("Engineering");
  });
});

describe("updateDepartment", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" }, body: { name: "New" } });
    const res = mockRes();
    await updateDepartment(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("rejects self-parent (parentId === id)", async () => {
    const id = "a1b2c3d4-e5f6-4890-abcd-ef1234567890";
    const req = mockReq({ params: { id }, body: { parentId: id } });
    const res = mockRes();
    await updateDepartment(req, res);
    expect(res.statusCode).toBe(400);
    expect((res.body as Record<string, unknown>).error).toContain("own parent");
  });

  it("returns 404 when department not found", async () => {
    mockDb._resolveValue = [];
    const req = mockReq({
      params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" },
      body: { name: "Updated" },
    });
    const res = mockRes();
    await updateDepartment(req, res);
    expect(res.statusCode).toBe(404);
  });
});

describe("deleteDepartment", () => {
  it("returns 400 on invalid UUID", async () => {
    const req = mockReq({ params: { id: "bad" } });
    const res = mockRes();
    await deleteDepartment(req, res);
    expect(res.statusCode).toBe(400);
  });

  it("returns 409 when department has users or children", async () => {
    let callCount = 0;
    mockDb.then = (resolve: (v: unknown[]) => void) => {
      callCount++;
      if (callCount === 1) resolve([{ count: 3 }]);
      else resolve([{ count: 0 }]);
    };
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await deleteDepartment(req, res);
    expect(res.statusCode).toBe(409);
    expect((res.body as { details: { userCount: number } }).details.userCount).toBe(3);
  });

  it("returns ok when department is empty", async () => {
    mockDb.then = (resolve: (v: unknown[]) => void) => {
      resolve([{ count: 0 }]);
    };
    const req = mockReq({ params: { id: "a1b2c3d4-e5f6-4890-abcd-ef1234567890" } });
    const res = mockRes();
    await deleteDepartment(req, res);
    expect(res.statusCode).toBe(200);
    expect((res.body as Record<string, unknown>).ok).toBe(true);
  });
});
