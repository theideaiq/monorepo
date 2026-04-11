## 2026-04-11 - Missing ARIA Labels on Icon-only Buttons
**Learning:** Icon-only buttons (like those for Search, User, and Cart in `WebNavbar`, or the Close `X` button in `Drawer`) were missing descriptive `aria-label` attributes. Without these labels, screen readers announce these buttons as 'button', leaving visually impaired users with no context about their function.
**Action:** Always verify that buttons or links containing only icons (like from `lucide-react`) have an explicit, descriptive `aria-label` attribute to ensure full accessibility.
