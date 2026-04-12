## 2025-02-14 - Caching Intl object instantiations
**Learning:** `Intl.NumberFormat` and `Intl.DateTimeFormat` are incredibly expensive to instantiate repeatedly. In rendering loops or data grids, they can block the main thread and significantly degrade frontend and backend performance due to V8 recreating locale mapping.
**Action:** Cache these instances using module-level Singletons based on their configuration (e.g. locale and currency) instead of creating them dynamically per call.
