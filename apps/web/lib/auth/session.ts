import { cookies } from "next/headers";
import { cache } from "react";
import { jwtVerify } from "jose";
import { apiFetch } from "@/lib/api";

export const COOKIE_NAME = "token";

export interface SessionUser {
  id: string;
  email: string;
  role: "employee" | "manager";
  departmentId: string | null;
  managerId: string | null;
}

export interface CurrentUser extends SessionUser {
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in the web app environment");
  }
  return new TextEncoder().encode(secret);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as "employee" | "manager",
      departmentId: (payload.departmentId as string | null) ?? null,
      managerId: (payload.managerId as string | null) ?? null,
    };
  } catch {
    return null;
  }
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSession();
  if (!session) return null;

  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;

  const data = (await res.json()) as { user?: { name?: string } };
  return {
    ...session,
    name: data.user?.name ?? session.email,
  };
});
