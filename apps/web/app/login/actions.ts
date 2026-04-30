"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME } from "@/lib/auth/session";
import { validateEmail, validatePassword } from "@/lib/validation";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const IS_PROD = process.env.NODE_ENV === "production";

export interface LoginFormState {
  error?: string;
  email?: string;
}

export async function loginAction(
  _prev: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const rawEmail = formData.get("email");
  const rawPassword = formData.get("password");
  const redirectTo = (formData.get("redirect") as string) || "/dashboard";

  let email: string;
  try {
    email = validateEmail(rawEmail as string | null);
    validatePassword(rawPassword as string | null);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "輸入格式不正確",
      email: typeof rawEmail === "string" ? rawEmail : undefined,
    };
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: rawPassword }),
      cache: "no-store",
    });
  } catch {
    return { error: "無法連線到伺服器，請稍後再試", email };
  }

  if (!res.ok) {
    return { error: "電子郵件或密碼錯誤", email };
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    return { error: "登入失敗，請稍後再試", email };
  }

  (await cookies()).set(COOKIE_NAME, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
    maxAge: 8 * 60 * 60, // 8h
  });

  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function logoutAction() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (token) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }
  (await cookies()).delete(COOKIE_NAME);
  redirect("/login");
}
