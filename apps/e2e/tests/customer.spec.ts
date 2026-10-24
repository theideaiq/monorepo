import { expect, test } from "@playwright/test";
import { customer, phoneUser, product } from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer, resetPhoneUser } from "../seed";
import {
  expectAccessible,
  expectSignedInHome,
  signIn,
  watchConsole,
} from "./helpers";

test("sign up on The IDEA Pass with a mobile number and a code", async ({
  page,
}) => {
  const fresh = await resetPhoneUser();
  // The app's sign-up page hands over to The IDEA Pass, which comes back.
  await page.goto(`${urls.app}/en/sign-up`);
  await expect(page).toHaveURL(
    `${urls.pass}/en/sign-up?return_to=${encodeURIComponent(`${urls.app}/en`)}`
  );
  await expect(
    page.getByRole("heading", { name: "Get The IDEA Pass" })
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Full name").fill(phoneUser.name);
  await page.getByLabel("Mobile number").fill(phoneUser.local);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("We sent a 6-digit code")).toBeVisible();
  // Filling the last slot submits the code.
  await page.getByLabel("Verification code").fill(phoneUser.code);

  // New accounts may be asked to confirm their name and language first.
  const onboarding = page.getByRole("heading", { name: /^Welcome to/ });
  const bell = page.getByRole("button", { name: /^Notifications/ });
  await expect(onboarding.or(bell)).toBeVisible({ timeout: 15_000 });
  if (await onboarding.isVisible()) {
    await expect(page.getByLabel("Full name")).toHaveValue(phoneUser.name);
    await expectAccessible(page);
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await expectSignedInHome(page);
  if (fresh) {
    await expect(
      page.getByRole("button", { name: phoneUser.name })
    ).toBeVisible();
  }
});

test("the sign-in page is accessible in Arabic", async ({ page }) => {
  await page.goto(`${urls.app}/ar/sign-in`);
  await expect(page).toHaveURL(new RegExp(`^${urls.pass}/ar/sign-in\\?`));
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "تسجيل الدخول إلى The IDEA Pass" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectAccessible(page);
});

test("signed out, the app sends you to The IDEA Pass and back", async ({
  page,
}) => {
  await page.goto(`${urls.app}/en/cart`);
  await expect(page).toHaveURL(
    `${urls.pass}/en/sign-in?return_to=${encodeURIComponent(`${urls.app}/en/cart`)}`
  );
  await expect(
    page.getByText(`You'll continue to ${new URL(urls.app).host}.`)
  ).toBeVisible();
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
    await page.goto(`${urls.app}/en`);
    await expectSignedInHome(page);
    await expectAccessible(page);

    await page.goto(`${urls.app}/en/store`);
    await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();
    await page.getByRole("link", { name: product.name }).first().click();
    await expect(page).toHaveURL(
      new RegExp(`/en/store/product\\?slug=${product.slug}$`)
    );
    await expect(
      page.getByRole("heading", { name: product.name })
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
    await expect(page).toHaveURL(/\/en\/cart$/);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Checkout" })).toBeVisible();
    await expectAccessible(page);

    await page.goto(`${urls.app}/en/wishlist`);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("opens a support ticket", async ({ page }) => {
    const subject = `Delivery question ${Date.now()}`;
    await page.goto(`${urls.app}/en/support/new`);
    await expect(
      page.getByRole("heading", { name: "New support request" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Subject").fill(subject);
    await page
      .getByLabel("Message")
      .fill("When will my order arrive in Erbil?");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page).toHaveURL(/\/en\/support\/view\?id=/);
    await expect(page.getByText(subject).first()).toBeVisible();
    await expect(
      page.getByText("When will my order arrive in Erbil?")
    ).toBeVisible();

    await page.goto(`${urls.app}/en/support`);
    await expect(page.getByText(subject)).toBeVisible();
  });

  test("sees the notification bell, then signs out", async ({ page }) => {
    await page.goto(`${urls.app}/en`);
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

    await page.getByRole("button", { name: customer.name }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(new RegExp(`^${urls.pass}/en/sign-in`));
    await page.goto(`${urls.app}/en/wishlist`);
    await expect(page).toHaveURL(new RegExp(`^${urls.pass}/en/sign-in`));
  });
});
