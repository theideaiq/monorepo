## 2024-03-24 - [Intl.NumberFormat Optimization]
**Learning:** Recreating `Intl.NumberFormat` instances on every render is a known performance anti-pattern in React because creating these formatter objects is surprisingly expensive. Memory notes indicated caching them (e.g., `iqdFormatter`), but the codebase was still instantiating `new Intl.NumberFormat` inline in components like `ProductCard`, `CheckoutFlow`, and `CartDrawer`.
**Action:** Extract `Intl.NumberFormat` instances into module-level constants or an exported utility to reuse the same instance across all renders.
