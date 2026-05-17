import { test, expect } from "@playwright/test";

const EMPLOYEE = {
  email: process.env.E2E_EMPLOYEE_EMAIL ?? "employee@huyouan.local",
  password: process.env.E2E_USER_PASSWORD ?? "password123",
};

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel(/電子郵件|Email/).fill(EMPLOYEE.email);
  await page.getByLabel(/密碼|Password/).fill(EMPLOYEE.password);
  await page.getByRole("button", { name: /登入|Sign in/ }).click();
  await page.waitForURL(/\/dashboard/);
}

test.describe("Safety report flow", () => {
  test("employee sees active event card (or 'no active' empty state)", async ({
    page,
  }) => {
    await login(page);
    // Either an event card or the empty state is acceptable — both prove the
    // app rendered the dashboard correctly.
    const eitherVisible = await Promise.race([
      page
        .getByRole("button", { name: /我安全|I'm safe/ })
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => "event"),
      page
        .getByText(/目前沒有進行中的事件|No active events/)
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => "empty"),
    ]).catch(() => null);
    expect(eitherVisible).not.toBeNull();
  });

  test("submitting safe shows the toast (when an event is active)", async ({
    page,
  }) => {
    await login(page);
    const safeBtn = page.getByRole("button", { name: /我安全|I'm safe/ });
    if (!(await safeBtn.isVisible().catch(() => false))) {
      test.skip(true, "no active event — create one via admin to run this test");
    }
    await safeBtn.click();
    await expect(
      page.getByText(/已回報「我安全」|Reported as safe/),
    ).toBeVisible({ timeout: 5_000 });
  });
});
