## 2024-05-18 - Caching Intl Formatters
**Learning:** Recreating `Intl.NumberFormat` or `Intl.DateTimeFormat` instances on every render or function call is a performance bottleneck. Generating a cache key via `JSON.stringify(options)` is a fast and reliable approach because formatting options objects are stable, small, and deterministic.
**Action:** When implementing internationalization and formatting utils, always memoize/cache the `Intl` formatter instances instead of instantiating them repeatedly inside formatting functions.
