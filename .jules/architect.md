## 2024-05-24 - [Centralize IQD Formatting]
Smell: Multiple instances of `Intl.NumberFormat('en-IQ')` instantiated inside components with duplicated configuration.
Standard: Use `formatIQD` from `@repo/utils` for all Iraqi Dinar formatting. It uses a module-level cached `Intl.NumberFormat` instance for performance and consistency (0 decimal places).
