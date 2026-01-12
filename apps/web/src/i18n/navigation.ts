import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

/**
 * -----------------------------------------------------------------------------
 * ⚠️ CRITICAL NAVIGATION CONVENTION ⚠️
 * -----------------------------------------------------------------------------
 *
 * ALWAYS import `Link`, `usePathname`, `useRouter`, and `redirect` from THIS file
 * (`@/i18n/navigation`), NOT from `next/link` or `next/navigation`.
 *
 * ❌ INCORRECT:
 * import Link from 'next/link';
 * import { useRouter } from 'next/navigation';
 *
 * ✅ CORRECT:
 * import { Link, useRouter } from '@/i18n/navigation';
 *
 * WHY?
 * 1. Locale Handling: These wrappers automatically prepend the current locale
 *    (e.g., `/ar/about`) to paths. Standard Next.js imports do not.
 * 2. Performance: Using standard `next/link` can trigger full page reloads
 *    (hard 307 redirects) when navigating between locales or localized routes,
 *    killing client-side state and causing hydration errors.
 *
 * -----------------------------------------------------------------------------
 */

export const routing = defineRouting({
  locales: ['en', 'ar'],
  defaultLocale: 'en',

  // CHANGE THIS:
  // 'always' -> forces /en on everything
  // 'as-needed' -> hides /en, keeps /ar
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
