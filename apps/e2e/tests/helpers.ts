import AxeBuilder from "@axe-core/playwright";
import { type BrowserContext, expect, type Page } from "@playwright/test";
import { sessionCookies } from "../fixtures";
import { urls } from "../playwright.config";

/** No serious or critical WCAG 2.1 A/AA violations on the page as shown. */
export const expectAccessible = async (page: Page) => {
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
  await context.addCookies(await sessionCookies(email, urls.app));
};

export const expectSignedInHome = async (page: Page) => {
  await expect(page).toHaveURL(new RegExp(`${urls.app}/en/?$`));
  await expect(
    page.getByRole("button", { name: /^Notifications/ })
  ).toBeVisible();
};
