import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRedis } = vi.hoisted(() => {
  const mockRedis = {
    set: vi.fn().mockResolvedValue("OK"),
    get: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  };
  return { mockRedis };
});

vi.mock("./redis.js", () => ({
  redis: mockRedis,
}));

vi.mock("./logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  createAdminSession,
  getValidAdminSession,
  deleteAdminSession,
  ADMIN_SESSION_TTL_MS,
} from "./sessions.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createAdminSession", () => {
  it("returns a UUID-format string", async () => {
    const sessionId = await createAdminSession("admin-1", "admin");
    expect(sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("calls redis.set with correct TTL", async () => {
    await createAdminSession("admin-1", "admin");
    expect(mockRedis.set).toHaveBeenCalledOnce();
    const args = mockRedis.set.mock.calls[0]!;
    expect(args[0]).toMatch(/^admin-session:/);
    expect(args[2]).toBe("EX");
    expect(args[3]).toBe(86400);
  });

  it("stores session in local fallback", async () => {
    const sessionId = await createAdminSession("admin-1", "admin");
    mockRedis.get.mockResolvedValue(null);
    const session = await getValidAdminSession(sessionId);
    expect(session).not.toBeNull();
    expect(session!.adminId).toBe("admin-1");
    expect(session!.username).toBe("admin");
  });
});

describe("getValidAdminSession", () => {
  it("returns null for unknown session ID", async () => {
    const result = await getValidAdminSession("nonexistent-session");
    expect(result).toBeNull();
  });

  it("returns session from Redis when available", async () => {
    const session = { createdAt: Date.now(), adminId: "a1", username: "admin" };
    mockRedis.get.mockResolvedValue(JSON.stringify(session));
    const result = await getValidAdminSession("some-session");
    expect(result).not.toBeNull();
    expect(result!.adminId).toBe("a1");
  });

  it("returns null for expired Redis session", async () => {
    const expired = {
      createdAt: Date.now() - ADMIN_SESSION_TTL_MS - 1000,
      adminId: "a1",
      username: "admin",
    };
    mockRedis.get.mockResolvedValue(JSON.stringify(expired));
    const result = await getValidAdminSession("expired-session");
    expect(result).toBeNull();
  });
});

describe("deleteAdminSession", () => {
  it("removes session from local fallback", async () => {
    const sessionId = await createAdminSession("admin-1", "admin");
    await deleteAdminSession(sessionId);
    mockRedis.get.mockResolvedValue(null);
    const result = await getValidAdminSession(sessionId);
    expect(result).toBeNull();
  });

  it("calls redis.del", async () => {
    await deleteAdminSession("some-session");
    expect(mockRedis.del).toHaveBeenCalledOnce();
  });
});
