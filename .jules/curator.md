## 2025-02-18 - Co-location of Internationalization Logic

Structure: Internationalization routing logic (`navigation.ts`) is now co-located with `request.ts` in `src/i18n/`.
Rule: Files that are tightly coupled by domain logic (like `next-intl` configuration and routing) should reside in the same directory, rather than being split between root `src/` and subdirectories.

## 2024-05-23 - Component Bundling in UI Package

Structure: Grouped UI components into dedicated directories (e.g., `src/button/Button.tsx`) instead of a flat list.
Rule: All new UI components must be created in their own directory within `packages/ui/src/` (kebab-case), containing the component, tests, stories, and any specific assets.
