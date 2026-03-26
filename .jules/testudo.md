## 2024-05-24 - Cart Store Duplicate Item Handling
Discovery: The `useCartStore` was duplicating items instead of updating quantities when adding the same item twice, but the test `should add items to the cart` was testing the wrong shape of the cart items (it tested an array of strings but `useCartStore` uses objects).
Strategy: We updated the tests to verify the proper object shapes in `CartItem[]` and correctly test adding and updating quantities using object items to prevent regressions.
