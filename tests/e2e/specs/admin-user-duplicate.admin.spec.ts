import { test, expect } from "@playwright/test";

const ADMIN = {
  username: process.env.E2E_ADMIN_USERNAME ?? "admin",
  password: process.env.E2E_ADMIN_PASSWORD ?? "changeme",
};

// An email that already exists in the demo seed.
const DUP_EMAIL = process.env.E2E_EMPLOYEE_EMAIL ?? "employee@huyouan.local";

test.describe("Admin user create — duplicate email", () => {
  test("shows a graceful error (no crash) when the email already exists", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel(/帳號|Username/).fill(ADMIN.username);
    await page.getByLabel(/密碼|Password/).fill(ADMIN.password);
    await page.getByRole("button", { name: /登入|Sign in/ }).click();
    await page.waitForURL(/^.*\/(?:$)/, { timeout: 15_000 });

    await page.getByRole("link", { name: /使用者|Users/ }).click();
    await page.waitForURL(/\/users/);

    // Open the create dialog
    await page.getByRole("button", { name: /新增使用者|New user|Add user/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByLabel(/姓名|Name/).fill("Duplicate E2E");
    await dialog.getByLabel(/電子郵件|Email/).fill(DUP_EMAIL);
    await dialog.getByLabel(/密碼|Password/).fill("password123");

    // Submit
    await dialog.getByRole("button", { name: /^建立$|^Create$/ }).click();

    // A failure toast appears — the server returns 409 and the client surfaces
    // it instead of crashing (regression guard for the unhandled-DB-error bug).
    await expect(page.getByText(/建立失敗|Create failed/).first()).toBeVisible({
      timeout: 10_000,
    });

    // The dialog stays open so the admin can correct the email.
    await expect(dialog).toBeVisible();
  });
});
