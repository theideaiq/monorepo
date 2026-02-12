# Curator's Journal

## 2025-02-18 - Shared Package Testing
Structure: Unit tests for shared packages (like `@repo/utils`) must be co-located with the source code in the package itself, not in the consuming application.
Rule: Tests live next to the code they test. Shared packages must have their own test configuration (Vitest).
