## 2024-05-23 - Standardize Currency Formatting
Smell: Multiple components (`ProductCard`, `ProductView`, `CartDrawer`) manually instantiate `Intl.NumberFormat('en-IQ')` with inconsistent options (some with decimals, some without). This leads to visual inconsistency and "magic string" duplication.
Standard: Use `formatIQD(amount)` from `@repo/utils` for all IQD price displays. This enforces the standard (0 decimal places) and centralizes the logic.
