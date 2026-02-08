# Pixel's Journal

## 2025-02-18 - Stretched Link Pattern & Stacking Contexts
**Learning:** Nesting interactive elements (like `<button>`) inside `<a>` or `<Link>` is invalid HTML and causes accessibility/hydration issues. A robust solution is the "Stretched Link" pattern: place an empty `<Link>` with `absolute inset-0` inside a `relative` container, and elevate interactive siblings using `z-index`.
**Action:** When designing clickable cards with internal actions, avoid wrapping the card in a Link. Instead, use the Stretched Link pattern and ensure the parent container has `focus-within` styles for accessibility.

## 2025-02-18 - Dark Mode Contrast
**Learning:** `text-slate-700` provides insufficient contrast on dark backgrounds (like `bg-[#1a1a1a]` or `bg-neutral-900`) used in `apps/web`.
**Action:** Use `text-slate-400` or lighter for secondary text on dark surfaces to ensure readability and accessibility.
