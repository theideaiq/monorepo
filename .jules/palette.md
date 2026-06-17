# Palette's Journal

This journal tracks critical UX and accessibility learnings.

## 2024-05-23 - Mobile Navigation Accessibility
**Learning:** Mobile bottom navigations often rely on color for state and visual badges for notifications, leaving screen reader users in the dark about their current location and cart status.
**Action:** Always add `aria-current="page"` to active links and dynamic `aria-label` to buttons with notification badges (e.g., "Cart, 3 items").
