## 2025-02-14 - .env.example matching Zod schemas
Insight: Missing environment variables in `.env.example` files cause validation errors during local setup and builds.
Rule: The `.env.example` files across applications (e.g., `apps/web`) must strictly mirror their corresponding Zod schemas defined in `packages/env` to ensure a smooth onboarding process and prevent validation errors during local setup/builds.
