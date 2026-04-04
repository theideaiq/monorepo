## 2026-02-01 - [Role Constants]
Smell: Magic strings are used for checking and assigning roles (e.g. `'admin'`, `'superadmin'`). This is prone to typo errors, and refactoring requires text search across multiple files.
Standard: We must use the `ROLES` constant from `@/lib/constants` for all role-based logic to ensure consistency and compile-time safety.
