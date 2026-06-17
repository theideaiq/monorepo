## 2026-03-16 - Code-Doc Parity for Env Vars
Insight: The environment variables required by the `packages/env` zod schemas must be exactly reflected in each app's `.env.example` file to prevent local application startup failures due to missing keys.
Rule: Any server-side or client-side secret enforced in `packages/env` validation schemas must have a corresponding entry in the respective application's `.env.example` file.
