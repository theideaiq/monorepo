## 2026-02-04 - IDOR in Server Actions
**Vulnerability:** IDOR in `checkout.ts` allowed initiating checkout for any cart ID without ownership verification.
**Learning:** Server Actions accepting resource IDs (like `cartId`) must explicitly verify ownership (e.g., `cart.user_id === user.id`) before proceeding, even if RLS exists (Defense in Depth).
**Prevention:** Always fetch the resource and check `user_id` against the authenticated user in Server Actions before performing sensitive operations.
