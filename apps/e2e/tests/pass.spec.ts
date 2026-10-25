import { expect, test } from "@playwright/test";
import { customer } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer } from "../seed";
import { expectAccessible, signIn } from "./helpers";

/** `?return_to=…` as the website writes it (a path or URL, encoded). */
const returnTo = (path: string) => `?return_to=${encodeURIComponent(path)}`;

test.describe("The IDEA Pass", () => {
  test("is branded and accessible in both languages", async ({ page }) => {
    await page.goto(`${urls.web}/en/sign-up`);
    await expect(page).toHaveTitle(/The IDEA Pass/);
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.web}/ar/sign-in`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expectAccessible(page);
  });

  test("the website's “Sign in” comes back to the same page", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/en/store`);
    await expect(
      page.getByRole("link", { name: "Sign in" }).first()
    ).toHaveAttribute("href", `/en/sign-in${returnTo("/en/store")}`);
  });

  test("signed out, My Pass asks to sign in", async ({ page }) => {
    await page.goto(`${urls.web}/en/pass`);
    await expect(page).toHaveURL(
      `${urls.web}/en/sign-in${returnTo("/en/pass")}`
    );
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ context }) => {
      await resetCustomer();
      await signIn(context, customer.email);
    });

    test("shows My Pass and signs out everywhere", async ({ page }) => {
      await page.goto(`${urls.web}/en/pass`);
      await expect(
        page.getByRole("heading", { level: 1, name: "My Pass" })
      ).toBeVisible();
      await expect(page.getByText(customer.name).first()).toBeVisible();
      // Customers have no back office.
      await expect(
        page.getByRole("link", { name: "Open the back office" })
      ).toHaveCount(0);
      await expectAccessible(page);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(`${urls.web}/en/sign-in`);
      // The shared session is gone for The IDEA Spark too.
      await page.goto(`${urls.app}/en/business`);
      await expect(page).toHaveURL(
        new RegExp(`^${urls.web}/en/sign-in\\?return_to=`)
      );
    });

    test("sends you on to allowed sites only", async ({ page }) => {
      await page.goto(`${urls.web}/en/sign-in${returnTo("/en/pass/wishlist")}`);
      await expect(page).toHaveURL(`${urls.web}/en/pass/wishlist`);

      // Another site of The IDEA (here The IDEA Spark) is allowed too.
      await page.goto(
        `${urls.web}/en/sign-in${returnTo(`${urls.app}/en/business`)}`
      );
      await expect(page).toHaveURL(`${urls.app}/en/business`);

      // Anywhere else falls back to the website.
      await page.goto(
        `${urls.web}/en/sign-in${returnTo("https://example.com/")}`
      );
      await expect(page).toHaveURL(new RegExp(`^${urls.web}/`));
    });

    test("a sign-out link from another site doesn't sign you out", async ({
      page,
    }) => {
      // A direct navigation (no same-site Sec-Fetch-Site) lands on My Pass.
      await page.goto(`${urls.web}/en/sign-out`);
      await expect(page).toHaveURL(`${urls.web}/en/pass`);
      await expect(
        page.getByRole("heading", { level: 1, name: "My Pass" })
      ).toBeVisible();
    });
  });
});
