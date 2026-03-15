## 2024-03-24 - Cached NumberFormat
**Learning:** Instantiating `Intl.NumberFormat` inline inside React components (or render loops) causes expensive recalculations during render cycles.
**Action:** Extract, export, and reuse a cached formatter instance (e.g., in `packages/utils/src/format.ts` or `apps/web/src/lib/formatters.ts`) instead of creating new instances repeatedly.
