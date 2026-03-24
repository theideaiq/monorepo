## 2024-05-15 - Strict Component Props Typing
Smell: Using `any` and `biome-ignore lint/suspicious/noExplicitAny` for component props (like `icon` or `items`).
Standard: Enforce strict typing using TypeScript interfaces. Use `React.ReactNode` for elements passed as props (e.g., icons) and define specific types for arrays instead of `any[]`.
