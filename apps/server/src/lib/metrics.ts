import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from "prom-client";

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

export const sseActiveConnections = new Gauge({
  name: "sse_active_connections",
  help: "Number of currently active SSE connections",
  registers: [register],
});

export const reportSubmitTotal = new Counter({
  name: "report_submit_total",
  help: "Total number of safety report submissions",
  labelNames: ["status", "result"], // status: safe|need_help, result: success|error
  registers: [register],
});

export const reminderEmailsTotal = new Counter({
  name: "reminder_emails_total",
  help: "Reminder emails attempted",
  labelNames: ["result"], // sent|error|dry_run|skipped
  registers: [register],
});

export const statsCacheHits = new Counter({
  name: "stats_cache_hits_total",
  help: "Stats endpoint cache hits",
  registers: [register],
});

export const statsCacheMisses = new Counter({
  name: "stats_cache_misses_total",
  help: "Stats endpoint cache misses",
  registers: [register],
});

export const mqPublishedTotal = new Counter({
  name: "mq_published_total",
  help: "Messages published to the report event stream",
  labelNames: ["event_type"],
  registers: [register],
});

export const mqProcessedTotal = new Counter({
  name: "mq_processed_total",
  help: "Messages processed by the report event worker",
  labelNames: ["event_type", "result"],
  registers: [register],
});

export const mqProcessingSeconds = new Histogram({
  name: "mq_processing_seconds",
  help: "Latency of report event worker handler",
  labelNames: ["event_type"],
  buckets: [0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  registers: [register],
});

export const mqStreamLength = new Gauge({
  name: "mq_stream_length",
  help: "Current length of the report event stream (backlog indicator)",
  registers: [register],
});
