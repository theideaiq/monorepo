## 2024-05-14 - Missing ENV Variables in Example Files
Insight: `apps/web/.env.example` was missing environment variables that were defined as required in the single source of truth schema `packages/env/src/web.ts`, causing local setup validation failures for new contributors.
Rule: Always audit app-level `.env.example` files against the environment variable schemas defined via Zod in `packages/env/src/` (e.g., `web.ts`, `admin.ts`) to prevent setup failures.
