import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { resetAndSeed, TEST_PASSWORD, type Seeded } from "../db-helper.js";

let app: Express;
let seed: Seeded;
let session: string;

const MISSING_UUID = "00000000-0000-0000-0000-000000000000";

beforeAll(async () => {
  ({ app } = await import("../../src/app.js"));
});

beforeEach(async () => {
  seed = await resetAndSeed();
  const login = await request(app)
    .post("/api/admin/auth/login")
    .send({ username: seed.admin.username, password: TEST_PASSWORD });
  session = login.body.sessionId as string;
});

// Regression: these constraint violations used to escape createUser/
// createDepartment as unhandled rejections and crash the process. The real
// Postgres errors (wrapped by drizzle) must be classified into clean 4xx
// responses — something the mocked unit tests could not catch.
describe("Admin user create — constraint handling", () => {
  it("returns 409 for a duplicate email (no crash)", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("x-admin-session", session)
      .send({
        email: seed.employee.email, // already seeded
        name: "Dup",
        password: "password123",
        role: "employee",
      });
    expect(res.status).toBe(409);
  });

  it("returns 400 for a non-existent department FK", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("x-admin-session", session)
      .send({
        email: "fresh-dept-fk@test.local",
        name: "X",
        password: "password123",
        role: "employee",
        departmentId: MISSING_UUID,
      });
    expect(res.status).toBe(400);
  });

  it("returns 201 for a valid new user", async () => {
    const res = await request(app)
      .post("/api/users")
      .set("x-admin-session", session)
      .send({
        email: "brand-new@test.local",
        name: "Brand New",
        password: "password123",
        role: "employee",
        departmentId: seed.childDept.id,
      });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("brand-new@test.local");
  });

  it("returns 400 when updating a user's managerId to a non-existent user", async () => {
    const res = await request(app)
      .patch(`/api/users/${seed.employee.id}`)
      .set("x-admin-session", session)
      .send({ managerId: MISSING_UUID });
    expect(res.status).toBe(400);
  });

  it("returns 400 when a user is set as their own manager", async () => {
    const res = await request(app)
      .patch(`/api/users/${seed.employee.id}`)
      .set("x-admin-session", session)
      .send({ managerId: seed.employee.id });
    expect(res.status).toBe(400);
  });
});

describe("Admin department create — constraint handling", () => {
  it("returns 400 for a non-existent parent FK (no crash)", async () => {
    const res = await request(app)
      .post("/api/departments")
      .set("x-admin-session", session)
      .send({ name: "Orphan", parentId: MISSING_UUID });
    expect(res.status).toBe(400);
  });

  it("returns 201 for a valid department", async () => {
    const res = await request(app)
      .post("/api/departments")
      .set("x-admin-session", session)
      .send({ name: "QA New Dept", parentId: seed.topDept.id });
    expect(res.status).toBe(201);
  });
});
