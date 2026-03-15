## 2024-05-18 - Type Mismatch in Zustand Stores Tests
Discovery: Testing Zustand stores (like `useCartStore`) with raw primitive strings instead of the expected object schemas (`CartItem`) causes false positive failures.
Strategy: Verify that mock inputs explicitly match the expected object schema (like `CartItem` objects with `id`, `price`, etc.) instead of using raw primitives to ensure type safety and accurate assertions.
