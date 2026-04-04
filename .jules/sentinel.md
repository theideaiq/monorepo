## 2026-04-04 - Weak PRNG for Payment Reference IDs
**Vulnerability:** Used Math.random() for generating payment reference IDs in the droid gemini tool.
**Learning:** Math.random() is cryptographically weak and predictable, which poses a risk for tracking references in financial transactions.
**Prevention:** Always use a CSPRNG like crypto.randomUUID() for generating sensitive IDs or references.
