import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { env } from "./env";

export const ADMIN_COOKIE = "admin-session";

export interface AdminSession {
  adminId: string;
  username: string;
}

/**
 * Validate the admin-session cookie against the API server.
 * Cached per-request via React.cache() so multiple components can
 * call this without extra round-trips.
 */
export const verifySession = cache(async (): Promise<AdminSession | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!sessionId) return null;

  try {
    const res = await fetch(`${env.apiUrl}/api/admin/auth/me`, {
      method: "GET",
      headers: { "x-admin-session": sessionId },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { admin: AdminSession };
    return data.admin;
  } catch {
    return null;
  }
});
