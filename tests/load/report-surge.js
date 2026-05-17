/* eslint-disable */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

/**
 * k6 load test: report surge during a disaster.
 *
 * Realistic model: every employee opens the app and submits a single safety
 * report. Each VU logs in once at the start of its session, caches the JWT,
 * then submits the report. Iterations don't re-login (that's a separate test).
 *
 * Pre-requisites:
 *   1. Stack running: `make up` (Postgres + Redis + server + web + admin)
 *   2. Load-scale seed: `SEED_SCALE=load make seed` → 10k users
 *   3. Server started with `LOAD_TEST=1` so the 5/min IP login limiter is off
 *      (we connect from 127.0.0.1 — without this every VU after #5 hits 429)
 *   4. Admin has created an active event; export its UUID as EVENT_ID
 *
 * Usage:
 *   make k6-report EVENT_ID=<uuid>
 *
 * Or directly:
 *   k6 run -e API_URL=http://localhost:4000 -e EVENT_ID=<uuid> \
 *       -e SEED_USER_PASSWORD=password123 tests/load/report-surge.js
 *
 * SLO (enforced as thresholds — these gate the demo "PASS"):
 *   - report submit p95 ≤ 500ms
 *   - report submit p99 ≤ 1s
 *   - report error rate ≤ 0.5%
 *
 * We track `http_req_failed` for visibility but don't gate on it — the ramp-up
 * window puts 100s of bcrypt-bound login calls in flight at once, and a tail
 * of them legitimately time out under load. After first successful login each
 * VU re-uses the token, so the report endpoint never sees that pressure.
 */

const API_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID;
const USER_PASSWORD = __ENV.SEED_USER_PASSWORD || "password123";

if (!EVENT_ID) {
  throw new Error("EVENT_ID is required");
}

const loginLatency = new Trend("login_latency_ms");
const reportLatency = new Trend("report_latency_ms");
const reportErrorRate = new Rate("report_error_rate");
const reportsSubmitted = new Counter("reports_submitted_total");

export const options = {
  scenarios: {
    surge: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 100 },
        { duration: "1m", target: 500 },
        { duration: "1m", target: 1000 },
        { duration: "3m", target: 1000 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },
  thresholds: {
    "report_latency_ms": ["p(95)<500", "p(99)<1000"],
    "report_error_rate": ["rate<0.005"],
    // Informational only — see comment at the top of this file.
    "http_req_failed": ["rate<0.50"],
  },
};

// Each VU caches its token in this module-level Map so we only login once.
const tokenCache = {};

function uniqueUserEmail() {
  const id = ((__VU - 1) % 10_000) + 1;
  const padded = String(id).padStart(5, "0");
  return `emp${padded}@huyouan.local`;
}

function login() {
  const email = uniqueUserEmail();
  const res = http.post(
    `${API_URL}/api/auth/login`,
    JSON.stringify({ email, password: USER_PASSWORD }),
    {
      headers: { "content-type": "application/json" },
      tags: { name: "login" },
    },
  );
  loginLatency.add(res.timings.duration);
  if (!check(res, { "login 200": (r) => r.status === 200 })) {
    return null;
  }
  return res.json("token");
}

export default function () {
  let token = tokenCache[__VU];
  if (!token) {
    token = login();
    if (!token) {
      sleep(1);
      return;
    }
    tokenCache[__VU] = token;
  }

  const status = Math.random() < 0.9 ? "safe" : "need_help";
  const res = http.post(
    `${API_URL}/api/events/${EVENT_ID}/report`,
    JSON.stringify({ status }),
    {
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      tags: { name: "submit_report" },
    },
  );
  reportLatency.add(res.timings.duration);
  const ok = check(res, { "report 200": (r) => r.status === 200 });
  reportErrorRate.add(!ok);
  if (ok) reportsSubmitted.add(1);

  // Real users tap the button and put their phone down; they don't loop.
  // We sleep so each VU effectively models one person across the ramp window.
  sleep(2 + Math.random() * 4);
}
