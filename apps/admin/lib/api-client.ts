import {
  eventListResponseSchema,
  eventResponseSchema,
  reportListResponseSchema,
  statsResponseSchema,
  unreportedResponseSchema,
  userListResponseSchema,
  deptListResponseSchema,
  deptTreeResponseSchema,
  type EventCreateInput,
  type UserCreateInput,
  type UserUpdateInput,
  type UserResetPasswordInput,
  type DeptCreateInput,
  type DeptUpdateInput,
} from "@workspace/api-contracts";
import { apiFetch } from "./api";
import { z } from "zod";

const okSchema = z.object({}).passthrough();

export const adminApi = {
  events: {
    list: () => apiFetch("/api/events", eventListResponseSchema),
    create: (body: EventCreateInput) =>
      apiFetch("/api/events", eventResponseSchema, {
        method: "POST",
        body,
      }),
    close: (id: string) =>
      apiFetch(`/api/events/${id}/close`, eventResponseSchema, {
        method: "PATCH",
      }),
  },
  reports: {
    list: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/reports`, reportListResponseSchema),
  },
  stats: {
    get: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/stats`, statsResponseSchema),
    unreported: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/unreported`, unreportedResponseSchema),
  },
  users: {
    list: (params?: URLSearchParams) =>
      apiFetch(
        `/api/users${params?.toString() ? `?${params.toString()}` : ""}`,
        userListResponseSchema,
      ),
    create: (body: UserCreateInput) =>
      apiFetch("/api/users", okSchema, { method: "POST", body }),
    update: (id: string, body: UserUpdateInput) =>
      apiFetch(`/api/users/${id}`, okSchema, { method: "PATCH", body }),
    softDelete: (id: string) =>
      apiFetch(`/api/users/${id}`, okSchema, { method: "DELETE" }),
    resetPassword: (id: string, body: UserResetPasswordInput) =>
      apiFetch(`/api/users/${id}/password`, okSchema, {
        method: "POST",
        body,
      }),
  },
  departments: {
    list: () => apiFetch("/api/departments", deptListResponseSchema),
    tree: () => apiFetch("/api/departments/tree", deptTreeResponseSchema),
    create: (body: DeptCreateInput) =>
      apiFetch("/api/departments", okSchema, { method: "POST", body }),
    update: (id: string, body: DeptUpdateInput) =>
      apiFetch(`/api/departments/${id}`, okSchema, { method: "PATCH", body }),
    remove: (id: string) =>
      apiFetch(`/api/departments/${id}`, okSchema, { method: "DELETE" }),
  },
};
