import { passUrl } from "@repo/auth/pass";

/**
 * Links into the app (apps/app), to The IDEA Pass and to our Telegram presence. The app is a
 * static export, so its pages take query parameters instead of dynamic
 * segments.
 */

const TRAILING_SLASH = /\/$/;

/** `${appUrl}/${locale}${path}` with optional query parameters. */
export const appLink = (
  appUrl: string,
  locale: string,
  path = "",
  params?: Record<string, string>
) => {
  const base = `${appUrl.replace(TRAILING_SLASH, "")}/${locale}${path}`;
  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${base}?${query}` : base;
};

/** Where a product is bought (or rented, for Plus items) in the app. */
export const appProductLink = (appUrl: string, locale: string, slug: string) =>
  appLink(appUrl, locale, "/store/product", { slug });

/**
 * "Sign in": The IDEA Pass sign-in, which then opens the app (signed in,
 * through the shared session cookie).
 */
export const passSignInLink = (appUrl: string, locale: string) =>
  passUrl("/sign-in", appLink(appUrl, locale), locale);

export const telegram = {
  bot: "https://t.me/TheIdeaDroidBot",
  club: "https://t.me/theideaclub",
} as const;

/** The Spark Catcher mini-game, served from /public. */
export const SPARK_CATCHER_PATH = "/games/spark-catcher/index.html";
