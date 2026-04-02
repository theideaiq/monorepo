## 2024-04-02 - Co-locating Package Tests
Structure: Move unit tests from consumer apps (e.g., apps/web/src/lib/string-utils.test.ts) into the specific workspace package they test (e.g., packages/utils/src/string.test.ts).
Rule: Tests for functions and utilities within shared workspace packages must be co-located within the respective package itself, rather than residing in consumer applications.
