## 2026-02-01 - Domain vs Generic UI Separation
Structure: Move domain-specific components (e.g., ProductCard, VariantSelector) out of generic `ui` folders and into feature-specific folders (e.g., `store`).
Rule: `components/ui` is strictly for generic, reusable design system primitives (Buttons, Inputs, Dialogs). Business logic or domain entities belong in feature folders.
