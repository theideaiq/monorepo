## 2024-04-05 - Avoid Intl.NumberFormat Instantiation in React Components
**Learning:** Instantiating `Intl.NumberFormat` inside React functional components or render loops causes measurable CPU overhead and creates unnecessary garbage collection pressure, particularly when formatting items in lists, grids, or cart drawers.
**Action:** Extract formatters to module-level utilities and cache the instances so they can be safely reused across renders and components, ensuring a smoother rendering cycle.
