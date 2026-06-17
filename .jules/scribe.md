## 2025-02-23 - Keep .env.example files in sync with Next.js environment schemas
Insight: Local development failed immediately because `.env.example` was missing keys required by `@t3-oss/env-nextjs` validation schema, confusing new developers.
Rule: Always ensure `.env.example` files contain all variables required by their respective `@t3-oss/env-nextjs` validation schemas to prevent instant validation failures during local development startup.
