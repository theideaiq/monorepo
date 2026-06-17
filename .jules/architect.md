## 2025-03-09 - Strict Typing for Tuple Includes Checks
Smell: Using `as any` to bypass TypeScript's exact type checking when calling `.includes()` on read-only tuples.
Standard: Cast the tuple to a broader array type (e.g., `(myTuple as readonly string[]).includes(value)`) to maintain type safety without resorting to `any`.
