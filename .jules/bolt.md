## 2024-05-23 - Env Validation Trap
**Learning:** `SKIP_ENV_VALIDATION="true"` in `@t3-oss/env-nextjs` bypasses the entire Zod schema, including `default()` values. This causes missing optional variables to become `undefined` instead of their default value, crashing builds that rely on them (e.g., `new URL(undefined)`).
**Action:** When skipping validation, always provide explicit fallbacks in `experimental__runtimeEnv` (e.g., `process.env.VAR ?? 'default'`) or ensure all variables are explicitly set in the environment.

## 2024-05-23 - CI Base Workflow Lock
**Learning:** GitHub Actions workflows running on `pull_request` from a base branch (e.g., `main`) cannot be fixed within the PR itself if the failure occurs before checkout or due to configuration errors in the base file.
**Action:** Instead of trying to patch the broken workflow in the PR, create a new temporary or parallel workflow with a different name to run the necessary checks and unblock the PR.
