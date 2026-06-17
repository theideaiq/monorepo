## 2025-02-14 - Strict Boolean Checks for Arrays
Smell: Loose boolean checking on array length (e.g. `items.length ? ... : ...`)
Standard: Always explicitly check array length against 0 (e.g. `items.length > 0 ? ... : ...`) to avoid rendering falsy `0` values in React components and improve clarity.
