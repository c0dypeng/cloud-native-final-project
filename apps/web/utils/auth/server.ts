import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import {
  meResponseSchema,
  type UserPublic,
} from "@workspace/api-contracts";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
export const USER_COOKIE = "token";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(USER_COOKIE)?.value ?? null;
}

/**
 * Resolve the current user by calling /api/auth/me with the JWT cookie.
 * Returns `null` if the cookie is missing or the token is invalid.
 * Cached per-request via React.cache().
 */
export const getCurrentUser = cache(async (): Promise<UserPublic | null> => {
  const token = await getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      method: "GET",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parsed = meResponseSchema.safeParse(data);
    if (!parsed.success) return null;
    return parsed.data.user;
  } catch {
    return null;
  }
});

/**
 * Require an authenticated user in a server component. Redirects to /login
 * if not authenticated.
 */
export async function requireUser(): Promise<UserPublic> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Require a user with one of the specified roles. Redirects /dashboard
 * if not authorized.
 */
export async function requireRole(
  ...roles: Array<UserPublic["role"]>
): Promise<UserPublic> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/**
 * Common Authorization header helper for SSR fetches.
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { authorization: `Bearer ${token}` } : {};
}

export { API_URL };
