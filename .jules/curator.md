## 2024-06-21 - Co-locate Tests with Shared Utilities
Structure: Shared utilities in `@repo/utils` must have their tests co-located within `packages/utils/src/` rather than in consumer application repositories (e.g. `apps/web`).
Rule: Tests should be placed alongside the module they are testing, applying "Co-location: Things that change together should stay together".