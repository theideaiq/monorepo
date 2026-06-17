## 2024-05-18 - [Type Tightening: Replace any in try/catch]
Smell: Catching errors as `any` type in try-catch blocks violates strict typing.
Standard: Catch errors as `unknown` (or rely on default `unknown` inference) and use type guards like `err instanceof Error` to safely access properties.
