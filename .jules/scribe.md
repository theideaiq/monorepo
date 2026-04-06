## 2025-02-23 - Keep .env.example synced with package/env validation schemas
Insight: Developers encounter setup failures when the Zod validation schemas in `packages/env` demand keys that are not listed in the corresponding app's `.env.example`.
Rule: To prevent developer friction and local setup failures, whenever adding a new required environment variable to an app's validation schema in `packages/env`, simultaneously update the corresponding `.env.example` file in the respective app directory.
