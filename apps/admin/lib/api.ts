import type { ZodTypeAny, z } from "zod";
import { ApiResponseError } from "@workspace/api-contracts";
import { defaultLocale, LOCALE_COOKIE } from "@/i18n/config";

export const PUBLIC_API_URL = "";

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  baseUrl?: string;
}

export async function apiFetch<S extends ZodTypeAny>(
  endpoint: string,
  schema: S,
  options?: ApiFetchOptions,
): Promise<z.infer<S>> {
  const { body, baseUrl, headers, ...rest } = options ?? {};
  const url = `${baseUrl ?? PUBLIC_API_URL}${endpoint}`;
  const init: RequestInit = {
    credentials: "include",
    ...rest,
    headers: {
      "content-type": "application/json",
      ...browserLocaleHeader(),
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      details?: unknown;
    };
    throw new ApiResponseError(
      err.error ?? res.statusText,
      res.status,
      err.code,
      err.details,
    );
  }
  const data = await res.json();
  return schema.parse(data) as z.infer<S>;
}

export { ApiResponseError };

function browserLocaleHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const cookieLocale = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  // Fall back to the app's default locale (what next-intl renders when no
  // cookie is set) instead of letting the backend guess from Accept-Language —
  // otherwise server-localized data (e.g. department names) comes back in the
  // browser's language while the UI is in the default locale.
  const locale = cookieLocale
    ? decodeURIComponent(cookieLocale)
    : defaultLocale;
  return { "x-locale": locale };
}
