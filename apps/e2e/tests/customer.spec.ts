import { expect, test } from "@playwright/test";
import {
  admin,
  clearInbox,
  customer,
  emailedCode,
  friend,
  product,
  signUpUser,
} from "../fixtures";
import { urls } from "../playwright.config";
import {
  resetCustomer,
  resetFriend,
  resetFriendForPlus,
  resetSignUpUser,
} from "../seed";
import {
  expectAccessible,
  expectSignedInHome,
  signIn,
  watchConsole,
} from "./helpers";

const WELCOME = /^Welcome to/;
const cartReturnTo = `?return_to=${encodeURIComponent("/cart")}`;

const SIGN_UP_PASSWORD = "Baghdad-2026";

test("a new email gets The IDEA Pass with a password and one code", async ({
  page,
}) => {
  await resetSignUpUser();
  await page.goto(`${urls.web}/sign-in`);
  await expect(page).toHaveURL(`${urls.web}/sign-in`);
  await expect(
    page.getByRole("heading", { name: "Sign in to The IDEA Pass" })
  ).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("button", { name: "Get your Pass" }).click();
  await page.getByLabel("Full name").fill(signUpUser.name);
  await page.getByLabel("Email").fill(signUpUser.email);
  // A weak password can't be sent.
  await page.getByLabel("Password").fill("short");
  await expect(
    page.getByRole("button", { name: "Get your Pass" })
  ).toBeDisabled();
  await page.getByLabel("Password").fill(SIGN_UP_PASSWORD);
  await clearInbox(signUpUser.email);
  await page.getByRole("button", { name: "Get your Pass" }).click();
  await expect(
    page.getByText(`We emailed an 8-digit code to ${signUpUser.email}.`)
  ).toBeVisible();
  await expectAccessible(page);
  await page
    .getByLabel("Code from the email")
    .fill(await emailedCode(signUpUser.email));
  await page.getByRole("button", { name: "Confirm" }).click();

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

  // Signed out, a forgotten password is reset with an emailed code.
  await page.context().clearCookies();
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(signUpUser.email);
  await page.getByLabel("Password").fill("wrong-password-1");
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expect(
    page.getByText("That email and password don't match.", { exact: false })
  ).toBeVisible();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByLabel("Email").fill(signUpUser.email);
  await clearInbox(signUpUser.email);
  await page.getByRole("button", { name: "Send the code" }).click();
  await page
    .getByLabel("Code from the email")
    .fill(await emailedCode(signUpUser.email));
  await page.getByLabel("New password").fill(`${SIGN_UP_PASSWORD}x`);
  await expectAccessible(page);
  await page
    .getByRole("button", { name: "Set the password and sign in" })
    .click();
  await expectSignedInHome(page);

  // Settings changes it (a recent sign-in needs no code).
  await page.goto(`${urls.web}/pass/settings`);
  await page.getByLabel("New password").fill(`${SIGN_UP_PASSWORD}y`);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(
    page.getByText("Your password is saved.", { exact: false })
  ).toBeVisible();
  await expectAccessible(page);

  // And the new password signs in.
  await page.context().clearCookies();
  await page.goto(`${urls.web}/sign-in`);
  await page.getByLabel("Email").fill(signUpUser.email);
  await page.getByLabel("Password").fill(`${SIGN_UP_PASSWORD}y`);
  await page.getByRole("button", { exact: true, name: "Sign in" }).click();
  await expectSignedInHome(page);
});

