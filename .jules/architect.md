## 2026-03-14 - Strict Error Typing in Catch Blocks
Smell: Catching errors with `any` type (e.g., `catch (e: any)`) which disables TypeScript's safety checks for error handling.
Standard: Error variables in catch blocks must be typed as `unknown`. When accessing properties like `.message`, explicitly cast the error (e.g., `(e as Error).message`) to maintain strict typing.
