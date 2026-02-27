# Testudo's Journal

## 2025-02-28 - Invalid Cart Store Test Data
Discovery: The cart store tests were treating the store items as an array of strings, while the implementation requires complex objects (CartItem). This caused immediate failure when running the test suite, masking potential real regressions.
Strategy: Strictly type mock data in tests to match the interfaces defined in the source code. Use helper functions to generate valid mock objects rather than relying on loose typing.
