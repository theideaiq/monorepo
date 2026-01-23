# Scribe's Journal

## 2025-05-24 - Mocking Secret Keys for Build Validation

Insight: The `packages/env` validation schema enforces `min(1)` for secret keys (like `WAYL_SECRET_KEY`), which causes build/start failures if the keys are left empty in `.env.local` (copied from `.env.example`).
Rule: `.env.example` files must provide placeholder values (e.g., `mock_key`) for required secrets instead of leaving them empty, and include comments indicating they can be mocked for local development. This ensures the "Quick Start" flow (`cp .env.example .env.local && pnpm dev`) works without immediate errors.
