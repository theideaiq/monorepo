## 2024-05-23 - Strict Error Typing in Catch Blocks
Smell: Loose typing of error objects in catch blocks using `catch (e: any)`. This violates strict typing rules and can obscure actual error types.
Standard: Catch blocks must use `catch (e: unknown)` and errors should be handled with safe assertions, like `(e as Error).message`.
