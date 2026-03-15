## 2025-03-15 - Environment Variable Code-Doc Parity
Insight: Applications fail to start locally because required Zod validation schemas in `packages/env` do not have corresponding entries in `.env.example`, causing developers to lack awareness of necessary secrets.
Rule: To maintain code-doc parity and prevent local application startup failures, any server-side or client-side secret enforced in `packages/env` validation schemas (e.g., Zod) must have a corresponding entry in the respective application's `.env.example` file.
