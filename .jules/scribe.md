## 2025-05-23 - The Case of the Missing (but Present) Patch

Insight: The README stated that `patches/@capacitor__cli.patch` was "missing from the repository," leading to confusion since the file clearly exists in the `patches/` directory. The confusion stems from `patchedDependencies` being removed from `package.json`, effectively disabling the patch, not removing the file itself.

Rule: When documenting disabled features or workarounds, distinguish between "file missing" (404) and "configuration disabled" (feature toggle). Use precise language: "The patch is currently disabled in package.json" instead of "missing from the repository."

## 2025-05-23 - The Invisible Infrastructure

Insight: The `packages/` directory contains critical infrastructure code (`payment-engine`, `wayl`) that powers `apps/web`, `apps/admin`, and `apps/droid`. However, these packages were completely absent from the README's "Packages" list, making the system architecture opaque to new contributors.

Rule: All workspace packages must be listed in the root `README.md`. If a package is "internal only" (not published), it should still be documented to explain its role in the monorepo architecture.
