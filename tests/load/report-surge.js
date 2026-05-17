/* eslint-disable */
import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate } from "k6/metrics";

/**
 * k6 load test: report surge.
 *
 * Models 1k employees opening the app and tapping「我安全」/「需要協助」
 * simultaneously during a disaster.
 *
 * Pre-requisites (run before):
 *   1. The full stack must be running: `make up` or `kubectl apply -f k8s/base`
 *   2. Load-scale seed: SEED_SCALE=load make seed (creates 10k users with
 *      predictable emails empNNNNN@huyouan.local + SEED_USER_PASSWORD)
 *   3. An admin must have already created an active event.
 *
 * Usage:
 *   k6 run -e API_URL=http://localhost:4000 -e EVENT_ID=<uuid> tests/load/report-surge.js
 *
 * Pass criteria: p95 ≤ 500ms, error rate ≤ 0.5%.
 */

const API_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID;
const USER_PASSWORD = __ENV.SEED_USER_PASSWORD || "password123";

if (!EVENT_ID) {
  // We can't bail in test mode but we can fail every check loudly.
  console.warn("EVENT_ID env var not set — tests will fail at submit step");
}

const loginLatency = new Trend("login_latency_ms");
const reportLatency = new Trend("report_latency_ms");
const reportErrorRate = new Rate("report_error_rate");

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
    http_req_failed: ["rate<0.005"],
    http_req_duration: ["p(95)<500"],
    report_latency_ms: ["p(95)<500", "p(99)<1000"],
    report_error_rate: ["rate<0.005"],
  },
};

function uniqueUserEmail() {
  // Map VU id to a deterministic seed email.
  // Falls back to faker-generated employees from seed:load.
  const id = (__VU - 1) % 10_000 + 1;
  const padded = String(id).padStart(5, "0");
  return `emp${padded}@huyouan.local`;
}

export default function () {
  const email = uniqueUserEmail();

  // 1. Login
  const loginRes = http.post(
    `${API_URL}/api/auth/login`,
    JSON.stringify({ email, password: USER_PASSWORD }),
    { headers: { "content-type": "application/json" }, tags: { name: "login" } },
  );
  loginLatency.add(loginRes.timings.duration);
  if (
    !check(loginRes, {
      "login 200": (r) => r.status === 200,
    })
  ) {
    sleep(0.5);
    return;
  }
  const token = loginRes.json("token");

  // 2. Submit safety report (90% safe, 10% need_help)
  const status = Math.random() < 0.9 ? "safe" : "need_help";
  const reportRes = http.post(
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
  reportLatency.add(reportRes.timings.duration);
  const ok = check(reportRes, {
    "report 200": (r) => r.status === 200,
  });
  reportErrorRate.add(!ok);

  sleep(0.5 + Math.random() * 1.5);
}
