## 2025-02-18 - [Standardized Currency Formatting]
**Learning:** Hardcoded `Intl.NumberFormat` instances lead to inconsistent decimal rendering across components (e.g., `ProductCard` forced 0 decimals, `ProductView` used defaults). The `formatIQDNumber` utility in `@repo/utils` must be used to enforce the design system standard (0 decimals, IQD).
**Action:** Always use `formatIQDNumber` for displaying prices; audit new components for manual formatting.

## 2025-02-18 - [Semantic Background Colors]
**Learning:** Hardcoded colors like `#1a1a1a` were used for product backgrounds, which is close to but inconsistent with the system token `bg-brand-surface` (`#1e1e1e`). This creates visual fragmentation.
**Action:** Replace hardcoded hex values with semantic tokens (e.g., `bg-brand-surface`) to ensure theme consistency.
