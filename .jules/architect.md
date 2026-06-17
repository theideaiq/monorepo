## 2024-05-15 - Inline Currency Formatting
Smell: Hardcoding `new Intl.NumberFormat` or using `.toLocaleString()` directly in React components for price display leads to inconsistent decimal places and locale formatting across the application, and it causes expensive recalculations during render cycles.
Standard: Always use the centralized `formatCurrency` utility from `@repo/utils` to format prices and currency.
