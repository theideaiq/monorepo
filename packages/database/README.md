# Database Package

This package provides a type-safe interface for Supabase interactions.

## Contents

- **Client**: Browser-side Supabase client factory.
- **Server**: Server-side Supabase client factory (using `ssr`).
- **Types**: Generated TypeScript types from the database schema.

## Usage

### Client Component

```tsx
import { createClient } from '@repo/database/client';

const supabase = createClient();
```

### Server Component / Server Action

```tsx
import { createClient } from '@repo/database/server';

const supabase = await createClient();
```
