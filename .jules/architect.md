## 2025-02-18 - Domain Components Location
Smell: Domain-specific components (e.g., `ProductCard` depending on `Product` type) residing in generic UI folders (`components/ui`).
Standard: `components/ui` is reserved for reusable, domain-agnostic primitives. Feature-specific components must be co-located in feature folders (e.g., `components/store`).

## 2025-02-18 - Currency Formatting
Smell: Inline `Intl.NumberFormat` usage causing inconsistency (e.g., decimal places) and potential performance issues (instance creation).
Standard: Use shared formatters from `@repo/utils` (e.g., `formatIQDNumber`) to ensure consistent display and localization.
