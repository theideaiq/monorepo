## 2025-04-05 - Co-locate Shared Utility Tests
Structure: Unit tests for functions and utilities within shared workspace packages must be co-located within the respective package itself, rather than residing in consumer applications.
Rule: Do not place tests for shared packages (e.g., @repo/utils) inside consumer apps (e.g., apps/web). Keep them in the package they test.
