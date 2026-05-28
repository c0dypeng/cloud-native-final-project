import { describe, it, expect } from "vitest";
import {
  loginInputSchema,
  adminLoginInputSchema,
  eventCreateInputSchema,
  reportSubmitInputSchema,
  userCreateInputSchema,
  userListQuerySchema,
  deptCreateInputSchema,
  sseEventSchema,
} from "@workspace/api-contracts";

describe("loginInputSchema", () => {
  it("accepts valid email + password", () => {
    const result = loginInputSchema.safeParse({
      email: "alice@example.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty password", () => {
    const result = loginInputSchema.safeParse({
      email: "alice@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = loginInputSchema.safeParse({
      email: "not-an-email",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});

describe("adminLoginInputSchema", () => {
  it("rejects empty username", () => {
    const result = adminLoginInputSchema.safeParse({
      username: "",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});

describe("eventCreateInputSchema", () => {
  it("rejects title exceeding 200 chars", () => {
    const result = eventCreateInputSchema.safeParse({
      title: "x".repeat(201),
      type: "earthquake",
    });
    expect(result.success).toBe(false);
  });

  it("accepts all 6 event types", () => {
    const types = ["earthquake", "fire", "security", "accident", "drill", "other"];
    for (const type of types) {
      const result = eventCreateInputSchema.safeParse({ title: "Test", type });
      expect(result.success).toBe(true);
    }
  });

  it("rejects unknown event type", () => {
    const result = eventCreateInputSchema.safeParse({
      title: "Test",
      type: "tsunami",
    });
    expect(result.success).toBe(false);
  });
});

describe("reportSubmitInputSchema", () => {
  it("accepts 'safe'", () => {
    expect(reportSubmitInputSchema.safeParse({ status: "safe" }).success).toBe(true);
  });

  it("accepts 'need_help'", () => {
    expect(reportSubmitInputSchema.safeParse({ status: "need_help" }).success).toBe(true);
  });

  it("rejects 'not_reported' as input", () => {
    expect(
      reportSubmitInputSchema.safeParse({ status: "not_reported" }).success,
    ).toBe(false);
  });

  it("rejects message exceeding 500 chars", () => {
    const result = reportSubmitInputSchema.safeParse({
      status: "safe",
      message: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("userCreateInputSchema", () => {
  it("requires password >= 8 chars", () => {
    const result = userCreateInputSchema.safeParse({
      email: "a@b.com",
      name: "Alice",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = userCreateInputSchema.safeParse({
      email: "bad",
      name: "Alice",
      password: "longpassword",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid full input", () => {
    const result = userCreateInputSchema.safeParse({
      email: "alice@example.com",
      name: "Alice",
      password: "password123",
      role: "employee",
      departmentId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    });
    expect(result.success).toBe(true);
  });
});

describe("userListQuerySchema", () => {
  it("coerces limit/offset to numbers", () => {
    const result = userListQuerySchema.safeParse({ limit: "10", offset: "5" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(10);
    expect(result.data?.offset).toBe(5);
  });

  it("caps limit at 200", () => {
    const result = userListQuerySchema.safeParse({ limit: "300" });
    expect(result.success).toBe(false);
  });

  it("defaults limit to 50 and offset to 0", () => {
    const result = userListQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(50);
    expect(result.data?.offset).toBe(0);
  });
});

describe("deptCreateInputSchema", () => {
  it("rejects name exceeding 100 chars", () => {
    const result = deptCreateInputSchema.safeParse({
      name: "x".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name with optional parentId", () => {
    const result = deptCreateInputSchema.safeParse({
      name: "Engineering",
      parentId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
    });
    expect(result.success).toBe(true);
  });
});

describe("sseEventSchema", () => {
  it("validates 'connected' event type", () => {
    const result = sseEventSchema.safeParse({
      type: "connected",
      userId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      role: "employee",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("validates 'event_created' event type", () => {
    const result = sseEventSchema.safeParse({
      type: "event_created",
      eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      title: "Earthquake",
      eventType: "earthquake",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("validates 'need_help' event type", () => {
    const result = sseEventSchema.safeParse({
      type: "need_help",
      eventId: "a1b2c3d4-e5f6-4890-abcd-ef1234567890",
      userId: "b1b2c3d4-e5f6-4890-abcd-ef1234567890",
      userName: "Alice",
      departmentName: "Engineering",
      message: "stuck",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown event type", () => {
    const result = sseEventSchema.safeParse({
      type: "unknown_event",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
