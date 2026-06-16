## 2024-03-16 - Paired aria-label and title attributes for icon-only buttons
**Learning:** Icon-only buttons lacking `title` attributes alongside `aria-label` cause usability issues for pointer users who rely on hover tooltips, while lacking `aria-label` harms screen-reader accessibility.
**Action:** Always pair `aria-label` with a `title` attribute for icon-only buttons (like those using `lucide-react`) to ensure both screen-reader accessibility and visual hover tooltips.
