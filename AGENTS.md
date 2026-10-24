# Agent and contributor guide

Conventions for anyone — human or AI agent — changing this repository.

Start every session by reading `PROGRESS.md` (launch checklist, open items
and decisions). How production is operated (releases, migrations, backups,
incidents) is in `docs/platform`.

## Repository map

- `apps/web` — The IDEA's public website (Next.js, i18n routes under
  `app/[locale]`): store catalog, Plus, Academy, Suite, Club, news, events,
  journal, legal pages (Markdown in `apps/web/content/legal`).
- `apps/app` — the product, client-first: the same code runs in the browser
  and, as a static export (`bun run build:native`), inside the Capacitor
  iOS/Android apps. No Server Actions, Route Handlers, `cookies()`, proxy or
  request-time server rendering here; anything that needs a secret goes in
  `apps/api`, called with the user's token (`callApi` in `apps/app/lib/api.ts`).
- `apps/api` — webhooks (Wayl, Telegram), cron jobs, the calendar feed and
  privileged endpoints, including `app/admin/*` for the back office.
- `apps/admin` — the staff back office. Server-rendered with the staff
  member's cookie session (`@repo/auth/server`) and Server Actions; every
  query runs as the staff member so RLS applies. Staff rights need an
  authenticator-app (AAL2) session, enforced by the database too.
- `apps/email`, `apps/docs`, `apps/storybook` — templates, docs, UI workbench.
- `packages/commerce` (catalog, prices, cart totals) and `packages/droid`
  (Telegram bot) are The IDEA's own packages; the rest come from the template.
- `packages/*` — shared code, imported as `@repo/<name>`. `@repo` is a fixed
  internal scope; never rename it per project.
- `packages/config/project.json` — the single source of truth for organization,
  project, locales, region and commerce settings. Read it through `@repo/config`.
- `apps/e2e` — Playwright journeys with axe accessibility checks.
- `scripts/` — `check-placeholders.ts`, `check-rtl.ts` and `check-i18n.ts`
  are repo checks; `vercel-ignore.mjs` is every Vercel project's ignored
  build step.
- `ARCHITECTURE_AND_INTEGRATIONS.md` — how the pieces fit together and how to
  set up each integration (Supabase, Capacitor, tracking, Wayl, Vercel).

## Commands

```sh
bun install
bun run dev                 # all apps
bun run check | fix         # Biome (Ultracite rules)
bun run typecheck           # every workspace
bun run test                # Vitest in every workspace (cached per package)
bun run test:coverage       # every workspace in one Vitest run, with coverage
bun run check:placeholders  # no unfilled template tokens
bun run check:rtl           # physical Tailwind utilities (--fix rewrites them)
bun run check:i18n          # UI text that isn't in the messages files
bun run check:unused        # unused files and dependencies (Knip)
bun run boundaries          # packages import only what they declare
bun run db:start | db:reset | db:test | db:types
bun run --cwd packages/database db:test:sync   # copy the pgTAP preamble
bun run --cwd apps/e2e e2e  # Playwright journeys + axe (local stack running)
bun run build:native        # static export of apps/app for Capacitor
bun run cap:sync            # build:native + copy into the iOS/Android projects
bun run gen:package         # scaffold packages/<name>
```

Run `check`, `typecheck` and `test` before every commit, and `db:test` for
any schema change. CI (`.github/workflows/ci.yml`) also runs `bun audit`,
the boundaries and unused-code checks, every build, a scan of the client
bundles for secret names, the pgTAP suites, integration tests against a
local stack (`SUPABASE_INTEGRATION=1`) and the end-to-end journeys.

## Rules

- **Package manager:** Bun with the hoisted linker (`bunfig.toml`). Declare every
  dependency a package imports; keep versions aligned across workspaces. Bun
  installs and runs scripts; Next.js runs on Node (`next build`, not
  `bun --bun next build`).
- **Auth:** never authorize with `user_metadata` — users can edit it. In
  `apps/app`, query with `useAuth().supabase` (the browser or native client) so
  Row Level Security applies; gates like `RequireAuth` are only UX. In
  `apps/api`, identify callers with `authenticateRequest` (Bearer token) and
  check their membership/role. The admin client (`@repo/database/admin`)
  bypasses RLS and is only for webhooks, cron jobs and other trusted server
  code. `@repo/auth/server` is for server-rendered apps only.
- **Database:** schema changes are migrations with RLS policies and tests;
  see Database standards below.
