# Scribe's Journal - The Documentation Vault

## 2026-02-07 - Environment Schema Discrepancy
Insight: The `apps/web/.env.example` file was missing `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` which are required by the runtime environment validation (Zod schema in `packages/env`). This silent omission causes the application to crash immediately upon startup for new contributors, as the validation layer throws an error for missing keys before the app even boots.
Rule: The `.env.example` file is not just a suggestion but a strict contract. It must explicitly list every single environment variable required by the corresponding `packages/env` schema, even if the values are left blank for secrets. If a variable is required by Zod, it must exist in `.env.example`.
