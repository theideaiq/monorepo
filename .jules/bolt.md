## 2024-04-06 - Caching Intl Formatter Instances
**Learning:** Frequent instantiations of `Intl.NumberFormat` and `Intl.DateTimeFormat` during render cycles (e.g. lists/tables in `StaffTable.tsx` and utility functions in `@repo/utils`) causes significant CPU overhead and triggers aggressive garbage collection pauses.
**Action:** Always instantiate `Intl` formatter objects once at the module level and cache them for reuse, especially when formatting currencies and dates in shared utility functions like `formatCurrency` or within React component loops.
