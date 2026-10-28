import { expect, test } from "@playwright/test";
import { product } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, watchConsole } from "./helpers";

const pages = [
  { name: "home", path: "" },
  { name: "store", path: "/store" },
  { name: "product page", path: `/store/${product.slug}` },
  { name: "Plus", path: "/plus" },
  { name: "Club", path: "/club" },
  { name: "Club events", path: "/club?show=events" },
  { name: "Club guides", path: "/club?topic=guides" },
  { name: "Partners", path: "/partners" },
  { name: "About", path: "/about" },
  { name: "Help", path: "/help" },
  {
    name: "search",
    path: `/search?${new URLSearchParams({ q: product.name })}`,
  },
];

test.describe("public site", () => {
  for (const locale of ["en", "ar"] as const) {
    for (const { name, path } of pages) {
      test(`${name} renders in ${locale} and is accessible`, async ({
        page,
      }) => {
        const noErrors = watchConsole(page);
        // English pages have no locale prefix.
        const prefix = locale === "en" ? "" : `/${locale}`;
        const response = await page.goto(`${urls.web}${prefix}${path}`);
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr"
        );
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        if (path.startsWith("/store/")) {
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(
            locale === "ar" ? product.nameAr : product.name
          );
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflow).toBeLessThanOrEqual(0);
        await expectAccessible(page);
        noErrors();
      });
    }
  }

  test.describe("on a phone", () => {
    test.use({ viewport: { height: 844, width: 390 } });

    test("the tabs lead around the app and are accessible", async ({
      page,
    }) => {
      await page.goto(`${urls.web}/`);
      const tabs = page.getByRole("navigation", { name: "Main" });
      await expect(tabs).toBeVisible();
      await expect(tabs.getByRole("link", { name: "Store" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      await tabs.getByRole("link", { name: "Plus" }).click();
      await expect(page).toHaveURL(/\/plus$/);
      await expect(tabs.getByRole("link", { name: "Plus" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      await tabs.getByRole("link", { name: "Club" }).click();
      await expect(page).toHaveURL(/\/club$/);
      await expectAccessible(page);
    });
  });

  test("the Club is Join, Read and Yours, with Telegram at the bottom", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/club`);
    const parts = page.getByRole("navigation", { name: "The IDEA Club" });
    for (const name of ["Join", "Read", "Yours"]) {
      await expect(parts.getByRole("link", { name })).toBeVisible();
      await expect(
        page.getByRole("heading", { exact: true, level: 2, name })
      ).toBeVisible();
    }
    // Signed out, Join asks for a Pass before showing surveys.
    await expect(
      page.getByText("Sign in to see the surveys you can answer.")
    ).toBeVisible();

    // Telegram is one card, after Yours.
    const yours = await page
      .getByRole("heading", { exact: true, level: 2, name: "Yours" })
      .boundingBox();
    const telegram = await page
      .getByRole("heading", { name: "The IDEA Club on Telegram" })
      .boundingBox();
    expect(telegram?.y ?? 0).toBeGreaterThan(yours?.y ?? 0);

    // Read filters by topic.
    const topics = page.getByRole("navigation", { name: "Topics" });
    await topics.getByRole("link", { name: "Guides" }).click();
    await expect(page).toHaveURL(/\/club\?topic=guides#read$/);
    await expect(
      page
        .getByRole("navigation", { name: "Topics" })
        .getByRole("link", { name: "Guides" })
    ).toHaveAttribute("aria-current", "page");

    // Join filters by kind.
    await page
      .getByRole("navigation", { name: "Show" })
      .getByRole("link", { name: "Events" })
      .click();
    await expect(page).toHaveURL(/\/club\?show=events#join$/);
    await expectAccessible(page);
  });

  test("each place has one way in: top bar, tabs, footer and About & help", async ({
    page,
  }) => {
    await page.goto(`${urls.web}/about`);
    const header = page.getByRole("banner");
    // Signed out on a page outside the Store and Plus, with an empty cart:
    // search, Saved and Sign in (no bell, cart or business link).
    await expect(header.getByRole("link", { name: "Search" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Saved" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Cart" })).toHaveCount(0);
    await expect(
      header.getByRole("link", { name: "For partners" })
    ).toHaveCount(0);
    await expect(
      header.getByRole("button", { name: /^Notifications/ })
    ).toHaveCount(0);

    const footer = page.getByRole("contentinfo");
    for (const name of ["For partners", "About", "Careers", "Help", "Legal"]) {
      await expect(footer.getByRole("link", { name })).toBeVisible();
    }
    for (const name of ["Store", "Plus", "Club", "Pass"]) {
      await expect(footer.getByRole("link", { exact: true, name })).toHaveCount(
        0
      );
    }
    await expect(
      footer.getByRole("button", { name: "Switch language" })
    ).toBeVisible();

    // Phones have no footer: sign-in (the Pass tab) ends with About & help.
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(footer).toBeHidden();
    await page.goto(`${urls.web}/sign-in`);
    await page.getByRole("link", { name: /^About & help/ }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(
      page.getByRole("button", { name: "Switch language" })
    ).toBeVisible();
    await page.setViewportSize({ height: 900, width: 1280 });

    // The cart shows on the Store and Plus screens.
    await page.goto(`${urls.web}/store`);
    await expect(header.getByRole("link", { name: "Cart" })).toBeVisible();

    // One search for products, posts and events.
    await header.getByRole("link", { name: "Search" }).click();
    await expect(page).toHaveURL(/\/search$/);
    await page.getByRole("searchbox").fill(product.name);
    await page.getByRole("button", { exact: true, name: "Search" }).click();
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(
      page.getByRole("heading", { level: 2, name: "Products" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: product.name }).first()
    ).toBeVisible();
  });

  test("the catalog links to the product page", async ({ page }) => {
    await page.goto(`${urls.web}/store`);
    await page.getByRole("link", { name: product.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/store/${product.slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      product.name
    );
  });
});
