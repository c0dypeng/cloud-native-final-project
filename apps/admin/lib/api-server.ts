import "server-only";
import { cookies } from "next/headers";
import {
  eventListResponseSchema,
  eventResponseSchema,
  reportListResponseSchema,
  statsResponseSchema,
  unreportedResponseSchema,
  deptListResponseSchema,
  deptTreeResponseSchema,
  userListResponseSchema,
} from "@workspace/api-contracts";
import { apiFetch } from "./api";
import { env } from "./env";
import { ADMIN_COOKIE } from "./dal";
import { LOCALE_COOKIE } from "@/i18n/config";

async function adminHeaders(): Promise<Record<string, string>> {
  const store = await cookies();
  const id = store.get(ADMIN_COOKIE)?.value;
  const locale = store.get(LOCALE_COOKIE)?.value;
  return {
    ...(id ? { "x-admin-session": id } : {}),
    ...(locale ? { "x-locale": locale } : {}),
  };
}

async function svrCall<S extends Parameters<typeof apiFetch>[1]>(
  endpoint: string,
  schema: S,
  init?: Omit<Parameters<typeof apiFetch>[2], "baseUrl" | "headers" | "credentials">,
) {
  return apiFetch(endpoint, schema, {
    ...(init ?? {}),
    baseUrl: env.apiUrl,
    headers: await adminHeaders(),
    credentials: undefined,
  });
}

export const apiAdminServer = {
  events: {
    list: () => svrCall("/api/events", eventListResponseSchema),
    get: (id: string) => svrCall(`/api/events/${id}`, eventResponseSchema),
  },
  reports: {
    list: (eventId: string) =>
      svrCall(`/api/events/${eventId}/reports`, reportListResponseSchema),
  },
  stats: {
    get: (eventId: string) =>
      svrCall(`/api/events/${eventId}/stats`, statsResponseSchema),
    unreported: (eventId: string) =>
      svrCall(
        `/api/events/${eventId}/unreported`,
        unreportedResponseSchema,
      ),
  },
  departments: {
    list: () => svrCall("/api/departments", deptListResponseSchema),
    tree: () => svrCall("/api/departments/tree", deptTreeResponseSchema),
  },
  users: {
    list: (
      query?: Partial<{
        q: string;
        role: "employee" | "manager";
        departmentId: string;
        isActive: boolean;
        limit: number;
        offset: number;
      }>,
    ) => {
      const params = new URLSearchParams();
      if (query?.q) params.set("q", query.q);
      if (query?.role) params.set("role", query.role);
      if (query?.departmentId) params.set("departmentId", query.departmentId);
      if (query?.isActive !== undefined)
        params.set("isActive", String(query.isActive));
      if (query?.limit) params.set("limit", String(query.limit));
      if (query?.offset) params.set("offset", String(query.offset));
      const qs = params.toString();
      return svrCall(`/api/users${qs ? `?${qs}` : ""}`, userListResponseSchema);
    },
  },
};
