## 2025-04-03 - Store Components Co-location
Structure: Moving store-specific components (ProductCard, VariantSelector) out of the generic `ui` folder to co-locate with `ProductView` and `CartDrawer` in `components/store/`.
Rule: Co-locate domain-specific components with their features instead of dumping them in a generic `ui` directory. Only truly generic components that can be used across multiple domains should live in `ui` or `@repo/ui`.
