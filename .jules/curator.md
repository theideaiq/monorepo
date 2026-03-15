## 2024-05-18 - Co-locating tests
Structure: Tests should be co-located with the source files they verify instead of being placed in application folders.
Rule: Test files must sit right next to the source code they are testing (e.g. `packages/utils/src/string.test.ts` next to `packages/utils/src/string.ts`).