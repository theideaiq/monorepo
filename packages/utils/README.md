# Utilities Package

This package contains shared utility functions and helpers for the IDEA IQ monorepo.
It provides type-safe, tested utilities for common operations like string manipulation, formatting, and class name merging.

## Contents

- **cn**: Class name merging utility (combines `clsx` and `tailwind-merge`).
- **format**: Formatting helpers for currency, dates, and numbers.
- **logger**: Centralized logging utility that respects test environments.
- **string**: String manipulation helpers (slugify, HTML entity decoding).

## Usage

### Class Name Merging
```tsx
import { cn } from '@repo/utils';

// Merges classes and resolves Tailwind conflicts
<div className={cn("bg-red-500 p-4", "p-8", condition && "text-white")} />
// Result: "bg-red-500 p-8 text-white" (if condition is true)
```

### Formatting
```ts
import { formatCurrency, formatDate } from '@repo/utils';

formatCurrency(5000, 'USD'); // "$5,000.00"
formatCurrency(5000, 'IQD'); // "IQD 5,000" (Zero decimal places)

formatDate(new Date()); // "Jan 1, 2026"
```

### Logging
```ts
import { Logger } from '@repo/utils';

Logger.log('User logged in', { userId: '123' });
// suppressed in NODE_ENV=test
```

### String Helpers
```ts
import { decodeHtmlEntities, slugify } from '@repo/utils';

// Decodes named, decimal, and hex entities
decodeHtmlEntities('&#x41;'); // "A"

slugify("Hello World!"); // "hello-world"
```

## Testing

This package relies on the test environment configuration of `apps/web`.
Unit tests for these utilities are located in `apps/web/src/lib/` (e.g., `string-utils.test.ts`) to leverage the existing `vitest` setup.

To run tests for this package:
```bash
pnpm --filter web test src/lib/string-utils.test.ts
```
