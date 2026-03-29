# Pixel's Journal

## 2024-05-22 - [Hidden Hardcoded Colors] **Learning:** Several components (`ProductCard`, `ProductView`, etc.) were using a hardcoded hex `#1a1a1a` for card backgrounds, which slightly deviated from the design system's `--color-brand-surface` (`#1e1e1e`). This created subtle visual inconsistencies in dark mode depth. **Action:** Replace hardcoded `#1a1a1a` with `bg-brand-surface` token to enforce system consistency.
