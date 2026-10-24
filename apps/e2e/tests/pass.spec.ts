import { expect, test } from "@playwright/test";
import { customer } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer } from "../seed";
import { expectAccessible, signIn } from "./helpers";

test.describe("The IDEA Pass", () => {
  test("is branded and accessible in both languages", async ({ page }) => {
    await page.goto(`${urls.pass}/en/sign-up`);
    await expect(page).toHaveTitle(/The IDEA Pass/);
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.pass}/ar/sign-in`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByLabel("رقم الهاتف المحمول")).toBeVisible();
    await expectAccessible(page);
  });

  test("the website's “Sign in” opens it, coming back to the app", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/en`);
    await expect(
      page.getByRole("link", { name: "Sign in" }).first()
    ).toHaveAttribute(
      "href",
      `${urls.pass}/en/sign-in?return_to=${encodeURIComponent(`${urls.app}/en`)}`
    );
  });

  test("signed out, “Your Pass” asks to sign in", async ({ page }) => {
    await page.goto(`${urls.pass}/en`);
    await expect(page).toHaveURL(`${urls.pass}/en/sign-in`);
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ context }) => {
      await resetCustomer();
      await signIn(context, customer.email);
    });

    test("shows your Pass and signs out everywhere", async ({ page }) => {
      await page.goto(`${urls.pass}/en`);
      await expect(
        page.getByRole("heading", { name: "Your Pass" })
      ).toBeVisible();
      await expect(page.getByText(customer.name)).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Open The IDEA app" })
      ).toHaveAttribute("href", `${urls.app}/en`);
      await expectAccessible(page);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(`${urls.pass}/en/sign-in`);
      // The shared session is gone for the app too.
      await page.goto(`${urls.app}/en/cart`);
      await expect(page).toHaveURL(new RegExp(`^${urls.pass}/en/sign-in`));
    });

    test("sends you on to allowed sites only", async ({ page }) => {
      await page.goto(
        `${urls.pass}/en/sign-in?return_to=${encodeURIComponent(`${urls.app}/en/wishlist`)}`
      );
      await expect(page).toHaveURL(`${urls.app}/en/wishlist`);

      // Anywhere else falls back to the app.
      await page.goto(
        `${urls.pass}/en/sign-in?return_to=${encodeURIComponent("https://example.com/")}`
      );
      await expect(page).toHaveURL(new RegExp(`^${urls.app}/`));
    });

    test("a sign-out link from another site doesn't sign you out", async ({
      page,
    }) => {
      // A direct navigation (no same-site Sec-Fetch-Site) lands on Your Pass.
      await page.goto(`${urls.pass}/en/sign-out`);
      await expect(page).toHaveURL(`${urls.pass}/en`);
      await expect(
        page.getByRole("heading", { name: "Your Pass" })
      ).toBeVisible();
    });
  });
});
