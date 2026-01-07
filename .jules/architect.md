# Architect's Journal

## 2025-02-18 - Single Responsibility Modules

Smell: Generic "utils" or "helpers" files that become dumping grounds for unrelated functions.
Standard: Utilities should be grouped by domain (e.g., `date.ts`, `string.ts`) or, if singular and important, given their own file (e.g., `cn.ts`).
