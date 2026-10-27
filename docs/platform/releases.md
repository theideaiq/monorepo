# Releases and migrations

How a change reaches the website (with The IDEA Pass), The IDEA Partners
(the organization dashboard), Staff (with the design site), the API and the
database.

Every change goes through a pull request to `main`. Nothing is edited on
production by hand: not the code, not the database.

1. **Open a pull request.** CI runs the dependency review and `bun audit`,
   lint, package boundaries, types, every unit test with coverage, the
   placeholder, RTL, translation and unused-code checks; builds every app
   and checks that no secret reaches a browser bundle; starts a local database with every migration and runs
   the pgTAP suites (RLS, structure, advisors), the type check and the
   integration tests; and runs the Playwright journeys with axe. CodeQL
   scans the code. Vercel builds a preview of each app.
2. **Merge when CI is green.** Vercel builds and deploys every app.
   A squash merge puts every commit message of the pull request into the
   merge commit, and GitHub skips all workflows on `main` when that message
   contains a skip marker (`skip ci`, `ci skip`, `no ci`, `skip actions` or
   `actions skip` in square brackets). Never write one literally in a
   commit message, not even to describe it; CI fails a pull request whose
   commits contain one. After a squash merge, restart the branch from
   `main`: its old commits would count again in the next pull request.
3. **The database follows.** When CI passes on `main`, the **Migrate
   production database** workflow runs `supabase db push`. It applies only
   migrations production has not seen, in order, and stops at the first
   error.
4. **Check.** The workflow run is green, the Vercel deployments read Ready,
   and `https://<api host>/health` answers.

## One-time setup

In GitHub → Settings:

- **Environments → `production`** (add required reviewers if you want a
  manual approval before each migration), secrets:
  - `SUPABASE_ACCESS_TOKEN`: a personal access token
    (supabase.com/dashboard/account/tokens)
  - `SUPABASE_DB_PASSWORD`: the database password (Project Settings →
    Database)
  - `BACKUP_PASSPHRASE`: a long random passphrase, also kept in the password
    manager
  - `BACKUP_HEARTBEAT_URL` (optional): a BetterStack heartbeat URL
- **Secrets and variables → Actions → Variables:** `SUPABASE_PROJECT_REF`
  (the id in the project's dashboard URL); optionally `TURBO_TEAM` with the
  `TURBO_TOKEN` secret for Vercel Remote Cache.
- **Code security:** switch CodeQL "default setup" off; the `CodeQL`
  workflow replaces it.

## Rules for database changes

- A schema change is a new file in `packages/database/supabase/migrations`.
  Never edit a migration that has reached production; add a new one.
- Follow the database standards in `AGENTS.md`: RLS and pgTAP tests for every
  table, advisors at zero, SECURITY DEFINER bodies in `private`.
- Regenerate the types (`bun run db:types`) and commit them; CI checks they
  match.
- Never paste SQL into the production database. If a migration fails, fix it
  with a new migration and merge again.

## If a release breaks something

1. **Roll back the app** in Vercel: open the project, pick the last good
   production deployment, and promote it. This takes seconds and touches no
   data.
2. **Fix forward** with a pull request. A database change is never rolled
   back by hand; a new migration undoes it.
3. If data was lost, see [Backups and restore](backups.md).
