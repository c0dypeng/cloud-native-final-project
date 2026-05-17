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

beforeAll(async () => {
  ({ app } = await import("../../src/app.js"));
});

beforeEach(async () => {
  seed = await resetAndSeed();
  employeeToken = await login(seed.employee.email);
  managerToken = await login(seed.manager.email);
  const adminLoginRes = await request(app)
    .post("/api/admin/auth/login")
    .send({ username: seed.admin.username, password: TEST_PASSWORD });
  adminSession = adminLoginRes.body.sessionId as string;
});

describe("GET /api/events/:id/stats", () => {
  it("counts safe/need_help/notReported correctly", async () => {
    // Initial: nobody reported → 3 users counted as not_reported
    const initial = await request(app)
      .get(`/api/events/${seed.event.id}/stats`)
      .set("x-admin-session", adminSession);
    expect(initial.status).toBe(200);
    expect(initial.body.overall.total).toBe(3);
    expect(initial.body.overall.safe).toBe(0);
    expect(initial.body.overall.needHelp).toBe(0);
    expect(initial.body.overall.notReported).toBe(3);

    await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "safe" });

    await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${managerToken}`)
      .send({ status: "need_help", message: "trapped" });

    // Bypass the 3s cache by hitting a slightly different read path:
    // use the unreported list which doesn't cache.
    const unreported = await request(app)
      .get(`/api/events/${seed.event.id}/unreported`)
      .set("x-admin-session", adminSession);
    expect(unreported.status).toBe(200);
    expect(unreported.body.users).toHaveLength(1);
    expect(unreported.body.users[0].id).toBe(seed.ceo.id);
  });

  it("groups by department", async () => {
    const stats = await request(app)
      .get(`/api/events/${seed.event.id}/stats`)
      .set("x-admin-session", adminSession);
    expect(stats.body.byDepartment.length).toBeGreaterThan(0);
    const dept = stats.body.byDepartment.find(
      (d: { departmentId: string }) => d.departmentId === seed.childDept.id,
    );
    expect(dept).toBeDefined();
    expect(dept.total).toBe(2); // manager + employee in child dept
  });
});

describe("GET /api/manager/team", () => {
  it("returns the recursive subordinate tree", async () => {
    const res = await request(app)
      .get("/api/manager/team")
      .set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].id).toBe(seed.employee.id);
    expect(res.body.members[0].depth).toBe(1);
  });

  it("returns multi-level subordinates for CEO", async () => {
    const ceoToken = await login(seed.ceo.email);
    const res = await request(app)
      .get("/api/manager/team")
      .set("Authorization", `Bearer ${ceoToken}`);
    expect(res.status).toBe(200);
    // CEO has manager (depth 1) and the manager has employee (depth 2)
    const ids = res.body.members.map((m: { id: string }) => m.id);
    expect(ids).toContain(seed.manager.id);
    expect(ids).toContain(seed.employee.id);
    const employeeRow = res.body.members.find(
      (m: { id: string }) => m.id === seed.employee.id,
    );
    expect(employeeRow.depth).toBe(2);
  });

  it("forbids non-managers", async () => {
    const res = await request(app)
      .get("/api/manager/team")
      .set("Authorization", `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/manager/team/:eventId/status", () => {
  it("joins team with report status for the event", async () => {
    await request(app)
      .post(`/api/events/${seed.event.id}/report`)
      .set("Authorization", `Bearer ${employeeToken}`)
      .send({ status: "safe" });

    const res = await request(app)
      .get(`/api/manager/team/${seed.event.id}/status`)
      .set("Authorization", `Bearer ${managerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.members[0].id).toBe(seed.employee.id);
    expect(res.body.members[0].reportStatus).toBe("safe");
    expect(res.body.members[0].reportedAt).toBeTruthy();
  });
});
