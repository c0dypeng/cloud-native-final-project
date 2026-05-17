import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";
const ADMIN_URL = process.env.E2E_ADMIN_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./specs",
  fullyParallel: false, // server is single-process; keep determinism
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    extraHTTPHeaders: { "X-E2E": "1" },
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "web-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: WEB_URL },
      testMatch: /.*\.web\.spec\.ts/,
    },
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: ADMIN_URL },
      testMatch: /.*\.admin\.spec\.ts/,
    },
  ],
});
