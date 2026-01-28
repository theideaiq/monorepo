## 2025-02-18 - Currency Formatting Standardization
Smell: Multiple inline instantiations of `Intl.NumberFormat('en-IQ')` with inconsistent options (some defaulting to 3 decimals, some enforcing 0) led to visual inconsistency and duplication.
Standard: Use `formatIQD` from `@repo/utils` for all IQD price displays. It enforces `maximumFractionDigits: 0` to align with the design decision that IQD is displayed as integers.
