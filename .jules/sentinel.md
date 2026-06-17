# Sentinel's Journal

## 2026-02-09 - CodeQL Mobile Build Automation
**Vulnerability:** CodeQL analysis for mobile (Java/Kotlin, Swift) was failing because native project files (e.g., `gradlew`, `*.xcodeproj`) were missing or incomplete in the CI environment.
**Learning:** Capacitor projects require `pnpm install` and `npx cap sync` to generate the native project structure from web assets. Simply running `npm run secrets:restore` is insufficient because it doesn't install the `capacitor` CLI or its plugins.
**Prevention:** In `.github/workflows/codeql.yml`, ensure dependencies are installed (using `npm_config_engine_strict=false` if needed) and `cap sync` is executed before attempting native builds. Also, create a dummy web asset directory (`apps/web/out`) if `next build` is skipped.

## 2026-02-09 - CI Environment Validation
**Vulnerability:** CI/Test jobs failed because `t3-env` validation triggered on missing production secrets.
**Learning:** `t3-env` validates environment variables even during tests or builds.
**Prevention:** Always set `SKIP_ENV_VALIDATION=true` in CI/Test environments or provide dummy values for all required variables.
