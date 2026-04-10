## 2024-04-10 - Cache Intl Formatters
**Learning:** `Intl.NumberFormat` and `Intl.DateTimeFormat` constructors have high CPU overhead and create excess garbage collection when instantiated inline during renders.
**Action:** Always instantiate `Intl` formatter instances once at the module scope and reuse them across function calls. Avoid inline `new Intl.NumberFormat()` inside React components.
