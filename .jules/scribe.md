## 2025-04-04 - Fix environment validation friction
Insight: The `.env.example` files were missing required keys as defined by the `@t3-oss/env-nextjs` validation schemas in `packages/env/src/`. This causes immediate startup failures (`pnpm dev`) for new contributors due to environment validation errors.
Rule: Always ensure `.env.example` files contain all variables required by their respective environment validation schemas to prevent setup failures.
