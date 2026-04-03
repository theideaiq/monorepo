## 2024-05-24 - Extract Currency Formatter
Smell: Inline `new Intl.NumberFormat()` instances inside component render cycles and loops, leading to decreased performance and inconsistent formatting logic.
Standard: Extract formatting utilities to `@repo/utils/format.ts` and import them, rather than instantiating new `Intl.NumberFormat` objects inside React components. For simple numbers, instantiate the formatter once outside the component.
