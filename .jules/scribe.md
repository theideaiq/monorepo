## 2024-10-24 - Missing ZAIN_SECRET_KEY in Web Environment Parity

Insight: `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` were defined as required in `packages/env/src/web.ts` but were missing from `apps/web/.env.example`, which can lead to confusion and application startup failures during local development setup.
Rule: Any server-side or client-side secret enforced in `packages/env` validation schemas MUST have a corresponding entry in the respective application's `.env.example` file.
