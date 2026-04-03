## 2024-02-19 - React Intl.NumberFormat Caching
**Learning:** Instantiating `Intl.NumberFormat` inline inside React table cell renderers (e.g., using Tanstack Table) causes expensive reallocation and locale loading on every row render and component update, severely degrading list rendering performance.
**Action:** Always instantiate `Intl.NumberFormat` once outside the component at the module level (e.g., `const usdFormatter = new Intl.NumberFormat(...)`) and reuse the `.format()` method inside the render cycle.
