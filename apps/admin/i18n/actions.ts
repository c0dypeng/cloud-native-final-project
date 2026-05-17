"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { locales, LOCALE_COOKIE, type Locale } from "./config";

export async function setLocaleAction(formData: FormData): Promise<void> {
  const next = String(formData.get("locale") ?? "");
  if (!locales.includes(next as Locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, next, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
