## 2025-02-18 - Broken Utilities and Test Environment Fragility

Discovery: Utilities in `@repo/utils` (specifically `slugify` and `decodeHtmlEntities`) were failing unit tests in `apps/web` due to missing implementation (null handling, hex entity support). These tests were likely ignored or broken for a while. Additionally, running tests locally requires strict node version bypass (`npm_config_engine_strict=false`) and full dependency install.

Strategy: Always verify utility functions with comprehensive unit tests (including edge cases like `null` and hex values) within the consuming application's test suite if the package lacks its own runner. Ensure local dev environment can run tests via `npm_config_engine_strict=false pnpm install` before attempting to run `vitest`.
