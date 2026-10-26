import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";

/** No serious or critical WCAG 2.1 A/AA violations on the page as shown. */
export const expectAccessible = async (page: Page) => {
  // Let transitions settle first: a button fading back in from its disabled
  // opacity would otherwise be measured mid-fade and fail color contrast.
  // Endless animations (spinners) are skipped.
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.effect?.getComputedTiming().endTime !==
            Number.POSITIVE_INFINITY
        )
        .map((animation) => animation.finished)
    )
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const serious = results.violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? "")
  );
  expect(
    serious.map(
      (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
    )
  ).toEqual([]);
};

/**
 * Collects console errors and uncaught exceptions; call the returned
 * function at the end of the test to assert there were none.
 */
export const watchConsole = (page: Page) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(message.text());
    }
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return () => expect(errors).toEqual([]);
};

/** Signs in by password through the API and hands the session to the browser. */
export const signIn = async (context: BrowserContext, email: string) => {
  await context.addCookies(await sessionCookies(email, urls.web));
};

/** Your Pass, signed in: the page and its notifications bell. */
export const expectSignedInHome = async (page: Page) => {
  await expect(page).toHaveURL(new RegExp(`${urls.web}/pass$`));
  await expect(
    page.getByRole("button", { name: /^Notifications/ })
  ).toBeVisible();
};
