## 2025-05-18 - [Design Token Adherence]
**Learning:** Hardcoding arbitrary hex values like `#facc15` instead of using semantic design tokens like `--color-brand-yellow` creates visual inconsistency and technical debt.
**Action:** Always use established semantic token classes (e.g., `text-brand-yellow`, `bg-brand-yellow`) defined in `packages/ui/src/globals.css` rather than manually extracting colors from the design spec.
