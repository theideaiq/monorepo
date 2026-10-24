# Starting the production database from scratch

The theideaiq.com Supabase project still has the old apps' schema
(`profiles.role`, `products.name`, `orders.total_amount`, …). The old data is
not kept: `reset_old_database.sql` empties the project, and then this
repository's migrations create the new schema.

The reset **permanently deletes**:

- every table, view, function and type the old apps created in `public`;
- the old sign-up trigger on `auth.users` and the old Storage policies;
- every user account.

Extensions and Supabase's own schemas stay. The script runs in a transaction,
and it refuses to run once the new schema is installed, so it can't wipe the
new database by accident.

## Run it

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) (a dev
dependency here: `bunx supabase`) and the database password.

```sh
cd packages/database
bunx supabase link --project-ref <project ref>

# Optional: keep a copy of the old database somewhere safe first.
bunx supabase db dump --linked -f old-schema.sql
bunx supabase db dump --linked --data-only -f old-data.sql

# 1. Empty the old database
psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/reset/reset_old_database.sql

# 2. Create the new schema
bunx supabase db push
```

The connection string is under **Project Settings → Database → Connection
string**. You can also paste the reset script into the **SQL Editor**; the
`db push` step needs the CLI.

If `db push` reports remote migrations that aren't in the repository (for
example ones created from the dashboard), run
`bunx supabase migration repair --status reverted <version>` for each, then
push again.

## Afterwards

1. Enable **Authentication → Multi-Factor → TOTP** (the back office requires
   an authenticator app) and phone sign-in with your SMS provider.
2. Sign up through the app, then make yourself the first superadmin in the
   SQL Editor:

   ```sql
   insert into public.staff (user_id, role)
   select id, 'superadmin' from auth.users where phone = '9647XXXXXXXXX';
   ```

3. In the back office, create the IDEA Plus and business plans, the product
   categories and the catalog.
