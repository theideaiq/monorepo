## 2024-05-24 - Caching Intl.NumberFormat in React
**Learning:** Instantiating `Intl.NumberFormat` on every render or in loops (like lists of ProductCards) is relatively expensive. In high-traffic or deeply-nested components, repeated instantiation degrades rendering performance.
**Action:** Create a singleton formatter instance and share it across components instead of calling `new Intl.NumberFormat()` locally.
