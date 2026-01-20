# Database Package

This package provides a type-safe interface for Supabase interactions and shared database types.

## Contents

- **Types**: Generated TypeScript types from the database schema.
- **Service**: Service Role client factory for admin/script usage (bypassing RLS).

## Usage

### Types

Import the generated database types to ensure type safety in your application code.

```tsx
import type { Database } from '@repo/database/types';

// Use in your Supabase client definition
const supabase = createClient<Database>(...);
```

### Service Role Client

Use the service role client for backend scripts, edge functions, or administrative tasks that require bypassing Row Level Security (RLS).

**⚠️ Warning:** Never use the Service Role key in client-side code.

```tsx
import { createServiceRoleClient } from '@repo/database/service';

const supabase = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

## App-Specific Clients

For standard application usage (Client Components, Server Components, Server Actions), each app implements its own Supabase client factory to handle environment-specific authentication and cookies:

- **Web**: `apps/web/src/lib/supabase/`
- **Admin**: `apps/admin/src/lib/supabase/`

This separation ensures that authentication state (cookies) is handled correctly for each specific Next.js application context.
