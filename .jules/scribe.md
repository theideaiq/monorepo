# Scribe's Journal

## 2025-05-27 - Web Environment Variables Parity

Insight: The `apps/web/.env.example` file was missing `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, which are required by `packages/env/src/web.ts`.
Rule: Routine audits of `.env.example` against `packages/env` schemas are necessary to ensure developer setup instructions are accurate.
