## 2025-05-23 - .env.example Validation
Insight: The environment variable validation logic (via Zod in `@repo/env`) treats empty strings as `undefined` and enforces strict presence/format checks. This causes the build/startup to fail if a developer simply copies `.env.example` to `.env.local` without filling in values immediately.
Rule: All `.env.example` files must use valid placeholder values (e.g., `mock_key`, `http://mock.url`) instead of empty strings for required keys. This ensures the application can at least start in a "mock" state or pass build validation.
