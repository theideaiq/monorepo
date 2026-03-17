## 2025-03-17 - Missing ARIA labels and titles on icon-only buttons
**Learning:** Many icon-only buttons in `CartDrawer.tsx` (trash, minus, plus), `Drawer.tsx` (close), `BottomNav.tsx` (cart) and `WebNavbar.tsx` (search, cart) lack `aria-label` and `title` attributes, which makes them inaccessible for screen-reader users and lacks visual hover tooltips for pointer users.
**Action:** When adding icon-only buttons, always include `aria-label` for screen readers and `title` for visual tooltips, especially to convey the meaning of the button.
