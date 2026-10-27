import { localePath } from "@repo/internationalization";

/**
 * Links to pages of this site, to The IDEA Business (apps/business: company
 * pages and the back office) and to our Telegram presence.
 */

const TRAILING_SLASH = /\/$/;

const withQuery = (base: string, params?: Record<string, string>) => {
  const query = params ? new URLSearchParams(params).toString() : "";
  return query ? `${base}?${query}` : base;
};

/** `path` in `locale` on this site (`localePath`), with optional query parameters. */
export const pagePath = (
  locale: string,
  path = "",
  params?: Record<string, string>
) => withQuery(localePath(locale, path), params);

/** `path` in `locale` on The IDEA Business. */
export const appLink = (
  appUrl: string,
  locale: string,
  path = "",
  params?: Record<string, string>
) =>
  withQuery(
    `${appUrl.replace(TRAILING_SLASH, "")}${localePath(locale, path)}`,
    params
  );

export const telegram = {
  bot: "https://t.me/theideaiq_bot",
  botHandle: "@theideaiq_bot",
  club: "https://t.me/theideaiq_club",
} as const;
