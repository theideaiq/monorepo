## 2026-02-25 - Domain-Specific Component Co-location
Structure: Feature-based grouping for domain-specific components.
Rule: `apps/web/src/components/ui` is reserved for reusable, domain-agnostic primitives. Components with domain logic or specific feature dependencies (e.g., `ProductCard` depending on `Product` type) must be co-located in feature folders (e.g., `apps/web/src/components/store`).
