import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/navigation';

// 1. Create the Intl Middleware with the "as-needed" override
const intlMiddleware = createMiddleware({
  ...routing, // Keep your locales and defaultLocale from the config file
  localePrefix: 'always', // <--- THIS IS THE KEY CHANGE
});

// 2. Export it as 'proxy' to satisfy Next.js 15+
// biome-ignore lint/suspicious/noExplicitAny: migration
export default function proxy(request: any) {
  return intlMiddleware(request);
}

// 3. Keep the config
export const config = {
  // Matcher ignoring api, _next, static files, etc.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
