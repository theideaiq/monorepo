import { expect, test } from "@playwright/test";
import { admin, customer, sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCompany } from "../seed";
import { expectAccessible } from "./helpers";

const REQUEST_PATH = /\/procurement\/([0-9a-f-]{36})$/;

test("a company sends a procurement request and accepts the quote", async ({
  context,
  page,
}) => {
  await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  await page.goto(`${urls.app}/procurement`);
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

  await page.goto(`${urls.app}/developers`);
  await expect(
    page.getByText("Verify a domain first, then register your app.")
  ).toBeVisible();
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
