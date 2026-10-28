import { expect, test } from "@playwright/test";
import { admin, customer, sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCompany } from "../seed";
import { expectAccessible } from "./helpers";

const REQUEST_PATH = /\/bulk-buying\/([0-9a-f-]{36})$/;

test("a company adds Bulk buying, sends a request and accepts the quote", async ({
  context,
  page,
}) => {
  await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  // A new organization starts with Home and Organization; it adds sections.
  await page.goto(urls.app);
  await expect(page.getByRole("link", { name: "Bulk buying" })).toHaveCount(0);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add Bulk buying" }).click();
  await page.getByRole("link", { exact: true, name: "Bulk buying" }).click();
  await expect(page).toHaveURL(/\/bulk-buying$/);
  await page.getByLabel("What do you need?").fill("12 laptops");
  await page.getByLabel("Budget (IQD, optional)").fill("9000000");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(REQUEST_PATH);
  await expect(page.getByText("We're preparing your quote.")).toBeVisible();
  await expectAccessible(page);

  // Support's quote (Staff's steps are covered by pgTAP).
  const requestId = REQUEST_PATH.exec(page.url())?.[1] ?? "";
  const db = admin();
  const { data: quote, error } = await db
    .from("quotes")
    .insert({
      request_id: requestId,
      sent_at: new Date().toISOString(),
      status: "sent",
    })
    .select("id, number")
    .single();
  expect(error).toBeNull();
  await db.from("quote_lines").insert({
    description: "Laptop",
    position: 1,
    quantity: 12,
    quote_id: quote?.id ?? "",
    unit_price: 700_000,
  });
  await db
    .from("procurement_requests")
    .update({ status: "quoted" })
    .eq("id", requestId);

  await page.reload();
  await expect(page.getByText(`Quote #${quote?.number}`)).toBeVisible();
  await page.getByLabel("Your PO reference (optional)").fill("PO-E2E-1");
  await page.getByRole("button", { name: "Accept quote" }).click();
  await expect(page.getByText(/^Purchase order #\d+/)).toBeVisible();
  await expect(page.getByText("Your reference: PO-E2E-1")).toBeVisible();
  await expectAccessible(page);

  // The purchase order, laid out for printing.
  await page.getByRole("link", { name: "Print the purchase order" }).click();
  await expect(
    page.getByRole("heading", { name: /^Purchase order #\d+/ })
  ).toBeVisible();
  await expect(page.getByText("E2E Company")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Print or save as PDF" })
  ).toBeVisible();
  await expectAccessible(page);

  await page.goto(urls.app);
  await expect(page.getByText("Quotes to answer")).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Organization" }).click();
  await expect(page.getByText("Sections", { exact: true })).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Invoices" }).click();
  await expect(page.getByText("No invoices yet.")).toBeVisible();
  await page.getByRole("link", { exact: true, name: "The IDEA Plus" }).click();
  await expect(
    page.getByText("No one has The IDEA Plus through your company yet.")
  ).toBeVisible();
  await expectAccessible(page);
});

test("a company verifies its domain and registers a Pass app", async ({
  context,
  page,
}) => {
  const organizationId = await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  await page.goto(urls.app);
  await page.getByRole("button", { name: "Add Developers" }).click();
  await page.getByRole("link", { exact: true, name: "Developers" }).click();
  await expect(page).toHaveURL(/\/developers$/);
  await expect(
    page.getByText("Verify a domain first, then register your app.")
  ).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Domain", { exact: true }).fill("E2E-Company.example");
  await page.getByRole("button", { exact: true, name: "Add" }).click();
  await expect(
    page.getByText("e2e-company.example", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("Not verified yet")).toBeVisible();
  await expect(
    page.getByText("_theidea-pass.e2e-company.example")
  ).toBeVisible();
  await expectAccessible(page);

  // The API checks DNS and the file; here the domain is marked verified.
  await admin()
    .from("pass_partner_domains")
    .update({ verified_at: new Date().toISOString() })
    .eq("organization_id", organizationId);
  await page.reload();
  await expect(page.getByText("Verified", { exact: true })).toBeVisible();

  await page.getByText("Register an app").click();
  await page.getByLabel("Name (shown when people sign in)").fill("E2E Books");
  await page.getByLabel("Website").fill("https://e2e-company.example");
  await page
    .getByLabel("Return addresses")
    .fill("https://app.e2e-company.example/cb\nhttp://localhost:4000/cb");
  await page.getByLabel("Verified student (yes or no)").check();
  await page.getByRole("button", { exact: true, name: "Register" }).click();
  await expect(
    page.getByText(
      "Copy these now: the secret isn't shown again. Keep it on your server only."
    )
  ).toBeVisible();
  await expect(page.getByText("E2E Books", { exact: true })).toBeVisible();
  await expect(page.getByText("Testing", { exact: true })).toBeVisible();
  await expectAccessible(page);

  await page.goto(`${urls.app}/ar/developers`);
  await expect(page.getByText("E2E Books", { exact: true })).toBeVisible();
  await expectAccessible(page);
});

test("a company applies to sell and, once approved, lists an offer that reaches the website", async ({
  context,
  page,
}) => {
  const organizationId = await resetCompany();
  const db = admin();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  // Selling is a section the organization adds from Home.
  await page.goto(urls.app);
  await page.getByRole("button", { name: "Add Selling" }).click();
  await page.getByRole("link", { exact: true, name: "Selling" }).click();
  await expect(page).toHaveURL(/\/selling$/);
  await page.getByLabel("Shop name").fill("E2E Records");
  await page.getByRole("button", { exact: true, name: "Apply" }).click();
  await expect(page.getByText("In review")).toBeVisible();
  await page.getByLabel("Bank", { exact: true }).fill("E2E Bank");
  await page.getByLabel("Name on the bank details").fill("E2E Company");
  await page.getByLabel("IBAN").fill("IQ00 TEST");
  await expect(page.getByText("That doesn't look like an IBAN.")).toBeVisible();
  await page.getByLabel("IBAN").fill("IQ98 NBIQ 8501 2345 6789 012");
  await page.getByRole("button", { exact: true, name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expectAccessible(page);

  // Staff approve it (Staff's steps are covered by pgTAP) and add the
  // product to the catalogue.
  const { error } = await db
    .from("sellers")
    .update({ status: "approved" })
    .eq("organization_id", organizationId)
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  await page.reload();
  await expect(page.getByText("Approved", { exact: true })).toBeVisible();

  const slug = "e2e-shop-record";
  await db.from("products").delete().eq("slug", slug);
  const { data: record, error: productError } = await db
    .from("products")
    .insert({
      condition: "new",
      kind: "sale",
      name_ar: "أسطوانة للاختبار",
      name_en: "E2E Shop Record",
      price: 24_750,
      slug,
      status: "active",
    })
    .select("id")
    .single();
  if (productError) {
    throw productError;
  }
  // The shop lists it from Selling → Listings: find, sell this, offer.
  await page.getByRole("link", { exact: true, name: "Listings" }).click();
  await expect(page).toHaveURL(/\/selling\/listings$/);
  await page.getByLabel("ISBN, barcode or title").fill("E2E Shop Record");
  await page.getByRole("button", { exact: true, name: "Find" }).click();
  await page.getByRole("button", { name: "Sell this" }).click();
  await page.getByRole("combobox", { name: "Condition" }).click();
  await page.getByRole("option", { name: "Used" }).click();
  await page.getByLabel("Price (IQD)").fill("14750");
  await page.getByLabel("Copies").fill("1");
  await page.getByRole("button", { name: "Add my offer" }).click();
  await expect(page.getByText("1 available · 0 sold")).toBeVisible();
  await expectAccessible(page);

  // The website lists the shop's offer and the cart line names the shop.
  await context.addCookies(await sessionCookies(customer.email, urls.web));
  await page.goto(`${urls.web}/store/${slug}`);
  const offer = page.getByRole("button", { name: /Sold by E2E Records/ });
  await expect(offer).toHaveAttribute("aria-pressed", "true");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto(`${urls.web}/cart`);
  await expect(page.getByText(/Sold by E2E Records/)).toBeVisible();
  await expectAccessible(page);

  await db.from("cart_items").delete().eq("product_id", record.id);
  await db.from("stock_items").delete().eq("product_id", record.id);
  await db.from("products").delete().eq("id", record.id);
});
