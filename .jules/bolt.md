## 2025-05-24 - [Zustand v5 Selector Mocking]
**Learning:** When mocking Zustand stores (v5) in unit tests, standard `mockReturnValue` fails if the component uses selectors (e.g., `useStore(s => s.item)` or `useShallow`). The hook mock receives the selector as an argument.
**Action:** Use `mockImplementation((selector) => selector ? selector(mockState) : mockState)` to support both direct state access and granular selectors (including `useShallow`) in tests.
