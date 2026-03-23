## 2025-03-23 - Replaced Hardcoded standard colors with default utility classes
**Learning:** Hardcoding standard hex colors (like `#facc15` and `#eab308`) inside utility classes (e.g. `bg-[#facc15]`) instead of using Tailwind's default palette utilities (e.g. `bg-yellow-400` and `bg-yellow-500`) skips built-in scaling and breaks color consistency when using standard semantic tokens.
**Action:** Always map standard hex values to their equivalent Tailwind default color utility classes (e.g. `yellow-400`, `yellow-500`) or defined brand variables (`brand-yellow`).
