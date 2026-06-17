## 2025-04-05 - Keep .env.example files in sync with validation schemas
Insight: The `packages/env` schemas tightly validate environment variables. If an app's `.env.example` file is missing required variables, new developers cloning the repository and running `pnpm dev` will face immediate setup failure.
Rule: Whenever adding a new required environment variable to an app's validation schema in `packages/env`, simultaneously update the corresponding `.env.example` file in the app directory to prevent developer friction.
