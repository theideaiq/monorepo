import type { Locale } from "@repo/internationalization";

const STORAGE_KEY = "locale";

/** Remembers the language the user picked (web and native). */
export const rememberLocale = (locale: Locale) => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the URL still carries it.
  }
};
