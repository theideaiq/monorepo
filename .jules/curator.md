## 2025-02-13 - [Co-location of Package Tests]
Structure: Tests for shared packages must be located within the package itself, not in the consuming app.
Rule: `packages/<name>/src/<file>.ts` tests should live in `packages/<name>/src/<file>.test.ts`.
