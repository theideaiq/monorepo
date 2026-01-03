import { getRequestConfig } from 'next-intl/server';
import { routing } from '../navigation'; // Import your routing config

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;

  // Validate that the incoming locale is valid
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    // Note the "../" because we are now inside the i18n folder
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
