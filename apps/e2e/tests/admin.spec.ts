import { expect, test } from "@playwright/test";
import {
  clearInbox,
  customer,
  emailedCode,
  sessionCookies,
  staff,
  totp,
} from "../fixtures";
import { urls } from "../playwright.config";
import { resetStaff } from "../seed";
import { expectAccessible } from "./helpers";

/** `?return_to=…` back to the back office's home in `locale`. */
const toAdmin = (locale: string) =>
  `?return_to=${encodeURIComponent(`/${locale}/admin`)}`;

test.describe("back office", () => {
  test("visitors are sent to The IDEA Pass to sign in", async ({ page }) => {
    await page.goto(`${urls.app}/en/admin`);
    await expect(page).toHaveURL(`${urls.app}/en/sign-in${toAdmin("en")}`);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.app}/ar/admin/orders`);
    await expect(page).toHaveURL(`${urls.app}/ar/sign-in${toAdmin("ar")}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("a customer without a staff role is refused", async ({
    context,
    page,
  }) => {
    await context.addCookies(await sessionCookies(customer.email, urls.app));
    await page.goto(`${urls.app}/en/admin/customers`);
    await expect(page).toHaveURL(/\/en\/admin\/no-access$/);
    await expect(
      page.getByRole("heading", { name: "No access" })
    ).toBeVisible();
    await expectAccessible(page);

    // Signs out through The IDEA Pass, then the back office asks to sign in.
    await page.getByRole("link", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${urls.app}/en/sign-in${toAdmin("en")}`);
    await page.goto(`${urls.app}/en/admin/customers`);
    await expect(page).toHaveURL(new RegExp(`^${urls.app}/en/sign-in`));
  });

  test("staff link an authenticator app before the console opens", async ({
    page,
  }) => {
    await resetStaff();
    // Staff sign in with an email code like everyone else…
    await page.goto(`${urls.app}/en/admin`);
    await expect(page).toHaveURL(`${urls.app}/en/sign-in${toAdmin("en")}`);
    await page.getByLabel("Email").fill(staff.email);
    await clearInbox(staff.email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByLabel("Verification code")
      .fill(await emailedCode(staff.email));
    // …which is AAL1 only: the console sends them on to The IDEA Pass for
    // the authenticator app, which comes back afterwards.
    await expect(page).toHaveURL(`${urls.app}/en/mfa${toAdmin("en")}`, {
      timeout: 15_000,
    });
    const secret = page.locator("code");
    await expect(secret).toHaveText(/^[A-Z2-7]{16,}$/);
    await expectAccessible(page);

    await page.getByLabel("6-digit code").fill(totp(await secret.innerText()));
    await expect(page).toHaveURL(new RegExp(`${urls.app}/en/admin$`));
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await expectAccessible(page);

    // Your Pass links staff to the back office.
    await page.goto(`${urls.app}/en/pass`);
    await page.getByRole("link", { name: "Open the back office" }).click();
    await expect(page).toHaveURL(new RegExp(`${urls.app}/en/admin$`));
  });
});
