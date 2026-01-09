## 2025-02-18 - Co-location of Internationalization Logic

Structure: Internationalization routing logic (`navigation.ts`) is now co-located with `request.ts` in `src/i18n/`.
Rule: Files that are tightly coupled by domain logic (like `next-intl` configuration and routing) should reside in the same directory, rather than being split between root `src/` and subdirectories.

## 2025-02-18 - Exploding Utilities / Grouping Services

Structure: External service integrations are now grouped in `src/lib/services/`.
Rule: `src/lib` should be for generic utilities only. External services (Supabase, Wayl, YouTube, etc.) live in `src/lib/services/` to prevent `lib` from becoming a dumping ground and to clarify the distinction between pure functions and external integrations.
