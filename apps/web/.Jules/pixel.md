## 2024-05-23 - Standardize Card Interactivity and Backgrounds
**Learning:** Nested interactive elements (buttons inside links) cause accessibility issues. The "Stretched Link" pattern with `after:absolute after:inset-0` on an inner anchor allows the entire card to be clickable without semantic violations, while keeping nested buttons clickable via z-indexing.
**Action:** Use Stretched Link for clickable cards. Ensure nested interactive elements have higher z-index. Replace hardcoded `#1a1a1a` backgrounds with `bg-brand-surface` token.
