## 2026-02-02 - Environment Variable Parity
Insight: The `.env.example` file in app directories was missing keys required by the strict environment validation in `@repo/env` (`packages/env`), causing setup confusion for new developers.
Rule: Every key defined in `packages/env/src/<app>.ts` MUST be present in the corresponding `apps/<app>/.env.example` file, even if blank.
