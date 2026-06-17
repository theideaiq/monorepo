## 2026-02-26 - [Environment Variable Parity]
Insight: Environment variable definitions in shared packages (`@repo/env`) are not automatically reflected in application `.env.example` files, leading to setup failures when developers copy the example.
Rule: Whenever a new environment variable is added to a Zod schema in `@repo/env`, the corresponding `.env.example` file in the consuming application (`apps/*`) must be updated immediately to include the key.
