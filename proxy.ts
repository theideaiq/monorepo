import createMiddleware from 'next-intl/middleware';
import { locales, localePrefix } from './navigation';

// 1. Create the Intl Middleware
const intlMiddleware = createMiddleware({
  defaultLocale: 'en',
  locales,
  localePrefix
});

// 2. Export it as 'proxy' to satisfy Next.js 15+
export default function proxy(request: any) {
  return intlMiddleware(request);
}

// 3. Keep the config
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
