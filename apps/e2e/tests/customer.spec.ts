import { expect, test } from "@playwright/test";
import {
  admin,
  clearInbox,
  customer,
  emailedCode,
  friend,
  product,
  sessionCookies,
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
    page.getByRole("heading", { name: "تسجيل الدخول إلى ايديا پاس" })
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

  test("sends identity photos for review", async ({ page }) => {
    const noErrors = watchConsole(page);
    await page.goto(`${urls.web}/pass/settings`);
    const card = page.locator("#verification");
    const photo = (name: string) => ({
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      ),
      mimeType: "image/png",
      name,
    });
    await card
      .getByLabel("Front of your National Card")
      .setInputFiles(photo("front.png"));
    await card
      .getByLabel("Back of your National Card")
      .setInputFiles(photo("back.png"));
    await card.getByLabel("A selfie").setInputFiles(photo("selfie.png"));
    await expectAccessible(page);
    await card.getByRole("button", { name: "Send for review" }).first().click();
    await expect(
      card.getByText("Your photos are waiting for review.", { exact: false })
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
    // The student card (the educator badge below has its own university).
    const student = page.locator("#student");
    await student
      .getByLabel("University", { exact: true })
      .selectOption("auib");
    await expect(
      student.getByRole("button", { name: "University email" })
    ).toBeVisible();
    await expect(student.getByLabel("Your university email")).toBeVisible();
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

test("a member follows an opportunity and finds it in Club → Yours", async ({
  context,
  page,
}) => {
  await resetCustomer();
  const db = admin();
  // New each run: public data is cached for a while, so a listing from an
  // earlier run could still show (and lead to a page that's gone).
  const stamp = Date.now();
  const slug = `e2e-exchange-${stamp}`;
  const title = `E2E Exchange ${stamp}`;
  await db.from("opportunities").delete().like("slug", "e2e-exchange-%");
  const { error } = await db.from("opportunities").insert({
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    kind: "program",
    location: "Baghdad",
    slug,
    status: "approved",
    summary_ar: "برنامج تبادل للاختبار",
    summary_en: "A test exchange program",
    title_ar: "برنامج تبادل للاختبار",
    title_en: title,
  });
  if (error) {
    throw error;
  }
  await context.addCookies(await sessionCookies(customer.email, urls.web));

  // Its page (Club → Join lists it too, but that list is cached a while;
  // the public journey checks it renders).
  await page.goto(`${urls.web}/club/opportunities/${slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible();
  // Streaming can leave a hidden copy of the page; read the visible one.
  await expect(
    page.getByRole("article").getByText("Run by The IDEA")
  ).toBeVisible();
  await page.getByRole("button", { name: "Notify me" }).click();
  await expect(
    page.getByRole("button", { name: "Stop notifications" })
  ).toBeVisible();
  await expectAccessible(page);

  // Club → Yours → Following lists it.
  await page.goto(`${urls.web}/club#yours`);
  await page.getByRole("tab", { name: "Following" }).click();
  // Join's card links to it too, under a longer name.
  await expect(
    page.getByRole("link", { exact: true, name: title })
  ).toBeVisible();
  await expectAccessible(page);

  await db.from("opportunities").delete().eq("slug", slug);
});

test("a member applies to one of The IDEA's programs and pays the first installment in the cart", async ({
  context,
  page,
}) => {
  await resetCustomer();
  const db = admin();
  const stamp = Date.now();
  const slug = `e2e-summer-${stamp}`;
  const title = `E2E Summer ${stamp}`;
  // Earlier runs' programs: their applications first (they keep the program).
  const { data: old } = await db
    .from("opportunities")
    .select("id")
    .like("slug", "e2e-summer-%");
  const oldIds = (old ?? []).map((row) => row.id);
  await db.from("program_applications").delete().in("program_id", oldIds);
  await db.from("opportunities").delete().in("id", oldIds);
  const { data: listing, error } = await db
    .from("opportunities")
    .insert({
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      kind: "program",
      location: "Boston",
      slug,
      starts_on: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
      status: "approved",
      title_ar: "برنامج صيفي للاختبار",
      title_en: title,
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  const later = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const program = await db.from("programs").insert({
    includes_en: "Flights, a host family and classes",
    installments: [{ percent: 50 }, { due_on: later, percent: 50 }],
    min_age: 18,
    opportunity_id: listing.id,
    price: 1_000_000,
    refund_schedule: [{ days_before: 30, percent: 100 }],
  });
  if (program.error) {
    throw program.error;
  }
  await context.addCookies(await sessionCookies(customer.email, urls.web));

  // The package and the form.
  await page.goto(`${urls.web}/club/opportunities/${slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: title })
  ).toBeVisible();
  await expect(
    page.getByRole("article").getByText("Flights, a host family and classes")
  ).toBeVisible();
  await page.getByLabel("Emergency contact's name").fill("Mum");
  await page.getByLabel("Emergency contact's phone").fill("+9647700000999");
  await page.getByLabel("Passport scan").setInputFiles({
    buffer: Buffer.from("e2e passport"),
    mimeType: "application/pdf",
    name: "passport.pdf",
  });
  await page.getByRole("button", { name: "Send application" }).click();
  await expect(
    page.getByRole("article").getByText("Application sent")
  ).toBeVisible();
  await expectAccessible(page);

  // Staff accept it (as `review_program_application` would).
  const { data: application } = await db
    .from("program_applications")
    .select("id")
    .eq("program_id", listing.id)
    .single();
  const today = new Date().toISOString().slice(0, 10);
  await db
    .from("program_applications")
    .update({ pay_by: today, price: 1_000_000, status: "accepted" })
    .eq("id", application?.id ?? "");
  await db.from("program_payments").insert([
    {
      amount: 500_000,
      application_id: application?.id ?? "",
      due_on: today,
      position: 1,
    },
    {
      amount: 500_000,
      application_id: application?.id ?? "",
      due_on: later,
      position: 2,
    },
  ]);

  // The first installment goes to the cart, and checks out with no address.
  await page.reload();
  await page.getByRole("button", { name: /^Pay .*\(due / }).click();
  await expect(page).toHaveURL(new RegExp(`^${urls.web}/cart`));
  await expect(page.getByText("Installment 1 of 2")).toBeVisible();
  await expectAccessible(page);
  await page.getByRole("link", { name: "Checkout" }).click();
  await expect(page).toHaveURL(new RegExp(`^${urls.web}/checkout`));
  await expect(page.getByText("Nothing to deliver")).toBeVisible({
    timeout: 20_000,
  });

  await db
    .from("cart_programs")
    .delete()
    .eq("application_id", application?.id ?? "");
  await db.from("program_applications").delete().eq("program_id", listing.id);
  await db.from("opportunities").delete().eq("id", listing.id);
});

/** A 1×1 PNG, standing in for a seller's photo of the copy. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64"
);
const HOUSE_SELLER = "00000000-0000-4000-8000-000000000001";

test("a member bids on an auction, wins it and finds it in the cart", async ({
  context,
  page,
}) => {
  await resetCustomer();
  const db = admin();
  const slug = "e2e-auction-card";
  const name = "E2E Signed Card";

  // A collectible product with one of The IDEA's copies, and the seller's
  // photos of it.
  const { data: item, error } = await db
    .from("products")
    .upsert(
      {
        collectible: true,
        condition: "used",
        kind: "sale",
        name_ar: "بطاقة موقعة للاختبار",
        name_en: name,
        price: 30_000,
        slug,
        status: "active",
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  // Earlier runs' auctions go, and their copies with them.
  await db.from("auctions").delete().eq("product_id", item.id);
  await db.from("stock_items").delete().eq("product_id", item.id);
  const { data: copy } = await db
    .from("stock_items")
    .insert({
      condition: "used",
      product_id: item.id,
      purpose: "sale",
      status: "reserved",
    })
    .select("id, variant_id")
    .single();
  const photos = [1, 2, 3].map((n) => `${HOUSE_SELLER}/e2e-card-${n}.png`);
  for (const path of photos) {
    await db.storage
      .from("auction-photos")
      .upload(path, PIXEL, { contentType: "image/png", upsert: true });
  }
  const { data: auction, error: auctionError } = await db
    .from("auctions")
    .insert({
      condition: "used",
      condition_note: "Signed on the front, light wear on the corners.",
      days: 3,
      ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      photos,
      product_id: item.id,
      seller_id: HOUSE_SELLER,
      start_price: 30_000,
      stock_item_id: copy?.id ?? "",
      variant_id: copy?.variant_id ?? "",
    })
    .select("id, number")
    .single();
  if (auctionError) {
    throw auctionError;
  }
  await context.addCookies(await sessionCookies(customer.email, urls.web));

  // Store → Auctions lists it; its page takes a maximum.
  await page.goto(`${urls.web}/store/auctions`);
  await expect(
    page.getByRole("link", { name: new RegExp(name) })
  ).toBeVisible();
  await expectAccessible(page);
  await page.goto(`${urls.web}/store/auctions/${auction.number}`);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.getByLabel("Your maximum (IQD)").fill("40000");
  await page.getByRole("button", { name: "Place bid" }).click();
  await expect(page.getByText(/You're the highest bidder at/)).toBeVisible();
  await expect(page.getByText("Bidder 1")).toBeVisible();
  await expectAccessible(page);

  // It ends; the page settles it and the win is in the cart.
  await db
    .from("auctions")
    .update({
      ends_at: new Date(Date.now() - 1000).toISOString(),
      starts_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", auction.id);
  await page.reload();
  await expect(page.getByText(/^You won at/)).toBeVisible();
  await page.getByRole("link", { name: "Go to cart" }).click();
  await expect(page).toHaveURL(new RegExp(`^${urls.web}/cart`));
  await expect(page.getByText(/^Won · pay by/)).toBeVisible();
  await expectAccessible(page);

  // Saved → Bids shows it too.
  await page.goto(`${urls.web}/pass/saved`);
  await expect(page.getByRole("heading", { name: "Your bids" })).toBeVisible();
  await expect(page.getByText("You won", { exact: true })).toBeVisible();
});

test("a member asks shops for offers, accepts one and writes to the shop", async ({
  context,
  page,
}) => {
  await resetCustomer();
  await resetFriend();
  const db = admin();

  // A shop to make the offer: the friend's, approved.
  const { data: friendUser } = await db
    .from("profiles")
    .select("id")
    .eq("full_name", friend.name)
    .limit(1)
    .single();
  await db.from("organizations").delete().eq("slug", "e2e-buyers");
  const { data: org, error } = await db
    .from("organizations")
    .insert({
      created_by: friendUser?.id ?? "",
      name: "E2E Buyers",
      slug: "e2e-buyers",
    })
    .select("id")
    .single();
  if (error) {
    throw error;
  }
  await db.from("organization_members").insert({
    organization_id: org.id,
    role: "owner",
    user_id: friendUser?.id ?? "",
  });
  const { data: shop } = await db
    .from("sellers")
    .insert({ name: "E2E Buyers", organization_id: org.id, status: "approved" })
    .select("id")
    .single();
  await db
    .from("delivery_zones")
    .update({ active: true })
    .eq("governorate", "baghdad");
  await context.addCookies(await sessionCookies(customer.email, urls.web));

  // Pass → Selling: describe the item, add its photos and ask.
  await page.goto(`${urls.web}/pass`);
  await page
    .getByRole("navigation", { name: "Navigation" })
    .getByRole("link", { name: "Selling" })
    .click();
  // A page the dev server may still be compiling.
  await expect(page).toHaveURL(`${urls.web}/pass/selling`, {
    timeout: 30_000,
  });
  await expectAccessible(page);
  await page.getByLabel("What is it?").fill("E2E Record Collection");
  await page.getByLabel("Where is it?").selectOption("baghdad");
  await page
    .getByLabel("Describe it")
    .fill("Thirty records, sleeves in good shape.");
  await page.getByLabel("Photos of the item").setInputFiles(
    [1, 2, 3].map((n) => ({
      buffer: PIXEL,
      mimeType: "image/png",
      name: `record-${n}.png`,
    }))
  );
  await page.getByRole("button", { name: "Ask for offers" }).click();
  await expect(
    page.getByText("Sent. Shops can now make offers.")
  ).toBeVisible();
  await expect(page.getByText("E2E Record Collection")).toBeVisible();

  // The shop offers 150,000 IQD (as `make_sell_offer` would).
  const { data: request } = await db
    .from("sell_requests")
    .select("id")
    .eq("title", "E2E Record Collection")
    .single();
  await db.from("sell_offers").insert({
    amount: 150_000,
    check_method: "collect",
    expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    note: "We collect on Saturday.",
    pay_method: "cash",
    request_id: request?.id ?? "",
    seller_id: shop?.id ?? "",
  });
  await page.reload();
  await expect(page.getByText(/^E2E Buyers offers/)).toBeVisible();
  await expect(page.getByText("We collect on Saturday.")).toBeVisible();
  await expectAccessible(page);

  // Accepting it, then a message to the shop.
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByText(/^You accepted this offer/)).toBeVisible();
  await page
    .getByLabel("Message to the shop")
    .fill("Saturday at noon suits me.");
  await page.getByRole("button", { exact: true, name: "Send" }).click();
  await expect(page.getByText("Saturday at noon suits me.")).toBeVisible();
  await expectAccessible(page);

  await db.from("organizations").delete().eq("slug", "e2e-buyers");
});

test("a member lists an item, another buys it at the price and it's marked sold", async ({
  browser,
  context,
  page,
}) => {
  await resetCustomer();
  await resetFriend();
  const db = admin();
  const ids = await db
    .from("profiles")
    .select("id, full_name")
    .in("full_name", [customer.name, friend.name]);
  const idOf = (name: string) =>
    ids.data?.find((row) => row.full_name === name)?.id ?? "";
  // The seller has a verified identity; the buyer is an adult.
  await db
    .from("identity_verifications")
    .upsert({ legal_name: customer.name, user_id: idOf(customer.name) });
  await db
    .from("profiles")
    .update({ birthday: "1996-02-11" })
    .eq("id", idOf(friend.name));
  await db
    .from("delivery_zones")
    .update({ active: true })
    .eq("governorate", "baghdad");
  await context.addCookies(await sessionCookies(customer.email, urls.web));

  // Pass → Selling → Sell it yourself.
  await page.goto(`${urls.web}/pass/selling`);
  // A page the dev server may still be compiling.
  await expect(page.getByLabel("Item name")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("Item name").fill("E2E Turntable");
  await page.getByLabel("Area", { exact: true }).selectOption("baghdad");
  await page.getByLabel("Price (IQD)").fill("25000");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Belt replaced last year, plays well.");
  await page.getByLabel("Photos (3 to 8)").setInputFiles(
    [1, 2, 3].map((n) => ({
      buffer: PIXEL,
      mimeType: "image/png",
      name: `turntable-${n}.png`,
    }))
  );
  await page.getByRole("button", { name: "List it" }).click();
  await expect(page.getByText(/^Listed\./)).toBeVisible();
  await expectAccessible(page);

  // The friend finds it in Store → From people and buys it at the price.
  const buyer = await browser.newContext();
  await signIn(buyer, friend.email);
  const store = await buyer.newPage();
  await store.goto(`${urls.web}/store/people`);
  await store.getByRole("link", { name: /E2E Turntable/ }).click();
  await expect(store.getByText("Belt replaced last year")).toBeVisible({
    timeout: 30_000,
  });
  await expectAccessible(store);
  await store.getByRole("button", { name: /^Buy for/ }).click();
  await expect(store.getByText(/^It's yours/)).toBeVisible();
  await buyer.close();

  // The seller sees the buyer by first name and marks it sold.
  await page.reload();
  await expect(page.getByText(/buys it for/)).toBeVisible();
  await page.getByRole("button", { name: "Mark sold" }).click();
  await expect(page.getByText("Sold", { exact: true }).first()).toBeVisible();
  await expectAccessible(page);
});
