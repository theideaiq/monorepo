import { expect, test } from "@playwright/test";
import {
  clearInbox,
  customer,
  emailedCode,
  product,
  signUpUser,
  unknownEmail,
} from "../fixtures";
import { urls } from "../playwright.config";
import { accountExists, resetCustomer, resetSignUpUser } from "../seed";
import {
  expectAccessible,
  expectSignedInHome,
  signIn,
  watchConsole,
} from "./helpers";

const WELCOME = /^Welcome to/;
const NOTIFICATIONS = /^Notifications/;
const cartReturnTo = `?return_to=${encodeURIComponent("/cart")}`;

test("sign up on The IDEA Pass with an emailed code", async ({ page }) => {
  await resetSignUpUser();
  // The IDEA Pass sign-up is a page of the website.
  await page.goto(`${urls.web}/sign-up`);
  await expect(page).toHaveURL(`${urls.web}/sign-up`);
  await expect(
    page.getByRole("heading", { name: "Get The IDEA Pass" })
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Full name").fill(signUpUser.name);
  await page.getByLabel("Email").fill(signUpUser.email);
  await clearInbox(signUpUser.email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText(`We emailed a 6-digit code to ${signUpUser.email}.`)
  ).toBeVisible();
  await expectAccessible(page);
  // Filling the last slot submits the code.
  await page
    .getByLabel("Verification code")
    .fill(await emailedCode(signUpUser.email));

  // New members may be asked to confirm their name and language first.
  const onboarding = page.getByRole("heading", { name: WELCOME });
  const bell = page.getByRole("button", { name: NOTIFICATIONS });
  await expect(onboarding.or(bell)).toBeVisible({ timeout: 15_000 });
  if (await onboarding.isVisible()) {
    await expect(page.getByLabel("Full name")).toHaveValue(signUpUser.name);
    await expectAccessible(page);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  // My Pass greets the new member and shows their email.
  await expectSignedInHome(page);
  await expect(page.getByText(signUpUser.email)).toBeVisible();
});

test("sign in on The IDEA Pass with an emailed code and go back", async ({
  page,
}) => {
  await resetCustomer();
  await page.goto(`${urls.web}/sign-in${cartReturnTo}`);
  await page.getByLabel("Email").fill(customer.email);
  await clearInbox(customer.email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText(`We emailed a 6-digit code to ${customer.email}.`)
  ).toBeVisible();

  // A wrong code is refused and can be retried.
  await page.getByLabel("Verification code").fill("000000");
  await expect(
    page.getByText("That code is incorrect or has expired.")
  ).toBeVisible();
  await page
    .getByLabel("Verification code")
    .fill(await emailedCode(customer.email));
  await expect(page).toHaveURL(`${urls.web}/cart`, { timeout: 15_000 });
});

test("sign-in with an unknown email offers sign-up", async ({ page }) => {
  await resetSignUpUser();
  await page.goto(`${urls.web}/sign-in${cartReturnTo}`);
  await page.getByLabel("Email").fill(unknownEmail);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText("There's no The IDEA Pass with this email yet.")
  ).toBeVisible();
  await expectAccessible(page);
  await page
    .getByRole("link", { name: "Get The IDEA Pass with this email" })
    .click();
  await expect(page).toHaveURL(`${urls.web}/sign-up${cartReturnTo}`);
  // Signing in never creates a Pass.
  expect(await accountExists(unknownEmail)).toBe(false);
});

test("the sign-in page is accessible in Arabic", async ({ page }) => {
  await page.goto(`${urls.web}/ar/sign-in`);
  await expect(page).toHaveURL(`${urls.web}/ar/sign-in`);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "تسجيل الدخول إلى The IDEA Pass" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test("signed out, the cart sends you to The IDEA Pass and back", async ({
  page,
}) => {
  await page.goto(`${urls.web}/cart`);
  await expect(page).toHaveURL(
    `${urls.web}/sign-in?return_to=${encodeURIComponent("/cart")}`
  );
  await expect(
    page.getByRole("heading", { name: "Sign in to The IDEA Pass" })
  ).toBeVisible();
});

test("app-link files are served without a locale redirect", async ({
  request,
}) => {
  for (const file of ["apple-app-site-association", "assetlinks.json"]) {
    const response = await request.get(`${urls.web}/.well-known/${file}`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("json");
  }
});

test("old links open the new pages", async ({ page, request }) => {
  await page.goto(`${urls.web}/store/product?slug=${product.slug}`);
  await expect(page).toHaveURL(
    new RegExp(`/store/${product.slug}\\?slug=${product.slug}$`)
  );
  // Links stored before My Pass moved under /pass, and Spark's old pages.
  for (const [from, to] of [
    [`${urls.web}/orders/view?id=o1`, "/pass/orders/o1"],
    [`${urls.web}/support`, "/pass/support"],
    [`${urls.app}/cart`, `${urls.web}/cart`],
  ]) {
    const response = await request.get(from, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.headers().location).toContain(to);
  }
});

test.describe("a signed-in customer", () => {
  test.beforeEach(async ({ context }) => {
    await resetCustomer();
    await signIn(context, customer.email);
  });

  test("browses the store, adds to the cart and the wishlist", async ({
    page,
  }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass`);
    await expectSignedInHome(page);
    await expectAccessible(page);

    await page.goto(`${urls.web}/store`);
    await page.getByRole("link", { name: product.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/store/${product.slug}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: product.name })
    ).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Added to your cart." })
    ).toBeVisible();
    const save = page.getByRole("button", { exact: true, name: "Save" });
    await save.click();
    await expect(
      page.getByRole("button", { exact: true, name: "Saved" })
    ).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("link", { name: "View cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Checkout" })).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.web}/pass/wishlist`);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("opens a support ticket", async ({ page }) => {
    const subject = `Delivery question ${Date.now()}`;
    await page.goto(`${urls.web}/pass/support/new`);
    await expect(
      page.getByRole("heading", { name: "New support request" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Subject").fill(subject);
    await page
      .getByLabel("Message")
      .fill("When will my order arrive in Erbil?");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page).toHaveURL(/\/pass\/support\/(?!new$)[^/?]+$/);
    await expect(page.getByText(subject).first()).toBeVisible();
    await expect(
      page.getByText("When will my order arrive in Erbil?")
    ).toBeVisible();

    await page.goto(`${urls.web}/pass/support`);
    await expect(page.getByText(subject)).toBeVisible();
  });

  test("sees the notification bell, then signs out", async ({ page }) => {
    await page.goto(`${urls.web}/pass`);
    const bell = page.getByRole("button", {
      name: "Notifications, 1 unread",
    });
    await expect(bell).toBeVisible();
    await bell.click();
    const panel = page.getByRole("dialog");
    await expect(panel.getByText("Notice")).toBeVisible();
    await expectAccessible(page);
    await panel.getByRole("button", { name: "Mark all as read" }).click();
    await expect(
      page.getByRole("button", { exact: true, name: "Notifications" })
    ).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
    await page.goto(`${urls.web}/pass/wishlist`);
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
  });
});
