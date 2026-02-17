## 2025-10-27 - Inconsistent Form Accessibility
**Learning:** Found that `Select` component lacked accessibility attributes (`aria-invalid`, `aria-describedby`) and required indicators present in `Input`.
**Action:** When working on form components, cross-reference `Input` implementation to ensure consistency in accessibility patterns.

## 2025-05-18 - Card Action Visibility
**Learning:** Hidden-on-default actions (like "Quick Add" buttons) are inaccessible to keyboard and touch users.
**Action:** Use a mobile-first approach: visible by default (`opacity-100`), then hide on large screens (`lg:opacity-0`) and reveal on hover (`lg:hover:opacity-100`) or focus (`focus-visible:opacity-100`).
