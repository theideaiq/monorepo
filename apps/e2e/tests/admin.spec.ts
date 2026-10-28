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

/** `?return_to=…` back to Staff's home in `locale`. */
const toAdmin = (locale: string) =>
  `?return_to=${encodeURIComponent(
    `${urls.staff}${locale === "en" ? "/" : `/${locale}`}`
  )}`;

test.describe("Staff", () => {
  test("visitors are sent to The IDEA Pass to sign in", async ({ page }) => {
    await page.goto(`${urls.staff}/`);
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.staff}/ar/orders`);
    await expect(page).toHaveURL(`${urls.web}/ar/sign-in${toAdmin("ar")}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("a customer without a staff role is refused", async ({
    context,
    page,
  }) => {
    await context.addCookies(await sessionCookies(customer.email, urls.staff));
    await page.goto(`${urls.staff}/customers`);
    await expect(page).toHaveURL(`${urls.staff}/no-access`);
    await expect(
      page.getByRole("heading", { name: "No access" })
    ).toBeVisible();
    await expectAccessible(page);

    // Signs out through The IDEA Pass, then Staff asks to sign in.
    await page.getByRole("link", { name: "Sign out" }).click();
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await page.goto(`${urls.staff}/customers`);
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
  });

  test("staff link an authenticator app before the console opens", async ({
    page,
  }) => {
    await resetStaff();
    // Staff sign in with an email code like everyone else…
    await page.goto(`${urls.staff}/`);
    await expect(page).toHaveURL(`${urls.web}/sign-in${toAdmin("en")}`);
    await page.getByRole("button", { name: "Email me a code instead" }).click();
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
    await expect(page).toHaveURL(new RegExp(`^${urls.staff}/$`));
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expectAccessible(page);
    await expect(
      page.getByRole("heading", { name: "Waiting on you" })
    ).toBeVisible();

    // Search from the sidebar, then the counter.
    await page.getByRole("searchbox", { name: "Search Staff" }).fill("E2E");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${urls.staff}/search?q=E2E`);
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("link", { name: "The IDEA Space" }).click();
    await page
      .getByLabel("Scanned code or member number")
      .fill("IDEA:1:000000");
    await page.getByRole("button", { exact: true, name: "Check" }).click();
    await expect(page.getByText("No member with that number.")).toBeVisible();
    await expectAccessible(page);

    // Boxes: their parts and price check, and the ones to pack.
    await page.goto(`${urls.staff}/catalog/boxes`);
    await expect(page.getByRole("link", { name: "Reading box" })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.staff}/orders/boxes`);
    await expect(
      page.getByRole("heading", { name: "Boxes to pack" })
    ).toBeVisible();
    await expectAccessible(page);

    // Students (card reviews, universities) and partner perks.
    await page.goto(`${urls.staff}/customers/students`);
    await expect(
      page.getByRole("heading", { name: "Student cards to review" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.staff}/partners/perks`);
    await expect(page.getByRole("heading", { name: "New perk" })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.staff}/partners/shops`);
    await expect(
      page.getByText("No shop has applied to sell yet.")
    ).toBeVisible();
    await expectAccessible(page);

    // Your Pass links staff to Staff.
    await page.goto(`${urls.web}/pass`);
    await page.getByRole("link", { name: "Open Staff" }).click();
    await expect(page).toHaveURL(new RegExp(`^${urls.staff}/$`));
  });
});
