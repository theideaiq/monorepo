## 2024-03-15 - Weak Random Number Generation for Payment Reference ID
**Vulnerability:** The AI assistant app was generating payment reference IDs using `Math.random().toString(36).substring(7)` which is not cryptographically secure and predictable.
**Learning:** This existed because `Math.random()` was used for a quick unique identifier, but it isn't suitable for security-critical contexts like payment identifiers.
**Prevention:** Use `crypto.randomUUID()` for unique identifiers in security contexts.
