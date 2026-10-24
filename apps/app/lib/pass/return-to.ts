import { safeReturnTo } from "@repo/auth/pass";
import { safeNextPath } from "@/lib/navigation";

export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Where to go after a Pass page:
 *
 * - `return_to` as a path inside The IDEA Spark (`/en/cart`), kept as is;
 * - `return_to` as an absolute URL on one of The IDEA's hosts (the website,
 *   the design site…), kept; any other URL is replaced with The IDEA Spark
 *   (never an open redirect);
 * - the older `next` (a Spark path without its locale) also works;
 * - null when none was given (stay on "Your Pass").
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
    return next.startsWith(`/${locale}/`) || next === `/${locale}`
      ? next
      : `/${locale}${next === "/" ? "" : next}`;
  }
  return null;
};

/**
 * The host people are sent back to, to show it ("You'll continue to …");
 * null for The IDEA Spark itself (a path) or no destination.
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
