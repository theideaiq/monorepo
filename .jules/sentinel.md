## 2024-05-23 - IDOR in Checkout Action
**Vulnerability:** The `initiateCheckout` action accepted a `cartId` without verifying it belonged to the authenticated user.
**Learning:** Relying solely on client-side state or implicit RLS (if present) is insufficient. Server Actions act as public API endpoints and must validate all inputs and ownership.
**Prevention:** Always fetch the resource and check `resource.user_id === session.user.id` before performing sensitive operations.
