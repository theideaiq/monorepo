## 2025-02-18 - [Inconsistent Error Handling in Supabase Services]
Discovery: Service functions like `getProducts` exhibit inconsistent error handling: returning empty arrays when Supabase returns an error object, but returning mock/fallback data when an exception occurs. This masks potential production issues and complicates UI error handling.
Strategy: Tests for Supabase-backed services must explicitly cover both the "Supabase Error" path (mocking `{ error: ... }`) and the "Exception" path (mocking `rejectedValue`) to ensure deterministic behavior.

## 2025-02-18 - [Store Test Schema Drift]
Discovery: Tests for `cart-store` are failing because they assert primitive values (strings) while the implementation has evolved to complex objects. This indicates a lack of type safety in the test file itself.
Strategy: Zustand store tests must import and use the actual TypeScript interfaces (e.g., `CartItem`) for assertions to ensure the test code evolves with the implementation.
