# Scribe Journal

## 2025-02-14 - Scribe Agent initialized
Insight: Scribe's philosophy is "Clarity is kindness".
Rule: Document strictly what is there and ensure accurate setup instructions.

## 2026-03-03 - Missing Environment Variables in .env.example
Insight: `SUPABASE_SERVICE_ROLE_KEY` and `ZAIN_SECRET_KEY` were required in the web app's Zod schema (`packages/env/src/web.ts`) but missing from `apps/web/.env.example`, causing local setup failures.
Rule: Environment variable template files (e.g., `.env.example`) must strictly mirror the required server-side fields defined in their corresponding `@t3-oss/env-nextjs` environment schemas to prevent validation errors.
