## 2025-06-25 - React Component Prop Typing
Smell: Inline `any` types used for React component props (e.g., `function Component({ prop }: any)`), completely bypassing type safety and creating technical debt.
Standard: Explicitly define an interface for component props (e.g., `interface ComponentProps`) and use it in the component signature. Never use `any` or `// biome-ignore lint/suspicious/noExplicitAny` for component definitions.
