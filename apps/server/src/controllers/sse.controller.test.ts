import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response } from "express";

const { mockRegister } = vi.hoisted(() => ({
  mockRegister: vi.fn(),
}));

vi.mock("../lib/sse.js", () => ({
  register: mockRegister,
}));

import { sseHandler } from "./sse.controller.js";

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    user: undefined,
    adminId: undefined,
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

describe("sseHandler", () => {
  it("registers admin connection when adminId is present", () => {
    const req = mockReq({ adminId: "admin-1" });
    const res = mockRes();
    sseHandler(req, res);
    expect(mockRegister).toHaveBeenCalledWith(res, {
      adminId: "admin-1",
      role: "admin",
    });
  });

  it("registers user connection when user is present", () => {
    const req = mockReq({
      user: { id: "u1", email: "a@t.com", role: "employee" as const, departmentId: null, managerId: null },
    });
    const res = mockRes();
    sseHandler(req, res);
    expect(mockRegister).toHaveBeenCalledWith(res, {
      userId: "u1",
      role: "employee",
    });
  });

  it("returns 401 when neither admin nor user is present", () => {
    const req = mockReq();
    const res = mockRes();
    sseHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(mockRegister).not.toHaveBeenCalled();
  });
});
