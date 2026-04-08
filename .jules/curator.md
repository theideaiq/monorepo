## 2024-05-18 - [Co-locate Workspace Tests]
Structure: We co-locate tests with the package implementation rather than putting tests in consuming applications.
Rule: Shared library tests must live inside the specific package they test (e.g., `packages/utils/src`) and the package must define its own test runner and dependencies.
