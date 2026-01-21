## 2025-05-23 - Standardizing Component Variants with CVA
Smell: Inconsistent implementation of component variants (Badge used object lookup, Button used cva).
Standard: All UI components with variants must use `class-variance-authority` (cva) for type-safe and consistent styling logic.
