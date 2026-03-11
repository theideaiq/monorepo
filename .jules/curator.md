## 2024-03-11 - Test Co-location
Structure: Tests must be co-located with the source files they verify within the originating module, rather than orphaned in consumer applications or `__tests__` directories.
Rule: Do not place shared utility tests (e.g. `string.test.ts` for `@repo/utils`) inside a consuming application (like `apps/web/src/lib/`). Always move them to the module they actually test (`packages/utils/src/`).
