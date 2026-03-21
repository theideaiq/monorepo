## 2024-05-15 - Replace Hardcoded Gold/Yellow Values with Semantic Tokens
**Learning:** Found several components using hardcoded hex values like `#facc15` for background, text, and border colors instead of utilizing the existing `brand-yellow` design token, which leads to inconsistent themes, particularly when a design system change is needed.
**Action:** Always prefer design tokens (e.g. `bg-brand-yellow`, `text-brand-yellow`) over hardcoded arbitrary hex values (`bg-[#facc15]`) to enforce design system consistency.
