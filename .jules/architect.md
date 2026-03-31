
## 2024-03-31 - [Standardize i18n Navigation Imports]
Smell: Imports for `Link`, `usePathname`, `useRouter`, and `redirect` coming from standard `next/link` or `next/navigation` in a next-intl project, leading to hard reloads, hydration errors, and broken localized routing.
Standard: Always use `@/i18n/navigation` wrappers for Next.js navigation primitives to safely handle locales and client-side transitions.
