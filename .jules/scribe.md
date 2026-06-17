## 2025-05-18 - Environment Variable Documentation Standard

**Insight:**
Developers often struggle to set up local environments because `.env.example` files are missing keys required by the application's validation logic (T3 Env). This causes immediate runtime errors even for non-critical paths.

**Rule:**
1. **Explicit Keys:** All environment variables defined in the application's schema (e.g., `packages/env`) MUST be listed in `.env.example`, even if they are sensitive secrets (leave values empty).
2. **Validation Bypass:** All `.env.example` files MUST include a commented-out `SKIP_ENV_VALIDATION=true` line with an explanation, allowing developers to run the app with partial configuration during local development.
