## 2024-05-23 - Unifying Surface Colors
**Learning:** Hardcoded hex values like `#1a1a1a` were used inconsistently for dark surfaces, creating subtle visual mismatches against the system token `brand-surface` (`#1e1e1e`).
**Action:** Always use `bg-brand-surface` (or `from-brand-surface` for gradients) instead of `#1a1a1a` or other near-black hex codes. This ensures a unified "Apple Store meets Cyberpunk Baghdad" aesthetic and simplifies dark mode maintenance.
