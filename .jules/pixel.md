## 2025-02-14 - Magic Hex Colors vs Theme Tokens
**Learning:** Hardcoded hex values like `#facc15` inside `bg-[]` or `text-[]` classes break the design system and complicate future theme updates. The project has these colors defined as tokens (`brand-yellow` in this case) in `packages/ui/src/theme.css`.
**Action:** Always prefer `bg-brand-yellow` or `border-brand-yellow` over inline magic hex colors. When observing a hardcoded value, map it back to `theme.css`.
