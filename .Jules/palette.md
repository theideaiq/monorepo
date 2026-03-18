
## 2026-03-18 - Adding ARIA labels to icon-only buttons
**Learning:** Found multiple icon-only buttons (search, user, cart, heart, cart quantity adjusters, social media links) across the app lacking `aria-label` attributes. This makes them inaccessible to screen readers. We should ensure all icon-only buttons and links have `aria-label` (and `title` for hover tooltips if appropriate).
**Action:** Add `aria-label` and `title` to icon-only buttons in `WebNavbar`, `NavbarActions`, `WebFooter`, `ProductView`, `CartDrawer`, and `BottomNav`.
