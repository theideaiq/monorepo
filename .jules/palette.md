## 2025-05-20 - Accessible Loading Button Pattern
**Learning:** Found that `isLoading` on `Button` removed children from DOM, which broke accessibility (lost accessible name) and could cause layout shifts.
**Action:** Implemented `text-transparent` on container + `opacity-0` on children to preserve layout and keep content in accessibility tree while visually showing a spinner. This pattern ensures screen readers still announce the button name.
