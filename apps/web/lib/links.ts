/**
 * Links to pages of this site, to The IDEA Spark (apps/app: business and
 * the back office) and to our Telegram presence.
 */

const TRAILING_SLASH = /\/$/;

const withQuery = (base: string, params?: Record<string, string>) => {
  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${base}?${query}` : base;
};

/** `/${locale}${path}` on this site, with optional query parameters. */
export const pagePath = (
  locale: string,
  path = "",
  params?: Record<string, string>
) => withQuery(`/${locale}${path}`, params);

/** `${appUrl}/${locale}${path}` on The IDEA Spark. */
export const appLink = (
  appUrl: string,
  locale: string,
  path = "",
  params?: Record<string, string>
) =>
  withQuery(`${appUrl.replace(TRAILING_SLASH, "")}/${locale}${path}`, params);

export const telegram = {
  bot: "https://t.me/TheIdeaDroidBot",
  club: "https://t.me/theideaclub",
} as const;

/** The Spark Catcher mini-game, served from /public. */
export const SPARK_CATCHER_PATH = "/games/spark-catcher/index.html";
