## 2024-05-24 - Co-locate package tests
Structure: Monorepo test files must be co-located with their package implementation instead of inside app test directories.
Rule: Do not place package tests inside app codebases (like `apps/web/src/lib/string-utils.test.ts`). They belong in the package source folder alongside the file they test.
