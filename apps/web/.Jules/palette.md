## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-05-18 - Hover-Dependent Actions on Mobile
**Learning:** Found that "Quick Add" button in `ProductCard` was hidden by default (`opacity-0`) and only revealed on hover, making it inaccessible on touch devices.
**Action:** Use mobile-first visibility for critical actions (visible by default), and apply hover-reveal patterns only on desktop breakpoints (e.g., `lg:opacity-0 lg:group-hover:opacity-100`).
