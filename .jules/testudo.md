## 2026-01-30 - Legacy Mock Implementations
Discovery: Legacy Zustand store tests (like cart-store) used primitive types (strings) for complex objects (CartItem), which masked edge cases like quantity calculations and attribute access, leading to false positives and brittle assertions.
Strategy: Always use realistically shaped object mocks (matching TypeScript interfaces) when testing stores and domain logic. Ensure boundary analysis explicitly tests zero/negative numeric updates and proper aggregation (totals).
