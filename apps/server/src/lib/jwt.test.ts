import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signToken, verifyToken, type JwtPayload } from "./jwt.js";

const SAMPLE_PAYLOAD: JwtPayload = {
  id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  email: "alice@example.com",
  role: "employee",
  departmentId: "d1d2d3d4-e5e6-7890-abcd-ef1234567890",
  managerId: "m1m2m3m4-e5e6-7890-abcd-ef1234567890",
};

describe("signToken", () => {
  it("returns a string JWT", () => {
    const token = signToken(SAMPLE_PAYLOAD);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("embeds payload fields in the token", () => {
    const token = signToken(SAMPLE_PAYLOAD);
    const decoded = jwt.decode(token) as Record<string, unknown>;
    expect(decoded.id).toBe(SAMPLE_PAYLOAD.id);
    expect(decoded.email).toBe(SAMPLE_PAYLOAD.email);
    expect(decoded.role).toBe(SAMPLE_PAYLOAD.role);
    expect(decoded.departmentId).toBe(SAMPLE_PAYLOAD.departmentId);
    expect(decoded.managerId).toBe(SAMPLE_PAYLOAD.managerId);
  });
});

describe("verifyToken", () => {
  it("round-trips with signToken", () => {
    const token = signToken(SAMPLE_PAYLOAD);
    const result = verifyToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(SAMPLE_PAYLOAD.id);
    expect(result!.email).toBe(SAMPLE_PAYLOAD.email);
    expect(result!.role).toBe(SAMPLE_PAYLOAD.role);
  });

  it("returns null for garbage string", () => {
    expect(verifyToken("not.a.jwt")).toBeNull();
  });

  it("returns null for tampered token", () => {
    const token = signToken(SAMPLE_PAYLOAD);
    const parts = token.split(".");
    parts[1] = Buffer.from('{"id":"hacked"}').toString("base64url");
    expect(verifyToken(parts.join("."))).toBeNull();
  });

  it("returns null for expired token", () => {
    const secret = process.env.JWT_SECRET!;
    const expired = jwt.sign(SAMPLE_PAYLOAD, secret, { expiresIn: "-1s" });
    expect(verifyToken(expired)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(verifyToken("")).toBeNull();
  });

  it("returns null for token signed with wrong secret", () => {
    const wrongToken = jwt.sign(SAMPLE_PAYLOAD, "wrong-secret-key-12345");
    expect(verifyToken(wrongToken)).toBeNull();
  });
});
