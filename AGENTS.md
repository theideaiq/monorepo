# Agent and contributor guide

Conventions for anyone — human or AI agent — changing this repository.

Start every session by reading `PROGRESS.md` (launch checklist, open items
and decisions). How production is operated (releases, migrations, backups,
incidents) is in `docs/platform`.

## Repository map

- `apps/web` — **theideaiq.com**, everything customers see (Next.js, i18n
  routes under `app/[locale]`), with a `proxy.ts` (locale, session refresh,
  security headers) and the cookie session (`@repo/auth/server`):
  - the public pages, organised like the menu (Store · Plus · Club · Pass,
    a bottom tab bar on phones): The IDEA Store is Home (`/`), the
    storefront (search, categories, featured and new products), with
    `/store` the full catalog and product pages (buying, reviews); The IDEA
    Plus is `/plus`, everything about renting (the rental catalog with
    categories, then plans and tiers), public, with "Your Plus" (joining
    and the waitlist at `#join`; membership, plan changes, pause and
    cancel, swaps, the queue and rentals) at `#yours` when signed in; The IDEA
    Club is `/club`, one feed with chips (`?show=events|news|stories|guides`),
    "Yours" at `#yours` (your events with the calendar feed, your
    submissions) and the Telegram rooms card, and `/club/<slug>` is a post
    or an event (with RSVP); `/business` presents The IDEA Business to
    companies; `/saved` (saved products); `/help` (FAQ, the contact form at
    `#contact`, Ask Droid and the member's support tickets at `/help/<id>`
    and `/help/new`); `/careers`; `/about` (the company, preferences, the
    version); `/r/<code>` (an invite or affiliate link: the page asks the
    database `referral_kind(code)` which one it is) and legal pages at
    `/legal/<policy>` (Markdown in `apps/web/content/legal`). The top bar
    holds the logo, search, saved (heart, to `/saved`), cart and, on
    desktop, the Pass avatar (saved and cart are hidden on sign-in and
    checkout); the desktop header reads Store · Plus · Club, "For
    business", saved, cart, Pass. The footer lists Store · Plus · Club ·
    Pass · Business, then About · Careers · Help · Legal. Old addresses
    have no HTTP redirects; links stored in notifications are mapped to
    current pages by `currentAppPath`/`businessPath` in
    `packages/internationalization/app-paths.ts` (used by the website,
    The IDEA Business, Telegram and push);
  - **The IDEA Pass** (`app/[locale]/(pass)`): `/{locale}/sign-in` (an
    email code signs in or creates the Pass; there is no sign-up page, and
    `/onboarding` asks for the name), `/mfa`, `/tg`, `/sign-out`, the only
    sign-in UI on the web. A person's membership *is* The IDEA Pass; never
    show the word "account". The session cookie is shared with The IDEA
    Business and the design site (`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`); other
    apps link here with `passUrl()` from `@repo/auth/pass` (based on
    `NEXT_PUBLIC_WEB_URL`), which only returns to allowlisted hosts
    (`isAllowedReturnTo`);
  - **The IDEA Pass pages** (`app/[locale]/pass`: `/pass` the membership
    card, `/pass/orders` with Sell to us at `#sell`, `/pass/bulbs` with
    invites and affiliates at `#invite`, `/pass/settings`) and the cart and
    checkout (`app/[locale]/(checkout)`): client components that query with
    `useAuth().supabase`; privileged steps go to `apps/api` with the user's
    token (`callApi` in `apps/web/lib/api.ts`);
  - The iOS/Android apps are Capacitor shells whose WebView loads the live
    website (`server.url`), so the same cookie session applies there.
- `apps/business` — **The IDEA Business** (package `business`, port 3000,
  `business.theideaiq.com`), for companies and staff only, server-rendered
  with a `proxy.ts`:
  - the company dashboard at its root (`app/[locale]/(business)`: `/`,
    `/procurement`, `/hiring`, `/invoices`, `/plus`, `/members`,
    `/billing`, `/settings`, `/new`, `/documents/<kind>/<id>`,
    invitations);
  - the staff **back office** under `/{locale}/staff` (`app/[locale]/staff`,
    `components/admin`, `lib/admin`; the company section is
    `/staff/companies`): staff only, with Server Actions; every query runs
    as the staff member so RLS applies, and staff rights need an
    authenticator-app (AAL2) session, enforced by the database too. Its
    links use `@/lib/admin/navigation` (paths relative to `/staff`); its
    code keeps the internal name "admin" (`lib/admin`, `components/admin`,
    the `admin` messages namespace).
  - No sign-in of its own: it sends people to The IDEA Pass on the website
    with `return_to`.
- `apps/api` — webhooks (Wayl, Telegram), cron jobs, the calendar feed and
  privileged endpoints, including `app/admin/*` for the back office and the
  website's contact form and status badge. The only app with secrets.
- `apps/storybook` — **The IDEA Design** (design.theideaiq.com), the
  staff-only design site: Storybook (every `@repo/design-system` component
  and every `@repo/email` template in Arabic and English) built into
  `public/` and served by a small Next.js shell whose `proxy.ts` gate
  (`lib/gate.ts`) lets in only aal2 staff signed in through The IDEA Pass.
- `apps/docs` — the documentation site.
- `packages/commerce` (catalog, prices, cart totals) and `packages/droid`
  (Telegram bot) are The IDEA's own packages; the rest come from the template.
- `packages/*` — shared code, imported as `@repo/<name>`. `@repo` is a fixed
  internal scope; never rename it per project.
