import { safeReturnTo } from "@repo/auth/pass";

export type SearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Where to go after this page: the `return_to` query parameter when it is on
 * one of The IDEA's hosts, the app when it is not (never an open redirect),
 * and null when none was given (stay on The IDEA Pass).
 */
export const readReturnTo = async (searchParams: SearchParams) => {
  const raw = first((await searchParams).return_to);
  return raw ? safeReturnTo(raw) : null;
};

/** The host people are sent back to, to show it ("You'll continue to …"). */
export const hostOf = (url: string | null) => {
  if (!url) {
    return null;
  }
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
};
