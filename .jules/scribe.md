# Scribe's Journal

## 2024-05-24 - Shared Utilities Testing Strategy
Insight: The `@repo/utils` package lacks its own test runner configuration. Instead, tests are located in `apps/web/src/lib/` (e.g., `string-utils.test.ts`) and run via the `apps/web` test script. This was tribal knowledge not documented in the package itself.
Rule: Any shared package without a dedicated test runner MUST document where its tests are located and how to run them in its README.md.
