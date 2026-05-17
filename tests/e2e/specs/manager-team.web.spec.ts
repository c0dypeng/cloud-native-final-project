import { test, expect } from "@playwright/test";

const MANAGER = {
  email: process.env.E2E_MANAGER_EMAIL ?? "manager@huyouan.local",
  password: process.env.E2E_USER_PASSWORD ?? "password123",
};

test.describe("Manager team care page", () => {
  test("manager can navigate to /dashboard/team and see filters", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/電子郵件|Email/).fill(MANAGER.email);
    await page.getByLabel(/密碼|Password/).fill(MANAGER.password);
    await page.getByRole("button", { name: /登入|Sign in/ }).click();
    await page.waitForURL(/\/dashboard/);

    await page.goto("/dashboard/team");
    await expect(
      page.getByRole("heading", { name: /主管關懷|Team Care/ }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /全部|All/ })).toBeVisible();
  });
});
