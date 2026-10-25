import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

/**
 * English, the default, has no prefix (`/store`); every other language does
 * (`/ar/store`). Each app's proxy sends visitors to their language (cookie,
 * then Accept-Language) and serves unprefixed paths in English.
 */
export const routing = defineRouting({
  defaultLocale,
  localePrefix: "as-needed",
  locales,
});
