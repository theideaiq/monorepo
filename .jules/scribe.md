## 2024-05-23 - Environment Variable Parity

Insight: Server-side secrets required by `packages/env` validation schemas must be documented in `.env.example` to ensure local setup parity.
Rule: Any secret enforced in `packages/env` schemas (e.g., Zod) must have a corresponding entry in the respective application's `.env.example` file.
