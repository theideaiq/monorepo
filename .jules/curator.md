## 2024-05-24 - Feature Co-location for Domain Components
Structure: Group domain-specific components (like ProductCard) in feature folders (e.g., `components/store`), ensuring `components/ui` remains reserved for generic, reusable design system primitives.
Rule: Domain logic components must be co-located with their feature module; `components/ui` is strictly for dumb, business-agnostic UI elements.
