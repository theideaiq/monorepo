## 2024-03-10 - [Formatters]
Smell: [Inline instantiation of Intl.NumberFormat inside React render cycles across multiple files]
Standard: [Export cached Intl.NumberFormat instances from a centralized lib/formatters.ts to prevent expensive re-evaluations and ensure consistent formatting configurations (e.g., maximumFractionDigits)]
