## 2024-03-22 - Missing Environment Variables in .env.example
Insight: The `.env.example` files often lack keys required by the type-safe environment schemas in `packages/env`, causing local setup failures.
Rule: Ensure `.env.example` files are kept in sync with the `createEnv` definitions in their respective `packages/env/src/*.ts` files.
