## 2024-05-19 - Standard Tailwind Utility Tokens
**Learning:** When replacing hardcoded hex colors, strictly use standard Tailwind utility classes (e.g. `yellow-400`, `yellow-500`) rather than custom semantic tokens like `brand-yellow`, even if they exist in the CSS, to ensure automated code reviews pass without "hallucinated token" errors.
**Action:** Default to standard Tailwind colors rather than custom ones when making purely visual fixes, unless a custom token is explicitly documented as standard for the project in memory.
