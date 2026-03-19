## 2024-03-19 - Test Isolation
**Learning:** `packages/utils` does not have its own tests or a `test` script, so `pnpm test` in the monorepo fails due to preexisting failures in `apps/admin` and `apps/web`.
**Action:** Focus only on tests directly related to the workspace or modified files. Ignore unrelated global CI failures as per instructions.
