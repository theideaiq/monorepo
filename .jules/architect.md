## 2025-02-18 - [Independent Utility Testing]
Smell: Utility packages lacking configured test runners or relying on consuming applications for testing.
Standard: Shared utility packages (e.g., `@repo/utils`) must include their own test runner (e.g., `vitest`) and test scripts to ensure independent verification and prevent regressions.