test("sign in on The IDEA Pass with an emailed code and go back", async ({
  page,
}) => {
  await resetCustomer();
  await page.goto(`${urls.web}/sign-in${cartReturnTo}`);
  await page.getByRole("button", { name: "Email me a code instead" }).click();
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

const JOIN_PLAN = /^Join for /;
const KIT_PAGE = /\/kits\/retro$/;
const BAGHDAD = /^Baghdad/;
const CASH_ON_DELIVERY = /^Cash on delivery/;
const PLACE_CASH_ORDER = /^Place order · /;
const PLACE_ORDER = /^Place order and pay /;
const CART_PAGE = /\/cart$/;
const ORDER_PAGE = /\/pass\/orders\/[^/]+$/;
const STUDENT_NUDGE = /^Verify as a student/;

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

    // Saved items live in Your Pass.
    await page.goto(`${urls.web}/pass`);
    await page
      .getByRole("navigation", { name: "Navigation" })
      .getByRole("link", { name: "Saved" })
      .click();
    await expect(page).toHaveURL(`${urls.web}/pass/saved`);
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("rents a game and a book in the cart with something bought", async ({
    page,
  }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/store/elden-ring-ps5`);
    await expect(page.getByText("Rent it on its own")).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Rent it" }).click();
    await expect(page).toHaveURL(CART_PAGE);
    await expect(page.getByText("Elden Ring").first()).toBeVisible();

    // Films, books and games rent together, beside what's bought.
    await page.goto(`${urls.web}/store/one-hundred-years-of-solitude`);
    await page.getByRole("button", { exact: true, name: "Rent it" }).click();
    await expect(page).toHaveURL(CART_PAGE);
    await page.goto(`${urls.web}/store/${product.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("link", { name: "View cart" }).click();
    await expect(page.getByText("Refundable deposits")).toBeVisible();
    await expectAccessible(page);

    await page.getByRole("link", { name: "Checkout" }).click();
    await expect(page.getByLabel("Send as a gift")).toBeDisabled();
    await page.getByRole("combobox", { name: "Governorate" }).click();
    await page.getByRole("option", { name: BAGHDAD }).click();
    await page.getByLabel("Full name").fill(customer.name);
    await page.getByLabel("Mobile number").fill("07701234567");
    await page
      .getByLabel("Address", { exact: true })
      .fill("Street 62, Karrada");
    await page.getByRole("radio", { name: CASH_ON_DELIVERY }).click();
    await expectAccessible(page);
    await page.getByRole("button", { name: PLACE_CASH_ORDER }).click();

    // One order: the purchase, each rent and its deposit.
    await expect(page).toHaveURL(ORDER_PAGE, { timeout: 30_000 });
    await expect(page.getByText(product.name).first()).toBeVisible();
    await expect(
      page.getByText("Refundable deposit: Elden Ring (PS5)")
    ).toBeVisible();
    await expect(
      page.getByText("Refundable deposit: One Hundred Years of Solitude")
    ).toBeVisible();
    noErrors();
  });

  test("tells The IDEA Plus their area in Baghdad to join", async ({
    page,
  }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/plus`);
    // The page's "Join Plus" buttons share the card's title.
    await expect(
      page.locator("#join").getByText("Join Plus", { exact: true })
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Area in Baghdad" }).click();
    await page.getByRole("option", { name: "Karrada" }).click();
    await page.getByLabel("Mobile number").fill("07701234567");
    await page.getByLabel("Address").fill("Street 62, near the park");
    await page.getByRole("button", { exact: true, name: "Save" }).click();
    await expect(
      page.getByText("There's a place for you. Choose a plan below.")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: JOIN_PLAN }).first()
    ).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("books a game night kit for a weekend", async ({ page }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/plus#kits`);
    await page
      .getByRole("listitem")
      .filter({ hasText: "Retro night" })
      .getByRole("link", { name: "Book a weekend" })
      .click();
    await expect(page).toHaveURL(KIT_PAGE);
    await page.getByRole("radio").first().click();
    await expectAccessible(page);
    // The kit goes in the cart and checks out with everything else.
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page).toHaveURL(CART_PAGE);
    await expect(page.getByText("Game night kit")).toBeVisible();
    await page.getByRole("link", { name: "Checkout" }).click();
    await page.getByRole("combobox", { name: "Governorate" }).click();
    await page.getByRole("option", { name: BAGHDAD }).click();
    await page.getByLabel("Full name").fill(customer.name);
    await page.getByLabel("Mobile number").fill("07701234567");
    await page
      .getByLabel("Address", { exact: true })
      .fill("Street 62, Karrada");
    await page.getByRole("radio", { name: CASH_ON_DELIVERY }).click();
    await expectAccessible(page);
    await page.getByRole("button", { name: PLACE_CASH_ORDER }).click();

    await expect(page).toHaveURL(ORDER_PAGE, { timeout: 30_000 });
    await expect(
      page.getByText("Refundable deposit: Retro night")
    ).toBeVisible();
    noErrors();
  });

  test("saves an address, then checks out in one tap", async ({ page }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass/settings`);
    const book = page.locator("#addresses");
    await expect(
      book.getByText("No saved addresses yet.", { exact: false })
    ).toBeVisible();
    await book.getByRole("button", { name: "Add an address" }).click();
    await book.getByLabel("Name", { exact: true }).fill("Home");
    await book.getByLabel("Mobile number").fill("07701234567");
    await book.getByRole("combobox", { name: "Governorate" }).click();
    await page.getByRole("option", { name: BAGHDAD }).click();
    await book.getByLabel("Area").fill("Karrada");
    await book.getByLabel("Address", { exact: true }).fill("Street 62");
    await book.getByLabel("Nearest landmark").fill("Opposite the bakery");
    await expectAccessible(page);
    await book.getByRole("button", { name: "Save address" }).click();
    await expect(book.getByText("Default", { exact: true })).toBeVisible();
    await expect(book.getByText("Opposite the bakery")).toBeVisible();

    await page.goto(`${urls.web}/store/${product.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("link", { name: "View cart" }).click();
    await page.getByRole("link", { name: "Checkout" }).click();

    // The saved address is already chosen: no form to fill.
    await expect(page.getByText("Deliver to Home · Pay online")).toBeVisible();
    await expect(page.getByLabel("Full name")).toHaveCount(0);
    await expectAccessible(page);
    await page.getByRole("radio", { name: CASH_ON_DELIVERY }).click();
    await expect(
      page.getByText("Deliver to Home · Cash on delivery")
    ).toBeVisible();
    await page.getByRole("button", { name: PLACE_CASH_ORDER }).click();
    await expect(page).toHaveURL(ORDER_PAGE);

    const { data } = await admin()
      .from("orders")
      .select("shipping_address")
      .eq("id", page.url().split("/").at(-1) ?? "")
      .single();
    expect(data?.shipping_address).toMatchObject({
      address: "Street 62",
      city: "Karrada",
      landmark: "Opposite the bakery",
    });

    // Next time, checkout remembers cash on delivery.
    await page.goto(`${urls.web}/store/${product.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto(`${urls.web}/checkout`);
    await expect(
      page.getByText("Deliver to Home · Cash on delivery")
    ).toBeVisible();
    noErrors();
  });

  test("sends the cart as a gift, and a friend claims it", async ({
    browser,
    page,
  }) => {
    const startedAt = new Date().toISOString();
    await page.goto(`${urls.web}/store/${product.slug}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.getByRole("link", { name: "View cart" }).click();
    await page.getByRole("link", { name: "Checkout" }).click();

    await page.getByLabel("Send as a gift").check();
    await expect(page.getByLabel("Full name")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Where it goes" }).click();
    await page.getByRole("option", { name: BAGHDAD }).click();
    await page.getByLabel("Your message").fill("Happy birthday!");
    await expectAccessible(page);
    const paying = page.waitForResponse((response) =>
      response.url().endsWith("/orders/checkout")
    );
    await page.getByRole("button", { name: PLACE_ORDER }).click();
    // The payment page opens next (or fails locally); the order exists.
    await paying;
    const db = admin();
    const giftOrder = async () =>
      (
        await db
          .from("orders")
          .select("id")
          .eq("is_gift", true)
          .gte("created_at", startedAt)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
    await expect.poll(giftOrder, { timeout: 30_000 }).not.toBeNull();
    const order = await giftOrder();
    const orderId = order?.id ?? "";
    expect(
      (await db.rpc("complete_order_payment", { order_id: orderId })).error
    ).toBeNull();

    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass/orders/${orderId}`);
    await expect(page.getByText("Sent as a gift")).toBeVisible();
    await page.getByRole("button", { name: "Share the gift link" }).click();
    const link = await page.getByLabel("The gift link").inputValue();
    expect(link).toContain("/gift/");
    await expectAccessible(page);

    // The friend opens the link, signs in and gives their address.
    await resetFriend();
    const context = await browser.newContext();
    await signIn(context, friend.email);
    const gift = await context.newPage();
    await gift.goto(link);
    await expect(gift.getByText("Happy birthday!")).toBeVisible();
    await gift.getByLabel("Full name").fill(friend.name);
    await gift.getByLabel("Mobile number").fill("07701234568");
    await gift.getByLabel("City or district").fill("Mansour");
    await gift.getByLabel("Address", { exact: true }).fill("Street 14");
    await expectAccessible(gift);
    await gift.getByRole("button", { name: "Accept the gift" }).click();
    await expect(gift.getByText("It's yours.", { exact: false })).toBeVisible();
    await context.close();

    const { data: claimed } = await db
      .from("orders")
      .select("shipping_address")
      .eq("id", orderId)
      .single();
    expect(claimed?.shipping_address).toMatchObject({
      address: "Street 14",
      city: "Mansour",
      governorate: "baghdad",
    });
    noErrors();
  });

  test("gives Plus months, and a friend claims them", async ({
    browser,
    page,
  }) => {
    const startedAt = new Date().toISOString();
    await page.goto(`${urls.web}/plus#yours`);
    const give = page.locator("#give");
    await give.getByRole("button", { exact: true, name: "1 month" }).click();
    await give.getByRole("button", { name: "Add to cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText("Plus as a gift")).toBeVisible();
    await page.getByRole("link", { name: "Checkout" }).click();

    // Plus months are always a gift, and nothing is delivered.
    await expect(page.getByLabel("Send as a gift")).toBeChecked();
    await expect(
      page.getByRole("combobox", { name: "Where it goes" })
    ).toHaveCount(0);
    await expectAccessible(page);
    const paying = page.waitForResponse((response) =>
      response.url().endsWith("/orders/checkout")
    );
    await page.getByRole("button", { name: PLACE_ORDER }).click();
    await paying;
    const db = admin();
    const giftOrder = async () =>
      (
        await db
          .from("orders")
          .select("id")
          .eq("is_gift", true)
          .gte("created_at", startedAt)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ).data;
    await expect.poll(giftOrder, { timeout: 30_000 }).not.toBeNull();
    const orderId = (await giftOrder())?.id ?? "";
    expect(
      (await db.rpc("complete_order_payment", { order_id: orderId })).error
    ).toBeNull();

    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass/orders/${orderId}`);
    await page.getByRole("button", { name: "Share the gift link" }).click();
    const link = await page.getByLabel("The gift link").inputValue();

    // The friend opens the link and adds the months to their Pass.
    const friendId = await resetFriendForPlus();
    const context = await browser.newContext();
    await signIn(context, friend.email);
    const gift = await context.newPage();
    await gift.goto(link);
    await expect(gift.getByText("1 month of", { exact: false })).toBeVisible();
    await expect(gift.getByLabel("Full name")).toHaveCount(0);
    await expectAccessible(gift);
    await gift.getByRole("button", { name: "Add to my Pass" }).click();
    await expect(gift.getByText("It's yours", { exact: false })).toBeVisible();
    await context.close();

    const { data: started } = await db
      .from("subscriptions")
      .select("provider, status, cancel_at_period_end")
      .eq("user_id", friendId)
      .eq("status", "active")
      .single();
    expect(started).toMatchObject({
      cancel_at_period_end: true,
      provider: "gift",
    });
    noErrors();
  });

  test("finds student verification in Settings", async ({ page }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass`);
    await page.getByRole("link", { name: STUDENT_NUDGE }).first().click();
    await expect(page).toHaveURL(/\/pass\/settings#student$/);
    await expect(page.getByText("Student verification")).toBeVisible();
    await page.getByLabel("University", { exact: true }).selectOption("auib");
    await expect(
      page.getByRole("button", { name: "University email" })
    ).toBeVisible();
    await expect(page.getByLabel("Your university email")).toBeVisible();
    await expectAccessible(page);
    noErrors();
  });

  test("starts verifying a phone in Settings", async ({ page }) => {
    await page.goto(`${urls.web}/pass/settings`);
    await expect(page.getByText("Verified phone numbers")).toBeVisible();
    await page.getByLabel("Add a number").fill("0770 123 4567");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(
      page.getByText("We'll send a code to +964 770 123 4567")
    ).toBeVisible();
    await expectAccessible(page);
    // CI has no Twilio keys: the API says codes aren't available yet.
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(
      page.getByText("Phone codes aren't available yet.")
    ).toBeVisible();
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
    // The bell is in the top bar only.
    const bell = page.getByRole("banner").getByRole("button", {
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
    await page.goto(`${urls.web}/pass/saved`);
    await expect(page).toHaveURL(new RegExp(`^${urls.web}/sign-in`));
  });
});
