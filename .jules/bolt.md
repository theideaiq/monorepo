## 2024-05-24 - `Intl.NumberFormat` Instantiation Performance
**Learning:** Instantiating `Intl.NumberFormat` inside React components, especially those rendered frequently like `ProductCard` in a list, is surprisingly expensive and causes measurable performance drops (~50x slower).
**Action:** Always instantiate `Intl.NumberFormat` outside of the component's render function and reuse the instance for formatting to optimize performance.
