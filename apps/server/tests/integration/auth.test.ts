import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { resetAndSeed, TEST_PASSWORD, type Seeded } from "../db-helper.js";

let app: Express;
let seed: Seeded;

beforeAll(async () => {
  ({ app } = await import("../../src/app.js"));
});

beforeEach(async () => {
  seed = await resetAndSeed();
});

describe("POST /api/auth/login", () => {
  it("returns 200 + JWT for valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: seed.employee.email, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe(seed.employee.email);
    expect(res.body.user.role).toBe("employee");
    // httpOnly cookie set
    expect(res.headers["set-cookie"]?.join(";")).toMatch(/token=/);
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: seed.employee.email, password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@nope.com", password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  it("returns 400 when payload is missing", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without Authorization", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user with valid Bearer token", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: seed.manager.email, password: TEST_PASSWORD });
    const token = login.body.token as string;
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(seed.manager.email);
    expect(res.body.user.role).toBe("manager");
    // Must include `name` + `locale` so the web userPublicSchema parse succeeds
    expect(res.body.user.name).toBeTypeOf("string");
    expect(res.body.user.name.length).toBeGreaterThan(0);
    expect(res.body.user.locale).toBeTypeOf("string");
  });
});

describe("Admin auth", () => {
  it("logs admin in and exposes /api/admin/auth/me", async () => {
    const login = await request(app)
      .post("/api/admin/auth/login")
      .send({ username: seed.admin.username, password: TEST_PASSWORD });
    expect(login.status).toBe(200);
    const sessionId = login.body.sessionId as string;
    expect(sessionId).toBeTypeOf("string");

    const me = await request(app)
      .get("/api/admin/auth/me")
      .set("x-admin-session", sessionId);
    expect(me.status).toBe(200);
    expect(me.body.admin.username).toBe(seed.admin.username);

    const bad = await request(app)
      .get("/api/admin/auth/me")
      .set("x-admin-session", "not-a-real-uuid");
    expect(bad.status).toBe(401);
  });
});
