# Palette's Journal

## 2026-01-13 - Skip to Content Link
**Learning:** For keyboard and screen reader users, repeated navigation menus on every page are a major barrier. A "Skip to Content" link is a simple, invisible-until-focused mechanism that drastically improves navigation efficiency.
**Action:** Ensure every page layout includes a hidden link at the very top that targets the main content area (`<main id="main-content">`).

## 2026-01-07 - Input Component Accessibility
**Learning:** Screen readers require explicit association between inputs and their error messages. Merely rendering the error text near the input is insufficient for non-visual users to know the input is invalid or what the error is.
**Action:** When creating form inputs, always generate a unique ID for the error message, add `aria-invalid` to the input when in an error state, and link them using `aria-describedby`.

## 2025-02-23 - Accessibility in Dynamic Modals
**Learning:** React 19 `useId` is critical for linking dynamic modal titles with `aria-labelledby` without prop drilling IDs. Focus management (trapping or initial focus) in `useEffect` is essential but requires `requestAnimationFrame` to ensure the DOM is ready in some cases, especially with Framer Motion animations.
**Action:** Always check if a modal focuses its content on open. If using animations, verify focus timing.

## 2025-05-21 - Empty States with Actions
**Learning:** A blank list (e.g., "No results") is a dead end for users. An empty state should explain *why* it's empty and provide a clear *action* to resolve it (e.g., "Clear Filters", "Create New").
**Action:** When rendering lists that can be empty, always include a dedicated empty state component with an icon, explanation, and a call-to-action button.
