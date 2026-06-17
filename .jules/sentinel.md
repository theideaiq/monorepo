## 2025-02-18 - [Implicit Trust in Relational IDs]
**Vulnerability:** Server Actions receiving relational IDs (e.g., `cartId` in `initiateCheckout`) were trusting the caller's input without verifying ownership against the authenticated user, relying implicitly on RLS or client-side logic.
**Learning:** Even with RLS enabled on child tables (`cart_items`), business logic actions often require explicit ownership checks on parent resources (`carts`) to prevent IDOR, especially when the action performs side effects (like creating checkout sessions) before RLS constraints might fully apply or be checked.
**Prevention:** Always perform an explicit `select` on the resource table with a `user_id` check (or `auth.uid()`) at the start of any Server Action that accepts an ID.