- `packages/config/project.json` — the single source of truth for organization,
  project, locales, region and commerce settings. Read it through `@repo/config`.
- `apps/e2e` — Playwright journeys with axe accessibility checks.
- `scripts/` — `check-placeholders.ts`, `check-rtl.ts`, `check-i18n.ts` and
  `check-secrets.ts` are repo checks; `vercel-ignore.mjs` is every Vercel project's ignored
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
bun run check:secrets       # server secrets outside apps/api
bun run check:unused        # unused files and dependencies (Knip)
bun run boundaries          # packages import only what they declare
bun run db:start | db:reset | db:test | db:types
bun run --cwd packages/database db:test:sync   # copy the pgTAP preamble
bun run --cwd apps/e2e e2e  # Playwright journeys + axe (local stack running)
bun run cap:sync            # configure the iOS/Android shell (loads the live website)
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
  the client components of `apps/web` and `apps/business`, query with
  `useAuth().supabase` (the cookie-based browser client) so Row Level
  Security applies; gates like `RequireAuth` are only UX. Their Server
  Components and Server Actions (The IDEA Pass, its pages, the back office)
  use `@repo/auth/server`. In
  `apps/api`, identify callers with `authenticateRequest` (Bearer token) and
  check their membership/role. The admin client (`@repo/database/admin`)
  bypasses RLS and is only for webhooks, cron jobs and other trusted server
  code. `@repo/auth/server` is for server code only (never a client component).
- **Database:** schema changes are migrations with RLS policies and tests;
  see Database standards below.
- **Secrets live only in `apps/api`.** Every other app (web, business,
  storybook, docs, email) holds public values only: no server-only preset in
  its `env.ts` or `.env.example`, no import of a package module that reads
  one (`@repo/email`, `@repo/rate-limit`, `@repo/security/form`,
  `@repo/database/admin`, …). Anything that needs a secret is an `apps/api`
  endpoint: public forms (the website's `POST /contact`) validate with zod,
  run `protectForm` from `@repo/security/form` and the Upstash limit, and
  allow only the website's origin (`webCorsHeaders`); signed-in calls use
  the user's token. `bun run check:secrets` enforces this (apps/e2e, a test
  harness, is exempt). Admin Server Actions running as the staff member with
  the publishable key are fine. Never put secrets in client code, logs or
  commits. New env vars go in the package's `keys.ts` (a secret in its own
  `keys.ts`, not mixed into a preset other apps use) and every affected
  `.env.example`, and in `globalEnv` in `turbo.json` (strict env mode passes
  nothing else to tasks). A client component never imports `env.ts`: pass
  the public value down from a server component instead. CI also fails when
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
- **Native apps:** the iOS/Android apps load the live website
  (`server.url` in `apps/web/capacitor.config.ts`); only the offline screen
  is bundled (`apps/web/native/www`). Native-only client code lives in
  `apps/web/lib/native` and must no-op on the web (`isNativeApp()`); keep
  every `@capacitor/*` package on the same major version.
- **Payments:** in-app (native) checkout is controlled by
  `project.commerce.allowNativeCheckout`. Digital goods must not be sold
  through third-party checkout inside the iOS/Android apps.
- **Brand name:** always "The IDEA", never a bare "IDEA": The IDEA Pass,
  The IDEA Plus, The IDEA Business, The IDEA Design, in English and Arabic copy
  alike (Latin letters in Arabic text). A person's membership is The IDEA Pass.
  Reword rather than writing "your The IDEA …". The one exception is the
  site's own name on Arabic pages (the logo and the page-title suffix),
  which is ايديا (`localizedName` in `project.json`; `projectName(locale)`
  from `@repo/config`); product names stay "The IDEA …".
- **Translations:** every UI string comes from
  `packages/internationalization/messages/{ar,en}.json` (`useTranslations` /
  `getTranslations`), checked by `bun run check:i18n`. Pass numbers and dates
  into messages already formatted with `@repo/internationalization/format`
  (Latin digits, Baghdad time); ICU `#`/`{n, number}` would use Arabic-Indic
  digits. Link with `Link`/`useRouter` from
  `@repo/internationalization/navigation` so URLs keep their language:
  English, the default, has no prefix (`/store`), Arabic is `/ar/store`.
  Build any other path with `localePath(locale, path)` from
  `@repo/internationalization`, never `` `/${locale}…` `` by hand.
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

- **Products and variants.** A product is the work (album, game, book,
  device); its variants are the versions customers choose (format,
  platform, colour, edition), each with its own label, price, SKU, barcode
  and stock. Every product has at least one variant (a default one is made
  on insert); condition (new, open box, used) belongs to each copy in
  `stock_items`, never to a variant. With several variants, the product's
  price, compare-at price and stock are derived ("from" the cheapest live
  variant) and are set on the variants; cart lines, copies and rentals
  always name their variant (a product with one live variant fills it in).
  One title is one product: a title both sold and rented is a `sale`
  product with copies for rent (`rentable`, derived from its copies; The
  IDEA Plus lists rentable products), and the six categories (Music, Games,
  Books, Films, Audio, Tech) are shared by The IDEA Store and The IDEA
  Plus. Prices end in …4,750 or …9,750.
- **RLS on every table.** Enable it in the migration that creates the table
  and add policies with pgTAP tests. `00_structure.test.sql` fails when a
  table in `public` or `private` lacks RLS or a primary key, or any RLS
  table has no policy. A service-only table (reached only by the service
  role or SECURITY DEFINER functions) gets a restrictive "No client access"
  policy (`to anon, authenticated using (false)`), never none.
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
