## 2025-02-17 - Environment variables sync
Insight: Setup instructions in README and .env.example files must be aligned with the Zod schemas in packages/env. Without them, local builds and verifications fail due to validation errors (e.g., ZAIN_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY).
Rule: In the IDEA IQ monorepo, .env.example files must strictly mirror the variables defined in their respective @t3-oss/env-nextjs Zod schemas (packages/env/src/*.ts) to prevent local setup and build validation errors.
