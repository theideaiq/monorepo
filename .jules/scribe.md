## 2026-01-29 - Ghost Specs & Implicit Constraints
Insight: Discovered unit tests in `apps/web` asserting features (hex entities, null safety) that were not implemented in `@repo/utils`, creating a "Ghost Spec" where documentation (tests) contradicted reality. Also, `slugify` implicitly stripped non-English characters without warning.
Rule: Tests serving as documentation must verify actual implemented behavior; unimplemented features should be marked with `TODO` and skipped. Utilities with implicit language constraints must explicitly document them via JSDoc `@warning`.
