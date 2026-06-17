## 2026-04-02 - Cached Intl.NumberFormat Instantiation
**Learning:** Instantiating `Intl.NumberFormat` on every render (or function call within a loop) is a significant CPU bottleneck in JavaScript applications, especially when formatting currencies in React component lists like `ProductCard`.
**Action:** When using `Intl.NumberFormat`, hoist the instance outside the React component's render function to reuse it, or cache instances in a `Map` keyed by locale/currency within utility functions to avoid continuous re-instantiation.
