## 2025-05-24 - Component Logic Separation
Structure: Domain-specific components (`ProductCard`, `VariantSelector`) belong in feature folders (`components/store`), while `components/ui` is reserved for generic primitives.
Rule: UI components must be agnostic. If a component imports a store or service, it belongs in a feature folder.

## 2025-05-24 - Layout Component Grouping
Structure: Global layout components (`BottomNav`, `WebNavbar`) reside in `components/layout`, separate from `components/ui`.
Rule: Components that define the application shell or page structure belong in `components/layout`.
