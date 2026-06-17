## 2024-05-24 - Zustand Store Mocks Need Explicit Object Schemas
Discovery: Passing primitive values (like strings) to Zustand actions expecting objects causes type mismatch failures in test suites. The real implementation expects properties like `id` and `price`.
Strategy: Always ensure mock inputs explicitly match the expected object schema (e.g., `CartItem`) instead of using raw primitives.
