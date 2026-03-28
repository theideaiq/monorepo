## 2024-03-28 - Typed Catch Clauses
Smell: Using `catch (e: any)` which circumvents TypeScript's `unknown` strictness in catch clauses.
Standard: Use `catch (e)` with `unknown` type, and check `if (e instanceof Error)` or a helper utility `getErrorMessage(e)` to extract error messages safely.
