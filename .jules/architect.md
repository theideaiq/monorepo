## 2025-03-15 - Unify Currency Formatting
Smell: Inconsistent inline formatting of currency using `.toLocaleString()` scattered across components (e.g. `SubscriptionCard.tsx`, `transactions/page.tsx`).
Standard: Always use the centralized `formatCurrency` utility from `@repo/utils` to ensure consistent decimal and localization handling for all displayed prices.
