import { test, expect } from "@playwright/test";

const ADMIN = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "changeme",
};

test.describe("Admin event lifecycle", () => {
  test("admin can log in, view events list, create + close an event", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/帳號|Username/).fill(ADMIN.username);
    await page.getByLabel(/密碼|Password/).fill(ADMIN.password);
    await page.getByRole("button", { name: /登入|Sign in/ }).click();
    await page.waitForURL(/^.*\/(?:$)/, { timeout: 15_000 });

    // Navigate to events
    await page.getByRole("link", { name: /事件管理|Events/ }).click();
    await page.waitForURL(/\/events/);
    await expect(
      page.getByRole("heading", { name: /事件管理|Events/ }),
    ).toBeVisible();

    // Create a fresh event
    const title = `E2E drill ${Date.now()}`;
    await page.getByRole("button", { name: /建立事件|Create event/i }).click();
    await page.getByLabel(/事件名稱|Event name/).fill(title);
    // Default type = earthquake. Submit.
    await page
      .getByRole("button", { name: /建立並推送|Create|建立/ })
      .last()
      .click();

    // We land on the new event detail page
    await expect(page.getByRole("heading", { name: title })).toBeVisible({
      timeout: 10_000,
    });

    // Close the event
    await page.getByRole("button", { name: /結束事件|Close event/ }).click();
    await page
      .getByRole("button", { name: /確定結束|Close|確定/ })
      .last()
      .click();
    await expect(page.getByText(/已結束|Closed/).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
