## 2024-05-20 - [Test Co-location in Workspaces]
Structure: Shared utility packages must include their own test runners and test scripts, rather than relying on consuming applications to test them. Tests for utilities must be co-located within the utility package itself.
Rule: Shared packages (like packages/utils) must have their tests inside their own package directory and include a local test script.
