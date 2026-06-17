# Scribe Journal

This journal documents critical learnings regarding the project's "Knowledge Graph" and Style Guide.

## 2026-03-01 - Environment Variable Consistency

Insight: The `.env.example` files across applications (`web`, `admin`, `droid`) were inconsistent with the validation schemas in `packages/env`. Some were missing required keys (like `ZAIN_SECRET_KEY` in `web`), used different placeholder styles, or lacked crucial development flags like `SKIP_ENV_VALIDATION`. This causes friction for new developers and potentially broken local builds.

Rule: All `.env.example` files must:
1. List ALL keys defined in the corresponding `packages/env` schema.
2. Include a commented-out `# SKIP_ENV_VALIDATION=true` at the top to facilitate local development without secrets.
3. Use empty values (e.g., `KEY=`) rather than placeholders to encourage explicit configuration.
4. Group variables by service (e.g., "Supabase", "Payment Gateways") for clarity.
