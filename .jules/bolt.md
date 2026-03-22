## 2025-05-23 - Prevent repeated array reductions on render
**Learning:** Found multiple components (`BottomNav`, `WebNavbar`) using `reduce` on the cart items array during render to calculate the total quantity, along with the store recalculating total price on every update using another `reduce` pass. While the cart size is typically small, doing this on every UI render pass is inefficient.
**Action:** Always compute derived totals (`total`, `totalQuantity`) in a single pass during state updates inside the store, expose the scalar values, and read them directly in the UI components.
