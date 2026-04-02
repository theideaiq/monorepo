## YYYY-MM-DD - Initial Journal\n**Learning:** Pixel agent initialized.\n**Action:** Starting UI polish operations.

## 2026-04-02 - Eliminate Magic Hex Colors
**Learning:** Found a hardcoded hex background (`#1a1a1a`) used as an image container placeholder, which violates strict token adherence and risks breaking theme modes if dark/light variations are added.
**Action:** Always map near-black or ad-hoc grays to semantic tailwind tokens (e.g. `bg-neutral-900`) to keep the design system robust and avoid CSS drift.
