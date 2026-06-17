# Architect's Journal - Critical Learnings

## 2025-02-15 - Currency Formatting
Smell: Hardcoded `Intl.NumberFormat('en-IQ')` calls scattered across components with inconsistent options.
Standard: Use `formatIqd(amount)` from `@repo/utils` for all IQD currency display. It enforces `maximumFractionDigits: 0`.
