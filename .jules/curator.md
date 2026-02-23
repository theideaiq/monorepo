## 2025-02-18 - [Co-located Tests for Shared Packages]
Structure: Shared utility packages (@repo/utils, etc.) must own their unit tests.
Rule: Do not write tests for shared library code inside consuming applications (e.g., apps/web). Co-locate tests with the source file (e.g., src/string.ts -> src/string.test.ts) within the package.
