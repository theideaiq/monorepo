## 2025-05-24 - Standardized Currency Formatting
Smell: Inconsistent `Intl.NumberFormat` instantiation across applications, leading to duplicated logic and potential formatting drift (e.g., decimal places in IQD).
Standard: Use `@repo/utils` helpers: `formatCurrency(amount, 'USD')` for standard currency display, and `formatIqdAmount(amount)` for Iraqi Dinar display (0 decimal places, no symbol) where the UI handles the symbol separately.
