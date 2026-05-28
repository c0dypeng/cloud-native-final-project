import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Response } from "express";

const { mockSubscriber, mockPublisher, callCounter } = vi.hoisted(() => {
  const mockSubscriber = {
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  const mockPublisher = {
    publish: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  };
  const callCounter = { count: 0 };
  return { mockSubscriber, mockPublisher, callCounter };
});

vi.mock("ioredis", () => ({
  Redis: vi.fn().mockImplementation(() => {
    callCounter.count++;
    return callCounter.count <= 1 ? mockSubscriber : mockPublisher;
  }),
}));

vi.mock("./logger.js", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock("./metrics.js", () => ({
  sseActiveConnections: { inc: vi.fn(), dec: vi.fn() },
}));

import {
  register,
  broadcastAll,
  broadcastToOversight,
  sendToUser,
  sendToManagerChain,
  connectionCount,
} from "./sse.js";
import { sseActiveConnections } from "./metrics.js";

function fakeRes(): Response & {
  headers: Record<string, string>;
  chunks: string[];
  ended: boolean;
  closeHandler?: () => void;
} {
  const res = {
    headers: {} as Record<string, string>,
    chunks: [] as string[],
    ended: false,
    closeHandler: undefined as (() => void) | undefined,
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
    flushHeaders: vi.fn(),
    write(data: string) {
      res.chunks.push(data);
      return true;
    },
    end() {
      res.ended = true;
    },
    on(event: string, handler: () => void) {
      if (event === "close") res.closeHandler = handler;
    },
  };
  return res as unknown as Response & typeof res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("register", () => {
  it("sets SSE headers on response", () => {
    const res = fakeRes();
    const cleanup = register(res, { userId: "u1", role: "employee" });
    expect(res.headers["Content-Type"]).toBe("text/event-stream");
    expect(res.headers["Cache-Control"]).toBe("no-cache, no-transform");
    expect(res.headers["Connection"]).toBe("keep-alive");
    cleanup();
  });

  it("sends 'connected' event immediately", () => {
    const res = fakeRes();
    const cleanup = register(res, { userId: "u1", role: "employee" });
    const connected = res.chunks.find((c) => c.includes("connected"));
    expect(connected).toBeTruthy();
    cleanup();
  });

  it("increments sseActiveConnections", () => {
    const res = fakeRes();
    const cleanup = register(res, { userId: "u1", role: "employee" });
    expect(sseActiveConnections.inc).toHaveBeenCalled();
    cleanup();
  });

  it("decrements on close event", () => {
    const res = fakeRes();
    register(res, { userId: "u1", role: "employee" });
    if (res.closeHandler) res.closeHandler();
    expect(sseActiveConnections.dec).toHaveBeenCalled();
  });
});

describe("broadcast functions", () => {
  it("broadcastAll publishes to Redis channel", () => {
    broadcastAll({
      type: "event_created",
      eventId: "e1",
      title: "Quake",
      eventType: "earthquake",
      timestamp: new Date().toISOString(),
    });
    expect(mockPublisher.publish).toHaveBeenCalledOnce();
    const payload = JSON.parse(mockPublisher.publish.mock.calls[0]![1] as string);
    expect(payload.scope).toBe("all");
  });

  it("broadcastToOversight publishes with oversight scope", () => {
    broadcastToOversight({
      type: "report_submitted",
      eventId: "e1",
      userId: "u1",
      status: "safe",
      timestamp: new Date().toISOString(),
    });
    const payload = JSON.parse(mockPublisher.publish.mock.calls[0]![1] as string);
    expect(payload.scope).toBe("oversight");
  });

  it("sendToUser publishes with user scope and userId", () => {
    sendToUser("u1", {
      type: "reminder",
      eventId: "e1",
      eventTitle: "Quake",
      timestamp: new Date().toISOString(),
    });
    const payload = JSON.parse(mockPublisher.publish.mock.calls[0]![1] as string);
    expect(payload.scope).toBe("user");
    expect(payload.userId).toBe("u1");
  });

  it("sendToManagerChain publishes with managers scope", () => {
    sendToManagerChain(["m1", "m2"], {
      type: "need_help",
      eventId: "e1",
      userId: "u1",
      userName: "Alice",
      departmentName: "Eng",
      message: "help",
      timestamp: new Date().toISOString(),
    });
    const payload = JSON.parse(mockPublisher.publish.mock.calls[0]![1] as string);
    expect(payload.scope).toBe("managers");
    expect(payload.managerIds).toEqual(["m1", "m2"]);
  });
});

describe("connectionCount", () => {
  it("returns a non-negative number", () => {
    expect(connectionCount()).toBeGreaterThanOrEqual(0);
  });
});
