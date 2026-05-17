/* eslint-disable */
import http from "k6/http";
import { check, sleep } from "k6";

/**
 * k6 load test: managers + admins polling the live dashboard.
 *
 * Models 50 managers + 5 admins refreshing stats every 3s during an active
 * event. Each VU calls /stats and /unreported on a loop.
 */

const API_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID;
const ADMIN_USERNAME = __ENV.SEED_ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = __ENV.SEED_ADMIN_PASSWORD || "changeme";

export const options = {
  scenarios: {
    dashboards: {
      executor: "constant-vus",
      vus: 55,
      duration: "3m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300"],
  },
};

export function setup() {
  const res = http.post(
    `${API_URL}/api/admin/auth/login`,
    JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
    { headers: { "content-type": "application/json" } },
  );
  if (res.status !== 200) {
    throw new Error(`admin login failed: ${res.status} ${res.body}`);
  }
  return { sessionId: res.json("sessionId") };
}

export default function (data) {
  const headers = { "x-admin-session": data.sessionId };
  const stats = http.get(`${API_URL}/api/events/${EVENT_ID}/stats`, {
    headers,
    tags: { name: "stats" },
  });
  check(stats, { "stats 200": (r) => r.status === 200 });
  const unreported = http.get(
    `${API_URL}/api/events/${EVENT_ID}/unreported`,
    { headers, tags: { name: "unreported" } },
  );
  check(unreported, { "unreported 200": (r) => r.status === 200 });
  sleep(3);
}
