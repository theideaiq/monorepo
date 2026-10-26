import { expect, test } from "@playwright/test";
import {
  clearInbox,
  customer,
  emailedCode,
  product,
  signUpUser,
} from "../fixtures";
import { urls } from "../playwright.config";
import { resetCustomer, resetSignUpUser } from "../seed";
import {
  expectAccessible,
  expectSignedInHome,
  signIn,
  watchConsole,
} from "./helpers";

const WELCOME = /^Welcome to/;
const cartReturnTo = `?return_to=${encodeURIComponent("/cart")}`;

test("a new email gets The IDEA Pass with an emailed code", async ({
  page,
}) => {
  await resetSignUpUser();
  // One sign-in page: an address we don't know gets its Pass.
  await page.goto(`${urls.web}/sign-in`);
  await expect(page).toHaveURL(`${urls.web}/sign-in`);
  await expect(
    page.getByRole("heading", { name: "Sign in to The IDEA Pass" })
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByLabel("Email").fill(signUpUser.email);
  await clearInbox(signUpUser.email);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(
    page.getByText(`We emailed an 8-digit code to ${signUpUser.email}.`)
  ).toBeVisible();
  await expectAccessible(page);
  // Filling the last slot submits the code.
  await page
    .getByLabel("Verification code")
    .fill(await emailedCode(signUpUser.email));

  // Onboarding asks new members for their date of birth (the Pass is for
  // 13 and over), then their name and language.
  await expect(page.getByRole("heading", { name: WELCOME })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByLabel("Your date of birth").fill("1995-04-20");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByLabel("Full name").fill(signUpUser.name);
  await expectAccessible(page);
  await page.getByRole("button", { name: "Continue" }).click();
  // Your Pass greets the new member and shows their email.
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
    page.getByText(`We emailed an 8-digit code to ${customer.email}.`)
  ).toBeVisible();

  // A wrong code is refused and can be retried.
  await page.getByLabel("Verification code").fill("00000000");
  await expect(
    page.getByText("That code is incorrect or has expired.")
  ).toBeVisible();
  await page
    .getByLabel("Verification code")
    .fill(await emailedCode(customer.email));
  await expect(page).toHaveURL(`${urls.web}/cart`, { timeout: 15_000 });
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

test("security.txt is served without a locale redirect", async ({
  request,
}) => {
  const response = await request.get(`${urls.web}/.well-known/security.txt`, {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
  expect(await response.text()).toContain(
    "Policy: https://theideaiq.com/legal/security"
  );
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

    await page.goto(`${urls.web}/saved`);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("opens a support ticket", async ({ page }) => {
    const subject = `Delivery question ${Date.now()}`;
    await page.goto(`${urls.web}/help/new`);
    await expect(
      page.getByRole("heading", { name: "New support request" })
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByLabel("Subject").fill(subject);
    await page
      .getByLabel("Message")
      .fill("When will my order arrive in Erbil?");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page).toHaveURL(/\/help\/(?!new$)[^/?]+$/);
    await expect(page.getByText(subject).first()).toBeVisible();
    await expect(
      page.getByText("When will my order arrive in Erbil?")
    ).toBeVisible();

    await page.goto(`${urls.web}/help`);
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
    await page.goto(`${urls.web}/saved`);
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
  });
});
