# Architect's Journal

## 2026-01-27 - [IQD Currency Formatting]
Smell: Inconsistent and manual formatting of IQD currency (e.g., `new Intl.NumberFormat('en-IQ')`) across the codebase.
Standard: Use `formatIQD` from `@repo/utils`. This enforces 0 decimal places and ensures consistent formatting without the currency symbol (which is often handled by UI layout).

## 2026-01-27 - [Design Tokens for Brand Colors]
Smell: Hardcoded hex values for brand colors (e.g., `#facc15` for brand yellow) in components.
Standard: Use Tailwind CSS classes mapped to design tokens (e.g., `bg-brand-yellow`, `text-brand-dark`) to ensure visual consistency and easier theming updates.
