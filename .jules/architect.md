# Architect's Journal

## 2025-02-14 - Broken Tests and Type Safety
Smell: Tests that are out of sync with the implementation (e.g., testing strings when the store handles objects) create a false sense of security and are effectively dead code.
Standard: Tests must adhere to the same strict type contracts as the source code. If the implementation changes, tests must be updated immediately. Broken tests must be fixed or removed, never ignored.
