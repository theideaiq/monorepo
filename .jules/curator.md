## 2026-01-28 - [Co-location of Tests]
Structure: Tests for shared packages live inside the package, not in the consuming app.
Rule: If a file belongs to a package (e.g., @repo/utils), its test must reside in that package (e.g., packages/utils/src).
