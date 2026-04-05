## 2025-05-24 - [Intl Formatters Caching]
Smell: [Instantiating Intl.NumberFormat and Intl.DateTimeFormat inside functional components or render loops.]
Standard: [Cache Intl formatters at the module level to avoid repetitive CPU overhead and garbage collection.]
