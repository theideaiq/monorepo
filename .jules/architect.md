## 2024-05-22 - IQD Price Formatting Standardization
Smell: Inconsistent currency formatting (manual `Intl.NumberFormat` calls) and varied decimal handling for IQD across the codebase.
Standard: Use `formatPrice` from `@repo/utils` for all price displays. IQD amounts must be integers (0 decimal places) and use the `en-IQ` locale.
