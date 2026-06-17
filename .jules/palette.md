## 2025-02-18 - Hover-Only Actions Accessibility
**Learning:** Interactive elements like "Quick Add" buttons that rely solely on `group-hover:opacity-100` are invisible to keyboard users. Tabbing focuses them, but they remain visually hidden (`opacity: 0`), confusing the user.
**Action:** Always add `focus-visible:opacity-100` (and `translate` reset if applicable) to hover-reveal elements to ensure they appear when focused via keyboard.
