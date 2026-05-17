import "server-only";
import { API_URL, authHeaders } from "@/utils/auth/server";
import { apiFetch } from "./api";
import {
  eventListResponseSchema,
  eventResponseSchema,
  reportListResponseSchema,
  statsResponseSchema,
  teamResponseSchema,
  teamStatusResponseSchema,
  unreportedResponseSchema,
} from "@workspace/api-contracts";

/**
 * Server-side API helpers used inside Server Components.
 * They forward the user's JWT via Authorization header (no cookie hops).
 */
export const apiServer = {
  events: {
    list: async () => {
      const headers = await authHeaders();
      return apiFetch("/api/events", eventListResponseSchema, {
        baseUrl: API_URL,
        headers,
        credentials: undefined,
      });
    },
    get: async (id: string) => {
      const headers = await authHeaders();
      return apiFetch(`/api/events/${id}`, eventResponseSchema, {
        baseUrl: API_URL,
        headers,
        credentials: undefined,
      });
    },
  },
  reports: {
    list: async (eventId: string) => {
      const headers = await authHeaders();
      return apiFetch(
        `/api/events/${eventId}/reports`,
        reportListResponseSchema,
        { baseUrl: API_URL, headers, credentials: undefined },
      );
    },
  },
  stats: {
    get: async (eventId: string) => {
      const headers = await authHeaders();
      return apiFetch(`/api/events/${eventId}/stats`, statsResponseSchema, {
        baseUrl: API_URL,
        headers,
        credentials: undefined,
      });
    },
    unreported: async (eventId: string) => {
      const headers = await authHeaders();
      return apiFetch(
        `/api/events/${eventId}/unreported`,
        unreportedResponseSchema,
        { baseUrl: API_URL, headers, credentials: undefined },
      );
    },
  },
  manager: {
    team: async () => {
      const headers = await authHeaders();
      return apiFetch("/api/manager/team", teamResponseSchema, {
        baseUrl: API_URL,
        headers,
        credentials: undefined,
      });
    },
    teamStatus: async (eventId: string) => {
      const headers = await authHeaders();
      return apiFetch(
        `/api/manager/team/${eventId}/status`,
        teamStatusResponseSchema,
        { baseUrl: API_URL, headers, credentials: undefined },
      );
    },
  },
};
