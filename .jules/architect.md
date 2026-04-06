## 2025-04-06 - Strict Typing for Component Props
Smell: Loose typing using `any` for React component props, which disables TypeScript checking and can lead to runtime errors, especially with nullable data.
Standard: Always define an `interface` for component props instead of using `any`. Ensure nullable properties (like `string | null` for `src` in Next.js `<Image>`) are handled correctly with conditional rendering.
