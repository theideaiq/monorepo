# Scribe's Journal

## 2025-05-24 - Ghost Environment Variables

Insight: At this time, `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were required by the environment schema (`packages/env/src/web.ts`) but missing from `apps/web/.env.example`, causing runtime crashes for new developers.
Rule: Routinely audit `.env.example` files against the strict Zod validation schemas in `packages/env` to prevent "ghost" variables and missing requirements.
