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
import { resetCompany, resetCustomer, resetStaff } from "../seed";
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
    await expect(
      page.getByRole("heading", { name: "Key numbers by week" })
    ).toBeVisible();

    // Catalog → Searches: a Store search that found nothing.
    const missing = `e2e nothing ${Date.now()}`;
    await page.goto(`${urls.web}/search?q=${encodeURIComponent(missing)}`);
    await page.goto(`${urls.staff}/catalog/searches`);
    await expect(page.getByRole("link", { name: missing })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.staff}/`);

    // Search from the sidebar.
    await page.getByRole("searchbox", { name: "Search Staff" }).fill("E2E");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${urls.staff}/search?q=E2E`);
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expectAccessible(page);

    // Students (card reviews, universities) and partner perks.
    await page.goto(`${urls.staff}/customers/students`);
    await expect(
      page.getByRole("heading", { name: "Student cards to review" })
    ).toBeVisible();
    await expectAccessible(page);
    // Verifications: identity, educator and organization reviews.
    await page.goto(`${urls.staff}/customers/verifications`);
    await expect(
      page.getByRole("heading", { name: "Organizations" })
    ).toBeVisible();
    await expectAccessible(page);
    // Club → Opportunities: an organization's listing waiting for review.
    const db = admin();
    const organizationId = await resetCompany();
    await db.from("opportunities").insert({
      kind: "internship",
      organization_id: organizationId,
      remote: true,
      slug: "e2e-review-internship",
      status: "pending",
      title_ar: "تدريب للمراجعة",
      title_en: "E2E Review Internship",
    });
    await page.goto(`${urls.staff}/club/opportunities`);
    await expect(
      page.getByRole("heading", { name: "Waiting for review" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("link", { name: "E2E Review Internship" }).click();
    await page.getByRole("button", { name: "Send decision" }).click();
    await expect(page.getByText("Listed", { exact: true })).toBeVisible();
    await expectAccessible(page);

    // Club → Opportunities: one of The IDEA's programs sold as a package,
    // and an application accepted.
    const customerId = await resetCustomer();
    const { data: old } = await db
      .from("opportunities")
      .select("id")
      .eq("slug", "e2e-staff-program");
    await db
      .from("opportunities")
      .delete()
      .in(
        "id",
        (old ?? []).map((row) => row.id)
      );
    const { data: listing } = await db
      .from("opportunities")
      .insert({
        kind: "program",
        location: "Boston",
        slug: "e2e-staff-program",
        starts_on: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
        status: "approved",
        title_ar: "برنامج الموظفين",
        title_en: "E2E Staff Program",
      })
      .select("id")
      .single();
    await page.goto(`${urls.staff}/club/opportunities/${listing?.id}`);
    await page.getByLabel("Price (IQD)", { exact: true }).fill("1000000");
    await page.getByRole("button", { name: "Save package" }).click();
    await expect(
      page.getByRole("link", { name: "Applications (0)" })
    ).toBeVisible();
    await expectAccessible(page);
    await db.from("program_applications").insert({
      emergency_name: "Mum",
      emergency_phone: "+9647700000999",
      program_id: listing?.id ?? "",
      user_id: customerId,
    });
    await page.goto(`${urls.staff}/club/opportunities#applications`);
    await page
      .getByRole("link", { name: "E2E Staff Program: 1 waiting" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Applications" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByRole("link", { name: customer.name }).click();
    await page.getByRole("button", { name: "Send decision" }).click();
    await expect(page.getByText("Installments ·")).toBeVisible();
    await expectAccessible(page);
    await db.from("program_applications").delete().eq("user_id", customerId);
    await db
      .from("opportunities")
      .delete()
      .eq("id", listing?.id ?? "");

    await page.goto(`${urls.staff}/partners/perks`);
    await expect(page.getByRole("heading", { name: "New perk" })).toBeVisible();
    await expectAccessible(page);
    await page.goto(`${urls.staff}/partners/shops`);
    await expect(
      page.getByText("No shop has applied to sell yet.")
    ).toBeVisible();
    await expectAccessible(page);

    // Catalog → Checks: what the automatic checks and shops sent staff.
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
