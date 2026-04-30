import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth/session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Server-side fetch to apps/server. Reads the JWT from the httpOnly cookie set
 * by /api/auth/login, and forwards it as `Authorization: Bearer <token>` —
 * which is what the server's `requireAuth` middleware expects.
 *
 * Use this in Server Components and Server Actions only.
 */
export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  const headers = new Headers(init.headers);
  if (token && !headers.has("authorization")) {
    headers.set("authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  return fetch(url, { ...init, headers, cache: "no-store" });
}

export async function apiFetchJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new ApiError(res.status, message || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}
