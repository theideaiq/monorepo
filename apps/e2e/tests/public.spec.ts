import { expect, test } from "@playwright/test";
import { product } from "../fixtures";
import { urls } from "../playwright.config";
import { expectAccessible, watchConsole } from "./helpers";

const pages = [
  { name: "home", path: "" },
  { name: "store", path: "/store" },
  { name: "product page", path: `/store/${product.slug}` },
  { name: "Plus", path: "/plus" },
  { name: "rentals", path: "/rent" },
  { name: "Discover", path: "/discover" },
  { name: "About", path: "/about" },
  { name: "FAQ", path: "/about/faq" },
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

  test("the catalog links to the product page", async ({ page }) => {
    await page.goto(`${urls.web}/store`);
    await page.getByRole("link", { name: product.name }).first().click();
    await expect(page).toHaveURL(new RegExp(`/store/${product.slug}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      product.name
    );
  });
});
