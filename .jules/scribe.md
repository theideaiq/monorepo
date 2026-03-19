## 2024-05-15 - Scribe Journal Initialized
Insight: No journal existed for Scribe in this repo.
Rule: Use this journal for logging critical documentation learnings regarding the project's Knowledge Graph and Style Guide.

## 2024-05-15 - Environment Variable Documentation Gap
Insight: Missing required variables in `.env.example` files leads to immediate application crashes on startup for new contributors because of strict Zod schema validation in `packages/env`.
Rule: Whenever environment schemas in `packages/env` are updated, the corresponding `.env.example` files in the app directories (e.g., `apps/web/.env.example`) MUST be updated to reflect the new requirements.