"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./dal";
import { env } from "./env";

const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_MAX_AGE = 60 * 60 * 24; // 24h

export async function login(
  _prev: { error: string } | undefined,
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "missing" };
  }

  let sessionId: string;
  try {
    const res = await fetch(`${env.apiUrl}/api/admin/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });
    if (!res.ok) {
      return { error: "invalid" };
    }
    const data = (await res.json()) as { sessionId: string };
    sessionId = data.sessionId;
  } catch {
    return { error: "serverUnavailable" };
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, sessionId, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  revalidatePath("/", "layout");
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(ADMIN_COOKIE)?.value;
  cookieStore.delete(ADMIN_COOKIE);

  if (sessionId) {
    try {
      await fetch(`${env.apiUrl}/api/admin/auth/logout`, {
        method: "POST",
        headers: { "x-admin-session": sessionId },
        cache: "no-store",
      });
    } catch {
      // best-effort — cookie is already cleared client-side
    }
  }

  revalidatePath("/", "layout");
  redirect("/login");
}
