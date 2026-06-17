## 2026-03-10 - Env Schema Validation Mismatch

Insight: The Zod environment validation schema for `apps/web` in `packages/env/src/web.ts` required `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, but these variables were missing from `apps/web/.env.example`. This leads to developer confusion as the app fails to start locally despite copying the example `.env` file exactly.
Rule: Always ensure strict parity between the required fields in Zod environment schemas (`packages/env`) and the corresponding `.env.example` files in each application.