- **Secrets:** never in client code, logs or commits. New env vars go in the
  package's `keys.ts` and every affected `.env.example`, and in `globalEnv`
  in `turbo.json` (strict env mode passes nothing else to tasks). A client
  component never imports `env.ts` or a `keys.ts` with server variables:
  pass the public value down from a server component instead. CI fails when
  a server variable name reaches a client bundle.
- **Migrations ship through CI.** After merge, `.github/workflows/migrate.yml`
  runs `supabase db push` against production once CI passes on `main`.
  Never paste SQL into the production database.
- **Commit messages** never contain a workflow skip marker (the bracketed
  `skip ci` family), not even to describe one: a squash merge would carry
  it into `main` and skip CI, the migration and the deployments.
- **Files:** use `@repo/storage`. Organization files live under
  `<organization id>/` and avatars under `<user id>/`; the bucket policies
  depend on that layout.
- **Analytics:** record events with `track()` from `@repo/analytics/client` — one
  event catalogue mapped to GA4, Meta and TikTok — instead of calling `gtag`,
  `fbq` or `ttq` directly. Server-confirmed purchases go through
  `@repo/analytics/conversions` with the same event id. Ad pixels never load
  inside the Capacitor apps.
- **Payments:** in-app (native) checkout is controlled by
  `project.commerce.allowNativeCheckout`. Digital goods must not be sold
  through third-party checkout inside the iOS/Android apps.
- **Translations:** every UI string comes from
  `packages/internationalization/messages/{ar,en}.json` (`useTranslations` /
  `getTranslations`), checked by `bun run check:i18n`. Pass numbers and dates
  into messages already formatted with `@repo/internationalization/format`
  (Latin digits, Baghdad time); ICU `#`/`{n, number}` would use Arabic-Indic
  digits. Link with `Link`/`useRouter` from
  `@repo/internationalization/navigation` so URLs keep their `/ar` or `/en`.
- **Localization:** UI must work in Arabic (RTL) and English (LTR). Use logical
  Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`), never physical
  ones (`ml-*`, `pr-*`, `left-*`, `text-left`); `bun run check:rtl` enforces
  this. Icons that point along the reading direction (arrows, chevrons) get
  `rtl:rotate-180`. Dates default to `Asia/Baghdad`.
- **Template:** this project was created from `shaheenfarjo/monorepo`; the
  template's optional modules that The IDEA doesn't use (CMS, collaboration,
  feature flags, in-app notifications service, outbound webhooks) were
  removed, and `bun run check:placeholders` fails on any leftover template
  token. Port useful template fixes by hand.
- **shadcn/ui:** files in `packages/design-system/components/ui` are generated;
  update them with the shadcn CLI rather than hand-editing where possible.

## Database standards

Rules for `packages/database`. Run `bun run --cwd packages/database db:test`
for any schema change; it also runs the structure and advisor checks.

- **RLS on every table.** Enable it in the migration that creates the table
  and add policies with pgTAP tests. `00_structure.test.sql` fails when a
  table in `public` or `private` lacks RLS or a primary key, or a
  `public` table has no policy (only `webhook_events` is service-only).
- **Supabase advisors at zero.** `00_advisors.test.sql` expresses the
  advisor lints as pgTAP: every foreign key has an index, at most one
  permissive policy per table, role and action (merge with OR; split
  `for all` policies that overlap a read policy), `(select auth.uid())`
  rather than a bare call in policies, a fixed `search_path` on every
  function, `security_invoker` views, no `user_metadata` in policies, no
  extensions or materialized views in `public`, no duplicate indexes.
  Never edit an applied migration; fix findings in a new one.
- **SECURITY DEFINER bodies live in `private`.** An RPC the apps call is a
  SECURITY DEFINER function in `private` that checks the caller itself
  (`private.has_staff_role`, `private.has_org_role`, …); the name in
  `public` is a SECURITY INVOKER `language sql` wrapper with the same
  signature and defaults, granted to the same roles (migration
  `20261110000000_hardening.sql`). Service-only definer functions may stay
  in `public` if neither `anon` nor `authenticated` can execute them.
- **Shared test preamble.** Test helpers (`pg_temp.login_as(user, aal,
  extra)`, `login_anon()`, `reset_role()`) live in
  `supabase/test-helpers/preamble.sql` and are copied between the
  `-- <preamble>` and `-- </preamble>` markers of every test file by
  `bun run --cwd packages/database db:test:sync`; `db:test` fails when a
  copy is stale. Test files run alphabetically: `00_` checks, then numbered
  suites (their fixtures truncate tables inside a rolled-back transaction).

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
