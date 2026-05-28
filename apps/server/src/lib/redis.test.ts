import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockRedisInstance } = vi.hoisted(() => {
  const mockRedisInstance = {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    multi: vi.fn(),
    on: vi.fn(),
  };
  return { mockRedisInstance };
});

vi.mock("ioredis", () => ({
  Redis: vi.fn().mockImplementation(() => mockRedisInstance),
}));

vi.mock("./logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

import {
  cacheGet,
  cacheSet,
  cacheDel,
  statsCacheKey,
  statsCacheKeys,
  acquireLock,
  reminderCounterKey,
} from "./redis.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("statsCacheKey", () => {
  it("returns correct format with locale", () => {
    expect(statsCacheKey("event-1", "en")).toBe("stats:event-1:en");
  });

  it("defaults to zh-TW", () => {
    expect(statsCacheKey("event-1")).toBe("stats:event-1:zh-TW");
  });
});

describe("statsCacheKeys", () => {
  it("returns 3 locale variants", () => {
    const keys = statsCacheKeys("event-1");
    expect(keys).toHaveLength(3);
    expect(keys).toContain("stats:event-1:zh-TW");
    expect(keys).toContain("stats:event-1:en");
    expect(keys).toContain("stats:event-1:ja");
  });
});

describe("reminderCounterKey", () => {
  it("returns correct format", () => {
    expect(reminderCounterKey("event-1", "user-1")).toBe(
      "reminder:event-1:user-1",
    );
  });
});

describe("cacheGet", () => {
  it("returns null when redis returns null", async () => {
    mockRedisInstance.get.mockResolvedValue(null);
    const result = await cacheGet("missing-key");
    expect(result).toBeNull();
  });

  it("returns parsed JSON when redis has data", async () => {
    mockRedisInstance.get.mockResolvedValue('{"count":42}');
    const result = await cacheGet<{ count: number }>("some-key");
    expect(result).toEqual({ count: 42 });
  });

  it("returns null on redis error", async () => {
    mockRedisInstance.get.mockRejectedValue(new Error("connection lost"));
    const result = await cacheGet("err-key");
    expect(result).toBeNull();
  });
});

describe("cacheSet", () => {
  it("calls redis.set with EX and TTL", async () => {
    mockRedisInstance.set.mockResolvedValue("OK");
    await cacheSet("key", { data: true }, 15);
    expect(mockRedisInstance.set).toHaveBeenCalledWith(
      "key",
      '{"data":true}',
      "EX",
      15,
    );
  });
});

describe("cacheDel", () => {
  it("calls redis.del with all keys", async () => {
    mockRedisInstance.del.mockResolvedValue(2);
    await cacheDel("k1", "k2");
    expect(mockRedisInstance.del).toHaveBeenCalledWith("k1", "k2");
  });

  it("does nothing for empty keys array", async () => {
    await cacheDel();
    expect(mockRedisInstance.del).not.toHaveBeenCalled();
  });
});

describe("acquireLock", () => {
  it("returns true when SET NX returns OK", async () => {
    mockRedisInstance.set.mockResolvedValue("OK");
    const acquired = await acquireLock("lock:test", 60);
    expect(acquired).toBe(true);
  });

  it("returns false when SET NX returns null", async () => {
    mockRedisInstance.set.mockResolvedValue(null);
    const acquired = await acquireLock("lock:test", 60);
    expect(acquired).toBe(false);
  });

  it("returns false on redis error", async () => {
    mockRedisInstance.set.mockRejectedValue(new Error("down"));
    const acquired = await acquireLock("lock:test", 60);
    expect(acquired).toBe(false);
  });
});
