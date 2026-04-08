## 2024-05-25 - Missing Environment Variables in Web App

Insight: `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were required in the Zod schema (`packages/env/src/web.ts`) but missing from `apps/web/.env.example`, causing setup failures.
Rule: Routinely audit `.env.example` files against the strict Zod validation schemas in `packages/env` to prevent missing requirements.
