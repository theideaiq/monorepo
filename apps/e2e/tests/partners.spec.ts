import { expect, test } from "@playwright/test";
import { admin, customer, sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCompany } from "../seed";
import { expectAccessible } from "./helpers";

const REQUEST_PATH = /\/team\/([0-9a-f-]{36})$/;

test("a company adds Team, sends a bulk request and accepts the quote", async ({
  context,
  page,
}) => {
  await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  // A new organization starts with Home and Organization; it adds sections.
  await page.goto(urls.app);
  await expect(
    page.getByRole("link", { exact: true, name: "Team" })
  ).toHaveCount(0);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add Team" }).click();
  await page.getByRole("link", { exact: true, name: "Team" }).click();
  await expect(page).toHaveURL(/\/team$/);
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
  // Plus for the company's people is Team's second tab.
  await page.getByRole("link", { exact: true, name: "Team" }).click();
  await page.getByRole("link", { exact: true, name: "Plus" }).click();
  await expect(page).toHaveURL(/\/team\/plus$/);
  await expect(
    page.getByText("No one has Plus through your company yet.")
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

  // The verified domain verifies the organization at once (in Arabic, the
  // language chosen above).
  await page.goto(`${urls.app}/ar/organization`);
  const verification = page.locator("#verification");
  await verification.getByRole("button", { exact: true, name: "وثّق" }).click();
  await expect(
    verification.getByText("وُثّقت في", { exact: false })
  ).toBeVisible();
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
  await expect(page.getByText("In review", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Individual trader", { exact: true }).first()
  ).toBeVisible();
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

  // Many at once from a spreadsheet: a new product and a row to fix.
  const uploadBarcode = "2000000000015";
  const removeUploaded = async () => {
    const { data: uploaded } = await db
      .from("product_variants")
      .select("product_id")
      .eq("barcode", uploadBarcode);
    for (const variant of uploaded ?? []) {
      await db
        .from("stock_items")
        .delete()
        .eq("product_id", variant.product_id);
      await db.from("products").delete().eq("id", variant.product_id);
    }
  };
  await removeUploaded();
  await page.getByLabel("CSV file").setInputFiles({
    buffer: Buffer.from(
      [
        "barcode,condition,price,quantity,name_en,name_ar,category",
        `${uploadBarcode},new,19750,2,E2E Uploaded Record,أسطوانة مرفوعة,music`,
        "2000000000022,new,100,1,,,",
      ].join("\n")
    ),
    mimeType: "text/csv",
    name: "listings.csv",
  });
  await expect(
    page.getByText("Found: 0 · New products: 1 · To fix: 1")
  ).toBeVisible();
  await expect(
    page.getByText("Enter a price of at least 250 IQD.")
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Send the ready rows (1)" }).click();
  await expect(page.getByText("Sent: 1 · Refused: 0")).toBeVisible();
  await expect(page.getByText("2 available · 0 sold")).toBeVisible();

  // Both items as one offer: a bundle, listed as a product of its own.
  const removeBundle = async () => {
    const { data: bundles } = await db
      .from("products")
      .select("id")
      .eq("name_en", "E2E Record Bundle");
    for (const bundle of bundles ?? []) {
      await db.from("stock_items").delete().eq("product_id", bundle.id);
      await db.from("products").delete().eq("id", bundle.id);
    }
  };
  await removeBundle();
  await page.getByRole("button", { name: "Make a bundle" }).click();
  await page.getByLabel("E2E Shop Record", { exact: true }).check();
  await page.getByLabel("E2E Uploaded Record", { exact: true }).check();
  await page.getByLabel("How many of E2E Uploaded Record").fill("2");
  const bundleForm = page.locator("form").filter({ hasText: "What's in it" });
  await bundleForm.getByLabel("Name in English").fill("E2E Record Bundle");
  await bundleForm.getByLabel("Name in Arabic").fill("حزمة أسطوانات");
  await bundleForm.getByRole("combobox", { name: "Category" }).click();
  await page.getByRole("option", { name: "Music" }).click();
  await bundleForm.getByLabel("Price (IQD)").fill("49750");
  await bundleForm.getByLabel("Copies").fill("1");
  await expectAccessible(page);
  await page.getByRole("button", { name: "List the bundle" }).click();
  await expect(page.getByText("E2E Record Bundle")).toBeVisible();
  const { data: bundle } = await db
    .from("products")
    .select("slug")
    .eq("name_en", "E2E Record Bundle")
    .single();
  await page.goto(`${urls.web}/store/${bundle?.slug}`);
  const contents = page.getByRole("region", { name: "In this bundle" });
  await expect(contents.getByRole("link")).toHaveText([
    "E2E Shop Record",
    "E2E Uploaded Record",
  ]);
  await expect(contents.getByText("2 ×")).toBeVisible();
  await expectAccessible(page);
  await removeBundle();
  await removeUploaded();

  // Selling → Auctions: put one of its copies up for auction.
  await page.goto(`${urls.app}/selling/auctions`);
  await expect(page.getByText("Put a copy up for auction")).toBeVisible();
  await expect(page.getByText("No live auctions.")).toBeVisible();
  await expectAccessible(page);

  // Selling → Get offers: members' items to make an offer on.
  await page.goto(`${urls.app}/selling/get-offers`);
  await expect(page.getByText("Items members want to sell")).toBeVisible();
  await expectAccessible(page);

  // The website lists the shop's offer and the cart line names the shop.
  await context.addCookies(await sessionCookies(customer.email, urls.web));
  await page.goto(`${urls.web}/store/${slug}`);
  const offer = page.getByRole("button", { name: /Sold by E2E Records/ });
  await expect(offer).toHaveAttribute("aria-pressed", "true");
  await expectAccessible(page);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Added to your cart." })
  ).toBeVisible();
  await page.goto(`${urls.web}/cart`);
  await expect(page.getByText(/Sold by E2E Records/)).toBeVisible();
  await expectAccessible(page);

  await db.from("cart_items").delete().eq("product_id", record.id);
  await db.from("stock_items").delete().eq("product_id", record.id);
  await db.from("products").delete().eq("id", record.id);
});

test("a supplier shop sees what it lends The IDEA and what it earned", async ({
  context,
  page,
}) => {
  const organizationId = await resetCompany();
  const db = admin();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  // An approved shop that staff made a supplier, with one kit unit that
  // went out once (Staff's steps and the fee triggers are covered by pgTAP).
  const { data: shop, error } = await db
    .from("sellers")
    .insert({
      name: "E2E Supplies",
      organization_id: organizationId,
      status: "approved",
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  const { data: unit, error: unitError } = await db
    .from("kit_units")
    .insert({ kit_type: "ps5", label: "E2E Unit", seller_id: shop.id })
    .select("id")
    .single();
  if (unitError) {
    throw unitError;
  }
  for (const result of [
    await db.from("supply_terms").insert({
      kit_fee: 5000,
      note: "E2E terms",
      rental_fee: 1000,
      seller_id: shop.id,
    }),
    await db.from("supply_earnings").insert({
      fee: 5000,
      kind: "kit",
      kit_unit_id: unit.id,
      label: "E2E Unit",
      seller_id: shop.id,
    }),
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  // Supply is a section the organization adds from Home, after Selling.
  await page.goto(urls.app);
  await page.getByRole("button", { name: "Add Supply" }).click();
  await page.getByRole("link", { exact: true, name: "Supply" }).click();
  await expect(page).toHaveURL(/\/supply$/);
  await expect(
    page.getByText("per game night booking of one of your kit units", {
      exact: false,
    })
  ).toBeVisible();
  await expect(page.getByText("E2E terms")).toBeVisible();
  await expect(page.getByText("Times out: 1")).toBeVisible();
  await expect(page.getByText("Game night with E2E Unit")).toBeVisible();
  await expect(page.getByText("In your next payout")).toBeVisible();
  await expectAccessible(page);
});

test("a company posts an opportunity and sends it for review", async ({
  context,
  page,
}) => {
  const organizationId = await resetCompany();
  const db = admin();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  // Opportunities is a section the organization adds from Home.
  await page.goto(urls.app);
  await page.getByRole("button", { name: "Add Opportunities" }).click();
  await page.getByRole("link", { exact: true, name: "Opportunities" }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(page.getByText("No opportunities yet.")).toBeVisible();

  await page.getByRole("button", { name: "New opportunity" }).click();
  await page.getByLabel("Title in English").fill("E2E Summer Internship");
  await page.getByLabel("Title in Arabic").fill("تدريب صيفي للاختبار");
  await page.getByLabel("Online (can be done from anywhere)").check();
  await page.getByLabel("Where to apply").fill("https://e2e.example/apply");
  await expectAccessible(page);
  await page
    .getByRole("button", { exact: true, name: "Send for review" })
    .click();
  await expect(page.getByText("E2E Summer Internship")).toBeVisible();
  await expect(page.getByText("In review", { exact: true })).toBeVisible();
  await expectAccessible(page);

  // The IDEA's editors approve it (Staff's steps are covered in admin.spec).
  const { error } = await db
    .from("opportunities")
    .update({ status: "approved" })
    .eq("organization_id", organizationId);
  if (error) {
    throw error;
  }
  await page.reload();
  await expect(page.getByText("Listed", { exact: true })).toBeVisible();
  await expect(page.getByText("Following: 0")).toBeVisible();
});
