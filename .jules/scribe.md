## 2024-05-24 - Env Schema Parity
Insight: The Zod environment schemas in `packages/env` enforce strict validation on startup, and missing keys in `.env.example` lead to immediate crashes for new contributors during setup.
Rule: Always ensure `.env.example` files in app directories are kept in sync with their corresponding Zod schemas in `packages/env` to prevent setup failure.
