## 2025-02-14 - Hardcoded Theme Colors in Components
**Learning:** Found multiple components in apps/web using hardcoded hex values (e.g., bg-[#facc15], bg-[#1a1a1a], bg-[#0a0a0a]) instead of the defined Tailwind brand tokens in packages/ui/src/theme.css. This breaks dark mode integration and creates style inconsistencies.
**Action:** Enforce strict usage of theme variables (e.g., bg-brand-yellow, bg-brand-surface, bg-brand-deep). Next time, proactively search for magic hex codes in className strings across the monorepo to ensure design system adherence.
