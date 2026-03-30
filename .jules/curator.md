## 2024-05-18 - Co-locate Tests for Shared Packages
Structure: Tests for shared workspace packages (like `@repo/utils`) must be co-located with their corresponding source code within the package itself, rather than being housed in consumer applications (e.g., `apps/web`).
Rule: Tests for shared packages belong in the shared package.
