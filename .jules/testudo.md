# Testudo's Journal

## 2025-02-18 - Cart Store Input Discrepancy
Discovery: Existing unit tests passed string primitives to `addItem` while the implementation required `CartItem` objects, leading to undefined behavior and false assumptions about store state.
Strategy: Enforce strict type checking in test inputs to match implementation interfaces; avoid loose typing or partial mocks that deviate from the actual data shape.
