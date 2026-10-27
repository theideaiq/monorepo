import { safeReturnTo } from "@repo/auth/pass";
import { localePath, withoutLocalePrefix } from "@repo/internationalization";
import { safeNextPath } from "@repo/internationalization/app-paths";

export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Where to go after a Pass page:
 *
 * - `return_to` as a path on this site (`/en/cart`), kept as is;
 * - `return_to` as an absolute URL on one of The IDEA's hosts (the website,
 *   Staff…), kept; any other URL is replaced with the website
 *   (never an open redirect);
 * - the older `next` (a path without its locale) also works;
 * - null when none was given (go on to Your Pass).
 */
export const readReturnTo = async (
  searchParams: SearchParams,
  locale?: string
) => {
  const params = await searchParams;
  const raw = first(params.return_to);
  if (raw) {
    return safeNextPath(raw) ?? safeReturnTo(raw);
  }
  const next = safeNextPath(first(params.next));
  if (next && locale) {
    return localePath(locale, withoutLocalePrefix(next));
  }
  return null;
};

/**
 * The host people are sent back to, to show it ("You'll continue to …");
 * null for this site itself (a path) or no destination.
 */
export const hostOf = (url: string | null) => {
  if (!url || url.startsWith("/")) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};
