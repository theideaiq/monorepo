# Environment Package

This package manages environment variable validation and type-safety using `@t3-oss/env-nextjs` and `zod`.

## Usage

Import the environment object specific to your app:

```ts
import { env } from '@repo/env/web';
// or
import { env } from '@repo/env/admin';
// or
import { env } from '@repo/env/droid';

console.log(env.NEXT_PUBLIC_APP_URL);
```

## Adding Variables

1.  Edit the schema file in `src/`.
2.  Add the variable to the validation logic.
3.  Update `.env.example` in the respective app.
