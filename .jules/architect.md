# Architect Journal

## 2025-02-24 - Optimize Intl Formatters
Smell: Instantiating `Intl.NumberFormat` or `Intl.DateTimeFormat` inside functions causes performance overhead as they are expensive to create.
Standard: Hoist `Intl` formatters to module-level constants or static properties. Use them for common formats (e.g., USD, IQD, standard date).
