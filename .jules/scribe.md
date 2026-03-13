## 2025-03-01 - Missing Environment Variables in .env.example

Insight: The Zod schema in `packages/env/src/web.ts` required `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, but these were completely omitted from `apps/web/.env.example`. This caused new setups to immediately fail environment validation.
Rule: Any new environment variable added to the application schema (`packages/env/src/web.ts`) MUST have a corresponding placeholder in `.env.example` to ensure successful developer onboarding.