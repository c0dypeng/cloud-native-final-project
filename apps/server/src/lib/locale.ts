import type { Request } from "express";

export type SupportedLocale = "zh-TW" | "en";

const DEFAULT_LOCALE: SupportedLocale = "zh-TW";
const LOCALE_COOKIES = ["huyouan-locale", "huyouan-admin-locale"];

export function normalizeLocale(value: unknown): SupportedLocale {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const lower = value.toLowerCase();
  if (lower === "en" || lower.startsWith("en-")) return "en";
  if (lower === "zh-tw" || lower === "zh") return "zh-TW";
  return DEFAULT_LOCALE;
}

export function getRequestLocale(req: Request): SupportedLocale {
  const queryLocale = req.query.locale;
  if (typeof queryLocale === "string") return normalizeLocale(queryLocale);

  const headerLocale = req.get("x-locale");
  if (headerLocale) return normalizeLocale(headerLocale);

  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  for (const cookieName of LOCALE_COOKIES) {
    const cookieLocale = cookies?.[cookieName];
    if (cookieLocale) return normalizeLocale(cookieLocale);
  }

  return normalizeLocale(req.get("accept-language"));
}
