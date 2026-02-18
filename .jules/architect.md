# Architect's Journal - Critical Learnings

## 2024-02-14 - Centralize Intl Formatters
Smell: Instantiating `new Intl.NumberFormat()` inside render loops or components causes performance overhead and duplicates locale/configuration logic.
Standard: Instantiate formatters as module-level constants in shared utility packages (e.g., `@repo/utils/format.ts`) and export helper functions (e.g., `formatIqd()`).
