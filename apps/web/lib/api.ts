import type { ZodTypeAny, z } from "zod";
import { ApiResponseError } from "@workspace/api-contracts";

/**
 * Browser-facing API base URL. Empty string → same origin, requests go to
 * /api/* and are proxied to the API server by next.config.ts rewrites.
 * Server-side code should import API_URL from utils/auth/server instead.
 */
export const PUBLIC_API_URL = "";
const LOCALE_COOKIE = "huyouan-locale";

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  baseUrl?: string;
}

/**
 * Typed fetch wrapper.
 *
 *   const data = await apiFetch("/api/events", eventListResponseSchema)
 *
 * - Throws `ApiResponseError` on non-2xx.
 * - Parses the response with the provided Zod schema (runtime safety).
 * - Default `credentials: "include"` so the cookie is sent cross-origin.
 */
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
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      details?: unknown;
    };
    throw new ApiResponseError(
      errBody.error ?? res.statusText,
      res.status,
      errBody.code,
      errBody.details,
    );
  }
  const data = await res.json();
  return schema.parse(data) as z.infer<S>;
}

export { ApiResponseError };

function browserLocaleHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const locale = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return locale ? { "x-locale": decodeURIComponent(locale) } : {};
}
