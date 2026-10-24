# Moving the old theideaiq.com database to the new schema

The production Supabase project still has the schema of the old apps
(`profiles.role`, `products.name`, `orders.total_amount`, …). These two
scripts bring it to the schema in `../migrations` **without losing data**:

1. `1_move_old_schema.sql` moves every old table, view, function and type
   from `public` into a `legacy` schema (not exposed by the API) and removes
   the old sign-up trigger on `auth.users` and the old Storage policies.
2. `supabase db push` applies this repository's migrations to the now-empty
   `public` schema.
3. `2_import_old_data.sql` copies the old data into the new tables. The
   header of the file lists what is copied and how.

Both scripts run in a transaction, refuse to run out of order, and were
rehearsed on a reproduction of the old schema: every migration applies,
the RLS test suite passes on the result, new sign-ups get a profile and
imported customers can delete their accounts.

## Run it

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) (it is a dev
dependency here: `bunx supabase`) and the database password.

```sh
cd packages/database

# 0. Back up first (Dashboard → Database → Backups, or a dump):
bunx supabase link --project-ref <project ref>
bunx supabase db dump --linked -f old-schema.sql
bunx supabase db dump --linked --data-only -f old-data.sql

# 1. Set the old schema aside
psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/legacy/1_move_old_schema.sql

# 2. Create the new schema
bunx supabase db push

# 3. Copy the data across (prints NOTICE lines for anything it skipped)
psql "<connection string>" -v ON_ERROR_STOP=1 -f supabase/legacy/2_import_old_data.sql
```

The connection string is under **Project Settings → Database → Connection
string** (use the session pooler or direct connection, with your password).
You can also paste each script into the **SQL Editor** and run it.

If `db push` reports remote migrations that aren't in the repository (for
example ones created from the dashboard), check `bunx supabase migration
list --linked`. Mark them as reverted with
`bunx supabase migration repair --status reverted <version>`; their tables
are already in `legacy`.

## Afterwards

- **Staff.** Old `admin` / `superadmin` users are now staff with the same
  role. The back office requires an authenticator app, so enable **TOTP**
  under Authentication → Multi-Factor before they sign in.
- **Marketing consent.** Everyone starts opted out: the old `email_opt_in`
  defaulted to true, which isn't consent. Customers opt in from Settings.
- **Catalog.** Product names and descriptions were copied into both the
  Arabic and the English fields; translate them in the back office. Auction
  lots were imported as drafts.
- **Plans.** IDEA Plus and business plans are not imported (the old billing
  tables don't map to them); create them in the back office.
- **Ledger.** Only balanced "actual" entries were imported; forecasts and
  anything the import skipped stay in `legacy.ledger_entries`.
- **Not imported:** carts, wishlists, reviews, notifications, support tickets,
  payment plans/subscriptions/transactions, fixed assets and financial
  settings. They stay in `legacy`.

Once you're happy with the result, drop the old data:

```sql
drop schema legacy cascade;
```
