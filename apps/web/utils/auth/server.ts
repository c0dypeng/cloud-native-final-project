import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { jwtVerify } from "jose";

export const COOKIE_NAME = "token";

export interface CurrentUser {
  id: string;
  email: string;
  role: "employee" | "manager";
  departmentId: string | null;
  managerId: string | null;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in the web app environment");
  }
  return new TextEncoder().encode(secret);
}

export const getToken = cache(async (): Promise<string | null> => {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
});

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getToken();
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

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}
