## 2025-03-17 - Missing Web Application Environment Requirements
Insight: The `apps/web/.env.example` file was missing `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` despite them being strictly required by `packages/env/src/web.ts`, causing local application startup failures due to Zod validation errors.
Rule: To maintain code-doc parity and prevent local application startup failures, any server-side or client-side secret enforced in `packages/env` validation schemas (e.g., Zod) must have a corresponding entry in the respective application's `.env.example` file.
