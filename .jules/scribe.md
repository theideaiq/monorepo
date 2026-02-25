# Scribe's Journal

## 2025-05-27 - Node Engine Requirement Mismatch
Insight: The project requires Node.js >=24.12.0 in `package.json`, which is higher than current LTS (v22). This causes `pnpm install` and other commands to fail in standard environments.
Rule: Document the `npm_config_engine_strict=false` workaround in `README.md` for contributors on LTS versions.

## 2025-05-27 - Phantom Missing Patch
Insight: `README.md` claimed `patches/@capacitor__cli.patch` was missing, but it existed in the codebase. The issue was likely a missing `patchedDependencies` config in `package.json`.
Rule: Verify file existence before documenting it as "missing".
