import {
  eventListResponseSchema,
  eventResponseSchema,
  reportListResponseSchema,
  reportSubmitResponseSchema,
  statsResponseSchema,
  teamResponseSchema,
  teamStatusResponseSchema,
  unreportedResponseSchema,
  type ReportSubmitInput,
} from "@workspace/api-contracts";
import { apiFetch } from "./api";

export const api = {
  events: {
    list: () => apiFetch("/api/events", eventListResponseSchema),
    get: (id: string) =>
      apiFetch(`/api/events/${id}`, eventResponseSchema),
  },
  reports: {
    submit: (eventId: string, body: ReportSubmitInput) =>
      apiFetch(`/api/events/${eventId}/report`, reportSubmitResponseSchema, {
        method: "POST",
        body,
      }),
    list: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/reports`, reportListResponseSchema),
  },
  stats: {
    get: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/stats`, statsResponseSchema),
    unreported: (eventId: string) =>
      apiFetch(`/api/events/${eventId}/unreported`, unreportedResponseSchema),
  },
  manager: {
    team: () => apiFetch("/api/manager/team", teamResponseSchema),
    teamStatus: (eventId: string) =>
      apiFetch(
        `/api/manager/team/${eventId}/status`,
        teamStatusResponseSchema,
      ),
  },
};
