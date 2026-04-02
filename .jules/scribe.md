## 2026-04-02 - Sync .env.example with Env Schema
Insight: Missing required keys in `.env.example` relative to `packages/env` schema causes instant validation failure during local dev startup.
Rule: Always ensure `.env.example` contains all variables required by the respective `packages/env` validation schema.
