## 2026-03-03 - Setup Discrepancies via Environment Templates
Insight: A discrepancy between the README (which says to copy `.env.example`) and the actual backend requirements (Next.js server schemas via `@t3-oss/env-nextjs` in `packages/env`) caused local setup failures because the template was missing required server-side fields like `ZAIN_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
Rule: All `.env.example` templates must strictly mirror the required server-side fields defined in their corresponding `@t3-oss/env-nextjs` environment schemas.
