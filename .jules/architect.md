## 2025-03-19 - Centralize Currency Formatting
Smell: Inline `Intl.NumberFormat` instances in React components. This leads to expensive recalculations on every render, and causes inconsistent decimal handling (e.g. sometimes "IQD 50,000", sometimes "50,000 IQD").
Standard: Always use the centralized, cached `formatCurrency` utility from `@repo/utils` for currency formatting. It guarantees proper localization and zero-allocation rendering by returning the fully formatted string (e.g. "IQD 50,000"). Never construct `Intl.NumberFormat` inside a component body.
