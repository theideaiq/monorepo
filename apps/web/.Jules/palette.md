## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-05-19 - Stretched Link Pattern for Interactive Cards
**Learning:** Nested interactive elements (buttons inside links) cause HTML validation errors and accessibility issues.
**Action:** Use the Stretched Link pattern (absolute overlay link + elevated interactive elements) for complex clickable cards, ensuring proper `z-index` and `focus-visible` states.
