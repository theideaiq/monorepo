## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-02-17 - Mobile-First Interactive Elements
**Learning:** Interactive elements (like "Quick Add" buttons) that rely on `hover` for visibility are inaccessible on touch devices.
**Action:** Always ensure interactive elements are visible by default on touch devices (`opacity-100`) and only use `hover` reveal patterns on desktop (`lg:` breakpoint).
