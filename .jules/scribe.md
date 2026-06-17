## 2026-05-24 - Missing Database and Payment Gateway Secrets

Insight: The `apps/web/.env.example` file was missing `SUPABASE_SERVICE_ROLE_KEY` and `ZAIN_SECRET_KEY`, which are strictly required by the `webEnv` schema in `packages/env/src/web.ts`, causing potential setup friction for developers.
Rule: Routinely audit `.env.example` files against the strict Zod validation schemas in `packages/env` to prevent "ghost" variables and missing requirements.
