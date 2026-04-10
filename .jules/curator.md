## 2025-04-10 - Co-locate Unit Tests with Implementation
Structure: Unit tests belonging to packages (e.g. `@repo/utils`) should live in the package itself, alongside the implementation, rather than as "orphan tests" living in consumer applications (e.g., `apps/web/src/lib/string-utils.test.ts`).
Rule: Tests must be co-located directly with the module they test (e.g. `packages/utils/src/string.test.ts` alongside `packages/utils/src/string.ts`) to ensure high cohesion and prevent cross-boundary test bleeding.
