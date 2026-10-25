import { project, type SupportedLocale } from "@repo/config";

export type Direction = "ltr" | "rtl";

interface LocaleDefinition {
  dir: Direction;
  /** Locale used with Intl for dates and numbers. */
  intl: string;
  /** Native name, for language switchers. */
  label: string;
}

/**
 * Every locale the template knows. Which ones are live is set in
 * packages/config/project.json (`locale.enabled`). Sorani Kurdish (ckb) is
 * ready to enable once messages/ckb.json exists.
 */
export const localeDefinitions: Record<SupportedLocale, LocaleDefinition> = {
  ar: { dir: "rtl", intl: "ar-IQ", label: "العربية" },
  ckb: { dir: "rtl", intl: "ckb-IQ", label: "کوردی" },
  // British English: day-month-year dates, as used in Iraq.
  en: { dir: "ltr", intl: "en-GB", label: "English" },
};

export const locales = project.locale.enabled;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = project.locale.default;

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (locales as readonly string[]).includes(value);

export const getDirection = (locale: string): Direction =>
  isLocale(locale) ? localeDefinitions[locale].dir : "ltr";

export const getLocaleLabel = (locale: Locale) =>
  localeDefinitions[locale].label;

const LEADING = /^[?#]/;

/**
 * `path` in `locale`, as the site serves it: English, the default, has no
 * prefix (`/pass`), every other language does (`/ar/pass`). `path` starts
 * with "/" (or is "" or "/" for the home page) and may carry a query.
 */
export const localePath = (locale: string, path = "/") => {
  const rest = path === "/" ? "" : path;
  if (locale !== defaultLocale) {
    return `/${locale}${rest}`;
  }
  return rest === "" || LEADING.test(rest) ? `/${rest}` : rest;
};

const PREFIX = new RegExp(`^/(${locales.join("|")})(?=/|$|[?#])`);

/** `path` without its locale prefix, if it has one (`/ar/pass` → `/pass`). */
export const withoutLocalePrefix = (path: string) => {
  const rest = path.replace(PREFIX, "");
  return rest === "" || LEADING.test(rest) ? `/${rest}` : rest;
};
