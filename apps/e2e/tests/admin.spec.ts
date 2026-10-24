import { expect, test } from "@playwright/test";
import { customer, sessionCookies, staff, totp } from "../fixtures";
import { urls } from "../playwright.config";
import { resetStaff } from "../seed";
import { expectAccessible } from "./helpers";

test.describe("back office", () => {
  test("visitors are sent to sign in", async ({ page }) => {
    await page.goto(`${urls.admin}/en`);
    await expect(page).toHaveURL(/\/en\/sign-in$/);
    await expect(page.getByLabel("Mobile number")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.admin}/ar/orders`);
    await expect(page).toHaveURL(/\/ar\/sign-in$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("a customer without a staff role is refused", async ({
    context,
    page,
  }) => {
    await context.addCookies(await sessionCookies(customer.email, urls.admin));
    await page.goto(`${urls.admin}/en/customers`);
    await expect(page).toHaveURL(/\/en\/no-access$/);
    await expect(
      page.getByRole("heading", { name: "No access" })
    ).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/en\/sign-in$/);
  });

  test("staff link an authenticator app before the console opens", async ({
    context,
    page,
  }) => {
    await resetStaff();
    await context.addCookies(await sessionCookies(staff.email, urls.admin));
    // Signed in with a password only (AAL1): the console asks for the app.
    await page.goto(`${urls.admin}/en`);
    await expect(page).toHaveURL(/\/en\/mfa$/);
    const secret = page.locator("code");
    await expect(secret).toHaveText(/^[A-Z2-7]{16,}$/);
    await expectAccessible(page);

    await page.getByLabel("6-digit code").fill(totp(await secret.innerText()));
    await expect(page).toHaveURL(new RegExp(`${urls.admin}/en$`));
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await expectAccessible(page);
  });
});
