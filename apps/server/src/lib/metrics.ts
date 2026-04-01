import { Registry, collectDefaultMetrics, Counter, Histogram, Gauge } from "prom-client";

export const register = new Registry();

collectDefaultMetrics({ register });

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

export const activeEventsTotal = new Gauge({
  name: "active_events_total",
  help: "Number of currently active emergency events",
  registers: [register],
});

export const unreportedUsersTotal = new Gauge({
  name: "unreported_users_total",
  help: "Number of users who have not reported for any active event",
  registers: [register],
});
