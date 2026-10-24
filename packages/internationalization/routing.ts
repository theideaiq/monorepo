import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * Every URL carries its locale (/ar/…, /en/…); each app's proxy adds it to
 * paths without one.
 */
export const routing = defineRouting({
  defaultLocale,
  localePrefix: "always",
  locales,
});
