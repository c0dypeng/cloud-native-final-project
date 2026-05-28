import { describe, it, expect } from "vitest";
import { Counter, Histogram, Gauge } from "prom-client";
import {
  httpRequestsTotal,
  httpRequestDuration,
  sseActiveConnections,
  reportSubmitTotal,
  reminderEmailsTotal,
  activeEventsTotal,
  unreportedUsersTotal,
  statsCacheHits,
  statsCacheMisses,
  register,
} from "./metrics.js";

describe("Prometheus metrics", () => {
  it("httpRequestsTotal is a Counter with method/route/status labels", () => {
    expect(httpRequestsTotal).toBeInstanceOf(Counter);
  });

  it("httpRequestDuration is a Histogram", () => {
    expect(httpRequestDuration).toBeInstanceOf(Histogram);
  });

  it("sseActiveConnections is a Gauge", () => {
    expect(sseActiveConnections).toBeInstanceOf(Gauge);
  });

  it("reportSubmitTotal is a Counter", () => {
    expect(reportSubmitTotal).toBeInstanceOf(Counter);
  });

  it("reminder and cache metrics exist", () => {
    expect(reminderEmailsTotal).toBeInstanceOf(Counter);
    expect(statsCacheHits).toBeInstanceOf(Counter);
    expect(statsCacheMisses).toBeInstanceOf(Counter);
    expect(activeEventsTotal).toBeInstanceOf(Gauge);
    expect(unreportedUsersTotal).toBeInstanceOf(Gauge);
  });

  it("all metrics are registered in the custom registry", async () => {
    const metrics = await register.getMetricsAsJSON();
    const names = metrics.map((m) => m.name);
    expect(names).toContain("http_requests_total");
    expect(names).toContain("http_request_duration_seconds");
    expect(names).toContain("sse_active_connections");
    expect(names).toContain("report_submit_total");
    expect(names).toContain("reminder_emails_total");
  });
});
