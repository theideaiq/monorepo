## 2025-02-12 - Environment Variable Validation
Insight: The `.env.example` files contained empty strings for required secrets (like `WAYL_SECRET_KEY`), which caused the Zod validation (enforcing `min(1)`) to fail immediately when developers copied them to `.env.local` to start the app.
Rule: All `.env.example` files must use non-empty placeholder values (e.g., `mock_key`) for required variables to ensure the application passes build/start validation out of the box.
