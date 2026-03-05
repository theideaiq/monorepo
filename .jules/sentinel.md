## 2025-02-17 - Weak Random Number Generation in Payment References
**Vulnerability:** Weak, predictable payment reference IDs were being generated using `Math.random().toString(36).substring(7)` for `apps/droid/src/lib/gemini.ts` Checkout Sessions.
**Learning:** `Math.random()` is not cryptographically secure and predictable, which could expose payment webhooks to ID prediction, potential session hijacking, or collision attacks depending on webhook handlers implementations.
**Prevention:** Use a cryptographically secure generator like `crypto.randomUUID()` to generate reference IDs for payment webhook events while ensuring to prepend required app-specific routing prefixes.
