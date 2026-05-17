"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { loginInputSchema } from "@workspace/api-contracts";
import { API_URL, USER_COOKIE } from "./server";

const IS_PROD = process.env.NODE_ENV === "production";
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8h matches JWT_EXPIRES_IN

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const t = await getTranslations("login");
  const parsed = loginInputSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { error: t("missingCredentials") };
  }

  let token: string;
  try {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    if (!res.ok) {
      return { error: t("invalidCredentials") };
    }
    const data = (await res.json()) as { token: string };
    token = data.token;
  } catch {
    return { error: t("serverUnavailable") };
  }

  const store = await cookies();
  store.set(USER_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  const from = String(formData.get("from") ?? "").trim();
  const target = from.startsWith("/dashboard") ? from : "/dashboard";

  revalidatePath("/", "layout");
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(USER_COOKIE)?.value;
  store.delete(USER_COOKIE);
  if (token) {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
