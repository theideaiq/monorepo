## 2024-04-04 - Workspace Test Co-location
Structure: Unit tests for functions and utilities within shared workspace packages must be co-located within the respective package itself.
Rule: Do not place tests for workspace packages (like `@repo/utils`) inside consumer applications (like `apps/web`).