## 2025-02-18 - [Standardized Currency Formatting and Iconography]
**Learning:** Inconsistent usage of `Intl.NumberFormat` and hardcoded colors (`#1a1a1a`) across components (`ProductCard`, `ProductView`) leads to visual fragmentation. Text-based icons (`★`) break visual language established by `lucide-react`.
**Action:** Always use `formatIQDNumber` from `@repo/utils` for currency to ensure `en-IQ` consistency. Use semantic tokens (e.g., `bg-brand-surface`) instead of hex codes. Replace text symbols with Lucide icons (e.g., `Star`).
