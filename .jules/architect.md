## 2024-05-18 - Catch block strict typing
Smell: Catching errors as `any` or assuming they have a `.message` property.
Standard: Catch errors as `unknown` and safely access error properties using a type guard, e.g., `error instanceof Error ? error.message : 'An unknown error occurred'`.
