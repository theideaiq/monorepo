import { expect, test } from "@playwright/test";
import {
  admin,
  clearInbox,
  customer,
  emailedCode,
  product,
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

    await page.getByRole("link", { name: "Counter" }).click();
    await page
      .getByLabel("Scanned code or member number")
      .fill("IDEA:1:000000");
    await page.getByRole("button", { exact: true, name: "Check" }).click();
    await expect(page.getByText("No member with that number.")).toBeVisible();
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

    // Catalog → Checks: what the automatic checks and shops sent staff.
    const db = admin();
    const { data: item } = await db
      .from("products")
      .select("id")
      .eq("slug", product.slug)
      .single();
    if (!item) {
      throw new Error("The seed product is missing");
    }
    await db.from("product_checks").delete().eq("product_id", item.id);
    await db.from("product_flags").delete().eq("product_id", item.id);
    await db
      .from("product_checks")
      .insert({ product_id: item.id, reason: "missing_photo" });
    await db.from("product_flags").insert({
      note: "The year is wrong",
      product_id: item.id,
      seller_id: "00000000-0000-4000-8000-000000000001",
    });
    await page.goto(`${urls.staff}/catalog/checks`);
    await expect(page.getByText("No photo")).toBeVisible();
    await expect(page.getByText("The year is wrong")).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("button", { name: "Resolved" }).first().click();
    await expect(page.getByText("No new products to check.")).toBeVisible();
    await page.getByRole("button", { name: "Resolved" }).click();
    await expect(page.getByText("No flags from shops.")).toBeVisible();

    // Your Pass links staff to Staff.
    await page.goto(`${urls.web}/pass`);
    await page.getByRole("link", { name: "Open Staff" }).click();
    await expect(page).toHaveURL(new RegExp(`^${urls.staff}/$`));
  });
});
