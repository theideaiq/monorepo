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
  `?return_to=${encodeURIComponent(
    `${urls.app}${locale === "en" ? "" : `/${locale}`}/staff`
  )}`;

test.describe("back office", () => {
  test("visitors are sent to The IDEA Pass to sign in", async ({ page }) => {
    await page.goto(`${urls.app}/staff`);
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.app}/ar/staff/orders`);
    await expect(page).toHaveURL(`${urls.web}/ar/sign-in${toAdmin("ar")}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("a customer without a staff role is refused", async ({
    context,
    page,
  }) => {
    await context.addCookies(await sessionCookies(customer.email, urls.app));
    await page.goto(`${urls.app}/staff/customers`);
    await expect(page).toHaveURL(/\/staff\/no-access$/);
    await expect(
      page.getByRole("heading", { name: "No access" })
    ).toBeVisible();
    await expectAccessible(page);

    // Signs out through The IDEA Pass, then the back office asks to sign in.
    await page.getByRole("link", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await page.goto(`${urls.app}/staff/customers`);
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
  });

  test("staff link an authenticator app before the console opens", async ({
    page,
  }) => {
    await resetStaff();
    // Staff sign in with an email code like everyone else…
    await page.goto(`${urls.app}/staff`);
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await page.getByLabel("Email").fill(staff.email);
    await clearInbox(staff.email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page
      .getByLabel("Verification code")
      .fill(await emailedCode(staff.email));
    // …which is AAL1 only: the console sends them on to The IDEA Pass for
    // the authenticator app, which comes back afterwards.
    await expect(page).toHaveURL(`${urls.web}/mfa${toAdmin("en")}`, {
      timeout: 15_000,
    });
    const secret = page.locator("code");
    await expect(secret).toHaveText(/^[A-Z2-7]{16,}$/);
    await expectAccessible(page);

    await page.getByLabel("6-digit code").fill(totp(await secret.innerText()));
    await expect(page).toHaveURL(new RegExp(`${urls.app}/staff$`));
    await expect(
      page.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();
    await expectAccessible(page);
    await expect(
      page.getByRole("heading", { name: "Waiting on you" })
    ).toBeVisible();

    // Search from the sidebar, then the counter.
    await page
      .getByRole("searchbox", { name: "Search the back office" })
      .fill("E2E");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/staff\/search\?q=E2E$/);
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("link", { name: "Counter" }).click();
    await page
      .getByLabel("Scanned code or member number")
      .fill("IDEA:1:000000");
    await page.getByRole("button", { exact: true, name: "Check" }).click();
    await expect(page.getByText("No member with that number.")).toBeVisible();
    await expectAccessible(page);

    // Boxes: their parts and price check, and the ones to pack.
    await page.goto(`${urls.app}/staff/catalog/boxes`);
    await expect(page.getByRole("link", { name: "Reading box" })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.app}/staff/orders/boxes`);
    await expect(
      page.getByRole("heading", { name: "Boxes to pack" })
    ).toBeVisible();
    await expectAccessible(page);

    // Students (card reviews, universities) and partner perks.
    await page.goto(`${urls.app}/staff/customers/students`);
    await expect(
      page.getByRole("heading", { name: "Student cards to review" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.app}/staff/companies/perks`);
    await expect(page.getByRole("heading", { name: "New perk" })).toBeVisible();
    await expectAccessible(page);

    // Your Pass links staff to the back office.
    await page.goto(`${urls.web}/pass`);
    await page.getByRole("link", { name: "Open the back office" }).click();
    await expect(page).toHaveURL(new RegExp(`${urls.app}/staff$`));
  });
});
