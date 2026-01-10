import { getRequestConfig } from 'next-intl/server';
import { routing } from './navigation';

export default getRequestConfig(async ({ requestLocale }) => {
  // Await the locale from the request
  let locale = await requestLocale;

  // Validate that the incoming locale is supported, otherwise fallback
  // biome-ignore lint/suspicious/noExplicitAny: migration
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale, // <--- ADD THIS LINE (Required by newer versions)
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
