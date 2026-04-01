import { getRequestConfig } from 'next-intl/server';
import { routing } from './navigation';

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request
  let locale = await requestLocale;

  // Validate that the incoming locale is supported, otherwise fallback
  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale, // <--- ADD THIS LINE (Required by newer versions)
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
