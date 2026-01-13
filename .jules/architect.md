# Architect's Journal

## 2025-02-18 - Single Responsibility Modules

Smell: Generic "utils" or "helpers" files that become dumping grounds for unrelated functions.
Standard: Utilities should be grouped by domain (e.g., `date.ts`, `string.ts`) or, if singular and important, given their own file (e.g., `cn.ts`).

## 2025-02-18 - Icon Standard

Smell: Copy-pasting SVG code for common icons when a library like `lucide-react` is already in use.
Standard: Always use the imported icon component from the design system's icon library (e.g., `lucide-react`). Only use custom SVGs for branding or unique assets not available in the library.
