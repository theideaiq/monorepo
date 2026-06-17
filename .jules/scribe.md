## 2024-05-18 - Environment Variable Validation Crashes
Insight: Missing environment variables in `.env.example` files cause local setup to crash immediately due to strict Zod schema validation in `packages/env`. This is a recurring source of confusion for developers setting up the project.
Rule: Whenever adding or modifying required schemas in `packages/env`, the corresponding `.env.example` files (e.g., `apps/web/.env.example`) must be updated simultaneously to prevent setup failures.
