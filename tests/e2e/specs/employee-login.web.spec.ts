import { test, expect } from "@playwright/test";

const EMPLOYEE = {
  email: process.env.E2E_EMPLOYEE_EMAIL ?? "employee@huyouan.local",
  password: process.env.E2E_USER_PASSWORD ?? "password123",
};

test.describe("Employee login & dashboard", () => {
  test("employee can log in and reach the dashboard", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/護你安|HuYouAn/);

    await page.getByLabel(/電子郵件|Email/).fill(EMPLOYEE.email);
    await page.getByLabel(/密碼|Password/).fill(EMPLOYEE.password);
    await page.getByRole("button", { name: /登入|Sign in/ }).click();

    await page.waitForURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /您好|Hi,/ }),
    ).toBeVisible();
  });

  test("invalid credentials show an inline error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/電子郵件|Email/).fill(EMPLOYEE.email);
    await page.getByLabel(/密碼|Password/).fill("totally-wrong");
    await page.getByRole("button", { name: /登入|Sign in/ }).click();
    await expect(
      page.getByText(/帳號或密碼錯誤|Invalid email or password/),
    ).toBeVisible();
  });
});
