## 2025-02-19 - Use secure random generator for payment reference IDs
**Vulnerability:** The application was using `Math.random()` to generate payment reference IDs for Checkout Sessions.
**Learning:** `Math.random()` is not cryptographically secure and can lead to predictable IDs, which can be exploited by attackers to guess or brute-force reference IDs.
**Prevention:** Always use `node:crypto` `randomUUID()` instead of `Math.random()` to generate payment reference IDs or other critical unique tokens across the monorepo applications, especially in server environments (like Node.js or Next.js server actions).
