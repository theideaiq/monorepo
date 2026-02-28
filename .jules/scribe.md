## 2024-05-24 - [Strict Environment Variable Schemas vs. Examples]
Insight: The monorepo uses a strict environment variable schema validation process (via `@t3-oss/env-nextjs` and `zod` in `packages/env`). When setting up a local environment or deploying, if the `.env.example` file is missing required keys, developers copying it to `.env.local` will encounter validation build errors (e.g., "Invalid input: expected string, received undefined").
Rule: Ensure `.env.example` files strictly mirror the required fields defined in their corresponding environment schema (`packages/env/src/[app].ts`).
