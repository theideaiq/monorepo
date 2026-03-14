## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-10-28 - Missing Tooltips and Labels on Icon-only Buttons
**Learning:** Icon-only buttons often lack accessibility and contextual clarity. Using `aria-label` along with `title` attributes improves both screen-reader accessibility and standard pointer UX, specifically for disabled states.
**Action:** When adding icon-only buttons, always ensure they are accompanied by an `aria-label` and, if appropriate, a `title` attribute for tooltips, especially when explaining a disabled state.
