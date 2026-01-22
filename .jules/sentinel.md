## 2025-05-18 - IDOR in Checkout Process
**Vulnerability:** The `initiateCheckout` server action accepted a `cartId` without verifying it belonged to the authenticated user, allowing potential checkout of others' carts (IDOR).
**Learning:** Server Actions in Next.js are public endpoints; argument validation and ownership checks are mandatory, just like REST APIs. Input types (like UUIDs) must be strictly validated.
**Prevention:** Always validate input formats (e.g., UUID) and verify resource ownership against the session user before performing actions.
