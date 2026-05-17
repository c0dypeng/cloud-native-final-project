import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { resetAndSeed, TEST_PASSWORD, type Seeded } from "../db-helper.js";

let app: Express;
let seed: Seeded;
let employeeToken: string;
let managerToken: string;
let adminSession: string;

async function login(email: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: TEST_PASSWORD });
  return res.body.token as string;
}

async function adminLogin(): Promise<string> {
  const res = await request(app)
    .post("/api/admin/auth/login")
    .send({ username: seed.admin.username, password: TEST_PASSWORD });
  return res.body.sessionId as string;
}

beforeAll(async () => {
  ({ app } = await import("../../src/app.js"));
});

beforeEach(async () => {
  seed = await resetAndSeed();
  employeeToken = await login(seed.employee.email);
  managerToken = await login(seed.manager.email);
  adminSession = await adminLogin();
});

describe("GET /api/events", () => {
  it("returns active events for employees", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].title).toBe("Test Earthquake");
  });

  it("returns events for admin (via cookie)", async () => {
    const res = await request(app)
      .get("/api/events")
      .set("Cookie", [`admin-session=${adminSession}`]);
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
  });

  it("rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/events/:id/report", () => {
  it("creates a 'safe' report for the employee", async () => {
    const res = await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "safe" });
    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe("safe");
    expect(res.body.report.userId).toBe(seed.employee.id);
  });

  it("upserts: a second submission updates instead of duplicating", async () => {
    await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "safe" });
    const second = await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "need_help", message: "stuck on the third floor" });
    expect(second.status).toBe(200);

    const list = await request(app)
      .get(`/api/events/${seed.event.id}/reports`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(list.status).toBe(200);
    const emp = list.body.reports.find(
      (r: { userId: string }) => r.userId === seed.employee.id,
    );
    expect(emp.status).toBe("need_help");
    expect(emp.message).toBe("stuck on the third floor");
  });

  it("rejects unknown event id", async () => {
    const res = await request(app)
      .post(`/api/events/00000000-0000-0000-0000-000000000000/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "safe" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/events (admin)", () => {
  it("creates a new event when admin session is valid", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("x-admin-session", adminSession)
      .send({ title: "Drill 2026", type: "drill" });
    expect(res.status).toBe(201);
    expect(res.body.event.title).toBe("Drill 2026");
    expect(res.body.event.type).toBe("drill");
  });

  it("rejects non-admin user", async () => {
    const res = await request(app)
      .post("/api/events")
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ title: "Bad", type: "fire" });
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/events/:id/close (admin)", () => {
  it("closes an active event", async () => {
    const res = await request(app)
      .patch(`/api/events/${seed.event.id}/close`)
      .set("x-admin-session", adminSession);
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe("closed");
    expect(res.body.event.closedAt).toBeTruthy();
  });

  it("409s if event already closed", async () => {
    await request(app)
      .patch(`/api/events/${seed.event.id}/close`)
      .set("x-admin-session", adminSession);
    const again = await request(app)
      .patch(`/api/events/${seed.event.id}/close`)
      .set("x-admin-session", adminSession);
    expect(again.status).toBe(409);
  });
});
