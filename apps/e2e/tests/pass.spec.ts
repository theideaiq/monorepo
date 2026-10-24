import { expect, test } from "@playwright/test";
import { customer } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer } from "../seed";
import { expectAccessible, signIn } from "./helpers";

/** `?return_to=…` as The IDEA Spark writes it (a path, encoded). */
const returnTo = (path: string) => `?return_to=${encodeURIComponent(path)}`;

test.describe("The IDEA Pass", () => {
  test("is branded and accessible in both languages", async ({ page }) => {
    await page.goto(`${urls.app}/en/sign-up`);
    await expect(page).toHaveTitle(/The IDEA Pass/);
    await expect(page.getByLabel("Full name")).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.app}/ar/sign-in`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByLabel("البريد الإلكتروني")).toBeVisible();
    await expectAccessible(page);
  });

  test("the website's “Sign in” opens it on The IDEA Spark", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/en`);
    await expect(
      page.getByRole("link", { name: "Sign in" }).first()
    ).toHaveAttribute(
      "href",
      `${urls.app}/en/sign-in?return_to=${encodeURIComponent(`${urls.app}/en`)}`
    );
  });

  test("signed out, “Your Pass” asks to sign in", async ({ page }) => {
    await page.goto(`${urls.app}/en/pass`);
    await expect(page).toHaveURL(
      `${urls.app}/en/sign-in${returnTo("/en/pass")}`
    );
  });

  test.describe("signed in", () => {
    test.beforeEach(async ({ context }) => {
      await resetCustomer();
      await signIn(context, customer.email);
    });

    test("shows your Pass and signs out everywhere", async ({ page }) => {
      await page.goto(`${urls.app}/en/pass`);
      await expect(
        page.getByRole("heading", { name: "Your Pass" })
      ).toBeVisible();
      await expect(page.getByText(customer.name)).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Open The IDEA Spark" })
      ).toHaveAttribute("href", "/en");
      // Customers have no back office.
      await expect(
        page.getByRole("link", { name: "Open the back office" })
      ).toHaveCount(0);
      await expectAccessible(page);

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(`${urls.app}/en/sign-in`);
      // The shared session is gone for the app too.
      await page.goto(`${urls.app}/en/cart`);
      await expect(page).toHaveURL(
        new RegExp(`^${urls.app}/en/sign-in\\?return_to=`)
      );
    });

    test("sends you on to allowed sites only", async ({ page }) => {
      await page.goto(`${urls.app}/en/sign-in${returnTo("/en/wishlist")}`);
      await expect(page).toHaveURL(`${urls.app}/en/wishlist`);

      // Another site of The IDEA (here the website) is allowed too.
      await page.goto(
        `${urls.app}/en/sign-in${returnTo(`${urls.web}/en/store`)}`
      );
      await expect(page).toHaveURL(`${urls.web}/en/store`);

      // Anywhere else falls back to The IDEA Spark.
      await page.goto(
        `${urls.app}/en/sign-in${returnTo("https://example.com/")}`
      );
      await expect(page).toHaveURL(new RegExp(`^${urls.app}/`));
    });

    test("a sign-out link from another site doesn't sign you out", async ({
      page,
    }) => {
      // A direct navigation (no same-site Sec-Fetch-Site) lands on Your Pass.
      await page.goto(`${urls.app}/en/sign-out`);
      await expect(page).toHaveURL(`${urls.app}/en/pass`);
      await expect(
        page.getByRole("heading", { name: "Your Pass" })
      ).toBeVisible();
    });
  });
});
