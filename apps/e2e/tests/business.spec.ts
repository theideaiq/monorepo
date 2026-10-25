import { expect, test } from "@playwright/test";
import { admin, customer, sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCompany } from "../seed";
import { expectAccessible } from "./helpers";

const REQUEST_PATH = /\/business\/procurement\/([0-9a-f-]{36})$/;

test("a company sends a procurement request and accepts the quote", async ({
  context,
  page,
}) => {
  await resetCompany();
  await context.addCookies(await sessionCookies(customer.email, urls.app));

  await page.goto(`${urls.app}/business/procurement`);
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

  await page.getByRole("link", { name: "Invoices" }).click();
  await expect(page.getByText("No invoices yet.")).toBeVisible();
});
