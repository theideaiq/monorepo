# Backups and restore

What is backed up, where, for how long, and how to bring it back.

| What | When | Kept | Where |
| --- | --- | --- | --- |
| Roles, schema and data of the production database | Nightly at 23:20 UTC (2:20 AM Baghdad) | 30 days | GitHub → Actions → **Back up production database** → the run's artifact |
| Supabase's own backups | Daily, on paid plans only | Per plan | Supabase dashboard → Database → Backups |

Each backup is encrypted (GPG, AES-256) with `BACKUP_PASSPHRASE` before it
leaves the runner. Without the passphrase the file is useless, so keep it in
the password manager as well as in GitHub.

> **Warning.** The workflow fails until `BACKUP_PASSPHRASE` and the
> `SUPABASE_PROJECT_REF` variable are set (see
> [Releases and migrations](releases.md#one-time-setup)). Add
> `BACKUP_HEARTBEAT_URL` too, so a missed night raises an alert.

## Restore

Practice this on a scratch Supabase project first. Restoring over production
replaces live data, including orders and payments: decide it with the
owners and write down when and why.

1. **Download and decrypt** the artifact `theideaiq-backup-YYYY-MM-DD`:

   ```sh
   gpg --decrypt theideaiq-YYYY-MM-DD.tar.gz.gpg > theideaiq.tar.gz
   tar -xzf theideaiq.tar.gz   # roles.sql, schema.sql, data.sql
   ```

2. **Restore into the target database** with its connection string (Project
   Settings → Database):

   ```sh
   psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 \
     -f roles.sql -f schema.sql \
     -c "SET session_replication_role = replica" \
     -f data.sql
   ```

3. **Check.** Point a preview of Staff (`apps/staff`) at the target,
   open a customer, an order, a rental and the ledger, and compare row counts
   with the source.

Files in Storage (product images, editorial uploads, submissions, avatars)
are not in this backup; they stay in Supabase Storage.
