## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-05-20 - Nested Interactive Elements in Cards
**Learning:** ProductCard wrapped the entire component in a Link while also containing a button, causing invalid HTML and potential accessibility issues for screen readers and keyboard users.
**Action:** Use the 'Stretched Link' pattern (after:absolute after:inset-0) on the main link instead of wrapping the card, and ensure nested buttons have higher z-index (z-20).
