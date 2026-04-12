## 2024-04-12 - Single Source of Truth for Environment Variables
Insight: The `.env.example` file in `apps/web` was missing `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` despite them being required in `packages/env/src/web.ts`, causing developer confusion and setup failures.
Rule: The Zod schemas defined in `packages/env/src/` (e.g., `web.ts`, `admin.ts`) are the single source of truth for required environment variables. Always audit app-level `.env.example` files against these schemas to ensure parity and prevent setup failures.
