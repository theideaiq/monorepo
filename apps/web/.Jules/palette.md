## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2026-01-26 - Mobile Navigation Accessibility
**Learning:** Mobile navigation bars often rely solely on color for active states and visual badges for counts, which are invisible to screen readers.
**Action:** Ensure `aria-current="page"` is used for active links and dynamic `aria-label`s (e.g., "Cart, 3 items") are added to buttons with status badges.
