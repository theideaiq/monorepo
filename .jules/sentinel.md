## 2023-10-27 - Weak random number generation for security purposes
**Vulnerability:** Found `Math.random().toString(36).substring(7)` being used to generate payment link reference IDs in `apps/droid/src/lib/gemini.ts`.
**Learning:** `Math.random()` is not cryptographically secure, and using it to generate critical identifiers like payment references can lead to predictability and potential collisions.
**Prevention:** Always use cryptographically secure random number generators, such as `globalThis.crypto.randomUUID()`, when generating sensitive identifiers.
