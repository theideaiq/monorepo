## 2026-03-28 - Missing Environment Variables Cause Setup Failure
Insight: The `.env.example` for `apps/web` omitted `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`. Since `packages/env` enforces these via Zod, this discrepancy leads to local setup/build failures for new developers following the README.
Rule: Always ensure `.env.example` files are strictly synced with their corresponding `@repo/env` Zod schemas to prevent `invalid_type` environment validation errors during onboarding.
