import { expect, test } from "@playwright/test";
import { admin, customer } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer } from "../seed";
import { expectAccessible, signIn } from "./helpers";

/** A partner site for Sign in with The IDEA Pass (its return address is the website). */
const partner = {
  clientId: "pass_e2e000000000000000000000",
  name: "E2E Partner",
  redirect: `${urls.web}/e2e-partner/callback`,
};

const seedPartner = async (answers = ["profile", "email", "student"]) => {
  const { error } = await admin()
    .from("pass_partners")
    .upsert({
      active: true,
      answers,
      client_id: partner.clientId,
      name: partner.name,
      redirect_uris: [partner.redirect],
      secret_hash: "0".repeat(64),
      website: "https://partner.example",
    });
  if (error) {
    throw error;
  }
};

const authorizeUrl = (
  redirect = partner.redirect,
  scope = "openid profile student"
) =>
  `${urls.web}/oauth/authorize?${new URLSearchParams({
    client_id: partner.clientId,
    code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    code_challenge_method: "S256",
    nonce: "e2e-nonce",
    redirect_uri: redirect,
    response_type: "code",
    scope,
    state: "e2e-state",
  })}`;

/** `?return_to=…` as the website writes it (a path or URL, encoded). */
const returnTo = (path: string) => `?return_to=${encodeURIComponent(path)}`;

test.describe("The IDEA Pass", () => {
  test("the student check asks for the university first, in both languages", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/verify`);
    await expect(
      page.getByRole("heading", { name: "Verify you're a student" })
    ).toBeVisible();
    await page.getByLabel("University").selectOption("auib");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.web}/ar/verify`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { name: "تحقّق من أنك طالب" })
    ).toBeVisible();
    await expectAccessible(page);
  });

  test("is branded and accessible in both languages", async ({ page }) => {
    await page.goto(`${urls.web}/sign-in`);
    await expect(page).toHaveTitle(/The IDEA Pass/);
    // Waits out a moment where hydration briefly shows the form twice, but
    // still fails if a second field stays.
    await expect(page.getByLabel("Email")).toHaveCount(1);
    await expect(page.getByLabel("Email")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.web}/ar/sign-in`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByLabel("البريد الإلكتروني")).toHaveCount(1);
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expectAccessible(page);
  });

  test("the website's “Sign in” comes back to the same page", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/store`);
    await expect(
      page.getByRole("link", { name: "Sign in" }).first()
    ).toHaveAttribute("href", `/sign-in${returnTo("/store")}`);
  });

  test("signed out, Your Pass asks to sign in", async ({ page }) => {
    await page.goto(`${urls.web}/pass`);
    await expect(page).toHaveURL(`${urls.web}/sign-in${returnTo("/pass")}`);
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ context }) => {
      await resetCustomer();
      await signIn(context, customer.email);
    });

    test("a partner site asks first, then gets a code", async ({ page }) => {
      await seedPartner();
      await page.goto(authorizeUrl());
      await expect(
        page.getByRole("heading", {
          name: `${partner.name} wants you to sign in with The IDEA Pass`,
        })
      ).toBeVisible();
      await expect(page.getByText("Your name")).toBeVisible();
      await expect(page.getByText(/verified student/)).toBeVisible();
      await expect(page.getByText("Your email address")).toHaveCount(0);
      await expectAccessible(page);

      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForURL(/\/e2e-partner\/callback\?/);
      const back = new URL(page.url());
      expect(back.searchParams.get("code")).toMatch(/^[0-9a-f]{64}$/);
      expect(back.searchParams.get("state")).toBe("e2e-state");

      // Coming back, the member isn't asked again.
      await page.goto(authorizeUrl());
      await page.waitForURL(/\/e2e-partner\/callback\?/);
      expect(new URL(page.url()).searchParams.get("code")).toMatch(
        /^[0-9a-f]{64}$/
      );

      // Settings lists it; disconnecting removes it.
      await page.goto(`${urls.web}/pass/settings`);
      const sites = page.locator("#sites");
      await expect(sites.getByText(partner.name)).toBeVisible();
      await sites.getByRole("button", { name: "Disconnect" }).click();
      await expect(page.locator("#sites")).toHaveCount(0);
    });

    test("asks for the address and organizations item by item", async ({
      page,
    }) => {
      await seedPartner(["profile", "address", "organizations"]);
      await page.goto(
        authorizeUrl(partner.redirect, "openid profile address organizations")
      );
      const address = page.getByRole("checkbox", {
        name: /Your default delivery address/,
      });
      const organizations = page.getByRole("checkbox", {
        name: /The organizations you belong to in Partners/,
      });
      await expect(address).toBeVisible();
      await expect(organizations).toBeVisible();
      await expectAccessible(page);
    });

    test("an unknown return address gets nothing", async ({ page }) => {
      await seedPartner();
      await page.goto(authorizeUrl("https://evil.example/callback"));
      await expect(
        page.getByRole("heading", {
          name: "This site can't use The IDEA Pass",
        })
      ).toBeVisible();
      await expect(page).toHaveURL(/\/oauth\/authorize\?/);
    });

    test("shows Your Pass and signs out everywhere", async ({ page }) => {
      await page.goto(`${urls.web}/pass`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Your Pass" })
      ).toBeVisible();
      await expect(page.getByText(customer.name).first()).toBeVisible();
      // Customers have no Staff.
      await expect(page.getByRole("link", { name: "Open Staff" })).toHaveCount(
        0
      );
      await expectAccessible(page);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(`${urls.web}/sign-in`);
      // The shared session is gone for Partners too.
      await page.goto(`${urls.app}/settings/invoices`);
      await expect(page).toHaveURL(
        new RegExp(`^${urls.web}/sign-in\\?return_to=`)
      );
    });

    test("sends you on to allowed sites only", async ({ page }) => {
      await page.goto(`${urls.web}/sign-in${returnTo("/pass/saved")}`);
      await expect(page).toHaveURL(`${urls.web}/pass/saved`);

      // Another site of The IDEA (here Partners) is allowed too.
      await page.goto(
        `${urls.web}/sign-in${returnTo(`${urls.app}/settings/invoices`)}`
      );
      await expect(page).toHaveURL(`${urls.app}/settings/invoices`);

      // Anywhere else falls back to the website.
      await page.goto(`${urls.web}/sign-in${returnTo("https://example.com/")}`);
      await expect(page).toHaveURL(new RegExp(`^${urls.web}/`));
    });

    test("a sign-out link from another site doesn't sign you out", async ({
      page,
    }) => {
      // A direct navigation (no same-site Sec-Fetch-Site) lands on Your Pass.
      await page.goto(`${urls.web}/sign-out`);
      await expect(page).toHaveURL(`${urls.web}/pass`);
      await expect(
        page.getByRole("heading", { level: 1, name: "Your Pass" })
      ).toBeVisible();
    });
  });
});
