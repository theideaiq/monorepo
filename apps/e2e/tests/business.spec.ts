import { expect, test } from "@playwright/test";
import { admin, customer, sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCompany } from "../seed";
import { expectAccessible } from "./helpers";

const REQUEST_PATH = /\/procurement\/([0-9a-f-]{36})$/;
const JOB_PATH = /\/hiring\/([0-9a-f-]{36})$/;

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

  // Support's quote (the back office's steps are covered by pgTAP).
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

test("a company posts a job and hires a proposed candidate", async ({
  context,
  page,
}) => {
  await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  await page.goto(`${urls.app}/hiring`);
  await page.getByLabel("Role").fill("Accountant");
  await page.getByLabel("Location").fill("Baghdad");
  await page.getByRole("button", { name: "Post the job" }).click();
  await expect(page).toHaveURL(JOB_PATH);
  await expect(page.getByText("We're looking for candidates.")).toBeVisible();

  // The candidate support proposes (the back office's form is covered by pgTAP).
  const jobId = JOB_PATH.exec(page.url())?.[1] ?? "";
  const { error } = await admin().from("candidates").insert({
    full_name: "Sara Ali",
    headline: "Chartered accountant",
    job_request_id: jobId,
  });
  expect(error).toBeNull();

  await page.reload();
  await expect(page.getByText("Sara Ali")).toBeVisible();
  await page.getByRole("button", { name: "Hire" }).click();
  await expect(page.getByText("Hired")).toBeVisible();
  await expect(page.getByText("Filled")).toBeVisible();
  await expectAccessible(page);
});
