## 2025-02-18 - Co-location of Internationalization Logic

Structure: Internationalization routing logic (`navigation.ts`) is now co-located with `request.ts` in `src/i18n/`.
Rule: Files that are tightly coupled by domain logic (like `next-intl` configuration and routing) should reside in the same directory, rather than being split between root `src/` and subdirectories.

## 2025-02-18 - Component Bundling for UI Elements

Structure: UI components (`Button`, `Input`) have been moved from a flat `src/components/ui/` list into dedicated subdirectories (`src/components/ui/button/`, `src/components/ui/input/`).
Rule: Components with associated assets (like tests, styles, or stories) must be bundled in their own directory (e.g., `ComponentName/`) rather than residing as loose files in a parent folder.
