## 2026-03-12 - Missing Environment Variables in .env.example
Insight: Developers encounter setup failures when required environment variables added to Zod schemas (e.g., in packages/env) are not simultaneously added to the corresponding application's .env.example file.
Rule: Always ensure strict parity between the required fields in Zod environment validation schemas and the corresponding .env.example files in each application to prevent developer setup and build failures.
