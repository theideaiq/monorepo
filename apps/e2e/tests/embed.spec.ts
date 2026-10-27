import { expect, test } from "@playwright/test";
import { customer } from "../fixtures";
import { urls } from "../playwright.config";
import { embedPartner, resetCustomer, seedEmbedPartner } from "../seed";
import { signIn } from "./helpers";

const embedUrl = `${urls.web}/pass/embed?client_id=${embedPartner.clientId}`;

/** The partner's members page, served at its own origin, framing the card. */
const partnerPage = `<!doctype html>
<html><body>
<h1>Members</h1>
<iframe title="The IDEA Pass card" src="${embedUrl}" style="width:420px;height:320px;border:0"></iframe>
<script>
  window.heights = [];
  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "idea-pass-card") {
      window.heights.push(event.data.height);
    }
  });
</script>
</body></html>`;

// The stand-in partner origin is "public" and the site runs on localhost:
// Chromium's local network checks would block the frame (not so in
// production, where both are public).
test.use({
  launchOptions: { args: ["--disable-features=LocalNetworkAccessChecks"] },
});

test.describe("the live card on a partner's site", () => {
  test.beforeEach(async ({ context }) => {
    await resetCustomer();
    await seedEmbedPartner();
    await signIn(context, customer.email);
    await context.route(`${embedPartner.origin}/**`, (route) =>
      route.fulfill({ body: partnerPage, contentType: "text/html" })
    );
  });

  test("only the app's domains may frame it", async ({ request }) => {
    const response = await request.get(embedUrl);
    const policy = response.headers()["content-security-policy"] ?? "";
    expect(policy).toContain(
      `frame-ancestors 'self' https://*.sal.test ${embedPartner.origin};`
    );
    expect(policy).not.toContain("telegram");

    const other = await request.get(
      `${urls.web}/pass/embed?client_id=pass_000000000000000000000000`
    );
    expect(other.headers()["content-security-policy"]).toContain(
      "frame-ancestors 'none'"
    );
  });

  test("the member allows it once, then sees the live code", async ({
    page,
  }) => {
    await page.goto(`${embedPartner.origin}/members`);
    const frame = page.frameLocator("iframe");

    // Our cookie stays out of other sites' frames: the member connects it.
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      frame.getByRole("button", { name: "Show my Pass card" }).click(),
    ]);
    await expect(
      popup.getByRole("heading", {
        name: `Show your Pass card on ${embedPartner.name}?`,
      })
    ).toBeVisible();
    await popup.getByRole("button", { name: "Show my card" }).click();
    await popup.waitForEvent("close");

    await expect(frame.getByText(customer.name)).toBeVisible();
    await expect(frame.getByText(/^\d{3} \d{3}$/)).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () => (window as { heights?: number[] }).heights?.length ?? 0
        )
      )
      .toBeGreaterThan(0);

    // Reloading keeps it (this site's own storage of the frame).
    await page.reload();
    await expect(
      page.frameLocator("iframe").getByText(/^\d{3} \d{3}$/)
    ).toBeVisible();

    // Settings lists it; stopping it there ends the frame's token.
    await page.goto(`${urls.web}/pass/settings`);
    const sites = page.locator("#sites");
    await expect(sites.getByText("Sites showing your live card")).toBeVisible();
    await sites.getByRole("button", { name: "Stop" }).click();
    await expect(sites.getByText("Sites showing your live card")).toHaveCount(
      0
    );

    await page.goto(`${embedPartner.origin}/members`);
    await expect(
      page
        .frameLocator("iframe")
        .getByRole("button", { name: "Show my Pass card" })
    ).toBeVisible();
  });
});
