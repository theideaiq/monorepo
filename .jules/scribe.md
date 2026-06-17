## 2025-02-18 - [Env Config]
Insight: `apps/web/.env.example` was missing keys (`ZAIN_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) required by the strict schema validation in `@repo/env`. This causes immediate runtime failures for new developers.
Rule: `.env.example` files must mirror the keys defined in `packages/env/src/{app}.ts` to ensure "Setup" instructions are accurate.
