## 2025-02-18 - IDOR in Server Actions
**Vulnerability:** Server Action `initiateCheckout` accepted `cartId` without verifying it belonged to the authenticated user, relying solely on RLS (Defense in Depth gap).
**Learning:** Server Actions are trusted endpoints; relying implicitly on RLS for critical business logic (like payments) is insufficient. Explicit ownership checks prevent logical bypasses if RLS is misconfigured.
**Prevention:** Always fetch the resource owner and compare with `session.user.id` at the start of any Server Action that mutates state based on a resource ID.
