## 2024-05-31 - Strict Error Typing
Smell: Catching errors as `any` (e.g., `catch (error: any)`) and unsafely accessing properties like `error.message`.
Standard: Catch errors as `unknown` and safely access error properties using a type guard, e.g., `error instanceof Error ? error.message : 'An unknown error occurred'`.
