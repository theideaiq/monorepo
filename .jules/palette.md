# Palette's Journal

## 2026-01-07 - Input Component Accessibility
**Learning:** Screen readers require explicit association between inputs and their error messages. Merely rendering the error text near the input is insufficient for non-visual users to know the input is invalid or what the error is.
**Action:** When creating form inputs, always generate a unique ID for the error message, add `aria-invalid` to the input when in an error state, and link them using `aria-describedby`.

## 2025-02-23 - Accessibility in Dynamic Modals
**Learning:** React 19 `useId` is critical for linking dynamic modal titles with `aria-labelledby` without prop drilling IDs. Focus management (trapping or initial focus) in `useEffect` is essential but requires `requestAnimationFrame` to ensure the DOM is ready in some cases, especially with Framer Motion animations.
**Action:** Always check if a modal focuses its content on open. If using animations, verify focus timing.
