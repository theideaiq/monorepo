# Scribe's Journal

This journal records critical learnings regarding the project's documentation standards and "Knowledge Graph".

## 2026-02-05 - Ghost Environment Variables in Web App

Insight: The `apps/web/.env.example` file was missing `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, despite these being required by the Zod validation schema in `packages/env/src/web.ts`. This discrepancy causes immediate setup failure for new developers.
Rule: The `.env.example` file must be treated as a strict contract. Any variable defined in `packages/env` as required (especially server-side secrets) must be present in `.env.example` with an empty value or a placeholder.
