## 2026-03-04 - Web Env Parity
Insight: The apps/web/.env.example was missing ZAIN_SECRET_KEY and SUPABASE_SERVICE_ROLE_KEY, which are required by the Zod schema in packages/env/src/web.ts. This causes immediate setup failure for new developers due to missing environment variables.
Rule: The .env.example files must strictly mirror the Zod schemas in packages/env to ensure a smooth onboarding process.
