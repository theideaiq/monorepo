# Architecture and integrations guide

This guide is for the people who set up, run and hand over a project built on
this monorepo: consultants, tech leads and the developers who maintain it. It
explains how the pieces fit together and walks through each integration step
by step.

| Section | You need it when you… |
| --- | --- |
| [Architecture at a glance](#architecture-at-a-glance) | join the project or review a change |
| [1. Create a project from the template](#1-create-a-project-from-the-template) | start a new client or product |
| [2. Supabase migrations and Row Level Security](#2-supabase-migrations-and-row-level-security) | change the database or its access rules |
| [3. Build, sync and release the iOS and Android apps](#3-build-sync-and-release-the-ios-and-android-apps) | ship the mobile apps |
| [4. Marketing tracking and Wayl payments](#4-marketing-tracking-and-wayl-payments) | set up ads attribution, newsletters or take real payments |
| [5. Vercel environment variables](#5-vercel-environment-variables) | deploy the web apps |

`AGENTS.md` holds the short list of coding rules; this document is the long
form.

---

## Architecture at a glance

```mermaid
flowchart LR
  subgraph Clients
    W["apps/web<br/>marketing site"]
    A["apps/app: The IDEA Spark<br/>app · The IDEA Pass · back office"]
    N["iOS / Android shell<br/>(WebView loads Spark)"]
  end
  subgraph Server["Vercel"]
    API["apps/api<br/>checkout · webhooks · cron"]
  end
  subgraph Supabase
    AUTH["Auth (email code)"]
    DB[("Postgres + RLS")]
    ST["Storage"]
  end
  WAYL["Wayl<br/>hosted checkout"]
  ADS["GA4 · Meta · TikTok"]

  N -- "server.url" --> A
  A -- "supabase-js / @supabase/ssr, user's JWT" --> AUTH & DB & ST
  A -- "Bearer token" --> API
  API -- "secret key (bypasses RLS)" --> DB
  API -- "payment links" --> WAYL
  WAYL -- "signed webhook" --> API
  W & A -- "pixels" --> ADS
  API -- "Conversions API / Events API" --> ADS
```

### The apps

| App | Port | What it is | How it is deployed |
| --- | --- | --- | --- |
| `apps/web` | 3001 | The IDEA's public site: home, Megastore catalog and product pages, The IDEA Plus, Academy, Suite, Club, Droid, news, events, journal, legal (Markdown in `apps/web/content/legal`), contact. Next.js Server Components with `next-intl` locale routing (`/ar/…`, `/en/…`) and ISR; reads public data with an anonymous Supabase client. | Vercel |
| `apps/app` | 3000 | **The IDEA Spark** (`spark.theideaiq.com`): the customer app, **The IDEA Pass** (sign-in, sign-up, authenticator app, "Your Pass") and the **back office** under `/{locale}/admin`, in one server-rendered Next.js app (see [The IDEA Spark](#the-idea-spark)). Its `proxy.ts` adds the locale, refreshes the cookie session and sets the security headers. | Vercel; the iOS/Android apps load it in a WebView (section 3) |
| `apps/api` | 3002 | Everything that needs a secret: Wayl checkout and webhooks, cron jobs, account and organization deletion, push notifications, the back office's privileged steps (`app/admin/*`), the website's contact form and status badge. Route handlers only. | Vercel |
| `apps/docs` | 3004 | Mintlify documentation site. | Mintlify |
| `apps/storybook` | 6006 | **The IDEA Design**: the staff-only design site with every UI component and email template (see [The IDEA Design](#the-idea-design)). | Vercel (`design.theideaiq.com`) |

### The IDEA Design

`apps/storybook` is the one place to review UI and email. `bun run dev`
there is plain Storybook on port 6006 (no gate). `bun run build` runs
`storybook build -o public` and then `next build`: the Next.js shell has
no pages of its own and serves the static build, with `proxy.ts` in front
of every path (the manager, the iframe and every asset):

1. It reads the Supabase session cookie that The IDEA Pass writes
   (`sb-<project ref>-auth-token`, whole or chunked, `base64-` or plain),
   shared across subdomains when `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` is set.
2. No cookie, an expired token or one Supabase rejects (`getClaims`, with
   the publishable key): redirect to
   `${NEXT_PUBLIC_APP_URL}/{locale}/sign-in?return_to=<this URL>` (The IDEA
   Pass, in The IDEA Spark). The gate never refreshes a session (that would
   spend the browser's refresh token); Spark refreshes it and sends the
   visitor back.
3. It reads the visitor's own `staff` row as that user (RLS lets everyone
   read their own row). No row: a plain bilingual 403 page. A row but an
   `aal1` token: redirect to Pass `/{locale}/mfa`, since staff rights need an
   authenticator app. Tokens issued to third-party apps (`client_id`) are
   refused.

The locale comes from `NEXT_LOCALE`, then `Accept-Language`, then Arabic.
Responses are `Cache-Control: private, no-store` and `noindex`. Environment:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (unset =
503, fail closed) and `NEXT_PUBLIC_APP_URL` (defaults to
`http://localhost:3000` in development, `https://spark.theideaiq.com`
otherwise). Other apps link to it with
`NEXT_PUBLIC_DESIGN_URL` (`@repo/next-config/keys`). Emails are reviewed
under **The IDEA Design → Emails**, rendered with `@react-email/components`
exactly as Resend sends them; add a story there with every new template.

### The IDEA Spark

`apps/app` (port 3000, `spark.theideaiq.com`) is one server-rendered Next.js
app with three areas. Messages come from the `app`, `pass` and `admin`
namespaces; the customer area and the Pass load analytics, the back office
none.

| Area | Routes | Code |
| --- | --- | --- |
| Customer app | `/{locale}`, `/store`, `/store/<slug>`, `/cart`, `/checkout`, `/orders`, `/orders/<id>`, `/plus`, `/events`, `/support`, `/support/<id>`, `/business/…`, `/settings`, … | `app/[locale]/(customer)/(app)`, `components/screens` (client components with TanStack Query) |
| The IDEA Pass | `/{locale}/sign-in`, `/sign-up`, `/mfa`, `/sign-out`, `/pass` | `app/[locale]/(customer)/(pass)`, `components/pass`, `lib/pass` |
| Back office | `/{locale}/admin/…` (catalog, orders, rentals, customers and CRM, marketing, finance, editorial, reviews, support, Telegram, staff, audit log) | `app/[locale]/admin`, `components/admin`, `lib/admin` |

- **Session.** The browser client (`@repo/auth/client`) and the server
  client (`@repo/auth/server`) share the `@supabase/ssr` cookie;
  `proxy.ts` refreshes it on every request (`refreshSession`), so Server
  Components and Server Actions read a valid token. Every query runs as
  the signed-in user with the publishable key, so RLS applies. The
  iOS/Android shell loads the same pages, so the same cookie applies there.
- **Detail pages** are dynamic routes. Links from the static-export days
  (`/store/product?slug=…`, `/orders/view?id=…`, `/support/view?id=…`,
  also in stored notifications) redirect (`next.config.ts`) or are mapped
  (`currentAppPath`) to them.
- **Locale.** `proxy.ts` (next-intl) adds `/ar` or `/en` to every path
  (cookie, then `Accept-Language`, then Arabic); `<html lang dir>` are set on
  the server. Link with `Link`/`useRouter` from
  `@repo/internationalization/navigation`. `/.well-known` (app links) is
  left alone.
- **Indexing.** The Pass and the back office send `noindex` (metadata and
  `X-Robots-Tag`) and are disallowed in `robots.txt`.

### The IDEA Pass

The Pass is the only sign-in and sign-up UI on the web, for customers and
staff alike, and the name of a user's account. Its pages are part of The IDEA
Spark (ar/en, RTL) and hold no secrets: they sign people in with the
publishable key and leave the session in the shared cookie.

- **Routes.** `/{locale}/sign-in?return_to=…`, `/{locale}/sign-up?return_to=…`
  (a 6-digit code by email, `@repo/auth/components/email-otp-form`),
  `/{locale}/mfa?return_to=…` (link or enter the authenticator app, which
  raises the session to AAL2), `/{locale}/sign-out?return_to=…` and
  `/{locale}/pass` ("Your Pass": name, email, the phone number of accounts
  from the phone sign-in days, authenticator status, links to The IDEA
  Spark, the back office for staff and the website, sign-out). Other apps link to them with
  `passUrl(path, returnTo, locale)` from `@repo/auth/pass`, which builds
  URLs on `NEXT_PUBLIC_APP_URL` (`"/"` is "Your Pass").
- **Sign-in method: an email code** (decision 2026-10-24; no SMS plan). No
  passwords and no magic links: links open outside the iOS/Android shell,
  so the session would land in the wrong browser. `EmailOtpForm` asks for
  the email (and the name on sign-up), calls
  `signInWithOtp({ email, options: { shouldCreateUser, data: { full_name, locale } } })`,
  then takes the 6-digit code and calls
  `verifyOtp({ email, token, type: "email" })` (`sendEmailOtp` and
  `verifyEmailOtp` in `@repo/auth/otp`). Sign-up passes
  `shouldCreateUser: true`; Supabase then sends its **Confirm signup**
  email, and the code both confirms the address and signs in. Sign-in
  passes `shouldCreateUser: false`, so an unknown address never creates an
  account: the form says there is no account with this email and links to
  sign-up (keeping `return_to`). Existing accounts get the **Magic Link**
  email, whose template shows only the code. Codes have 6 digits and last
  10 minutes; the form allows a resend after 60 s and changing the
  address, and translates the errors (invalid email, wrong code, expired
  code, too many attempts, no account). The templates are in
  `packages/database/supabase/templates/` (one email in Arabic and English,
  branded The IDEA Pass, the code in large type); production uses the same
  files (2.7).
- **Staff** sign in the same way; the back office and the database still
  require the authenticator-app step (AAL2) afterwards.
- **Phone sign-in is switched off, not removed.** The phone provider is
  disabled (`[auth.sms]` in `config.toml`, and in production). The phone
  helpers stay: `@repo/auth/phone` (normalizing and formatting Iraqi
  numbers, used for delivery addresses, invitations and the staff lookup),
  `sendPhoneOtp`/`verifyPhoneOtp` in `@repo/auth/otp` and the Send SMS hook
  (`functions/send-sms`). To bring phone sign-in back: enable the provider
  (or the hook) and a phone form next to `EmailOtpForm` (the earlier
  `PhoneOtpForm` is in git history, `packages/auth/components/phone-otp-form.tsx`).
- **Shared session cookie.** `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.theideaiq.com`
  makes the browser client, the server client and the proxy session refresh
  (`authCookieOptions()` in `packages/auth/cookies.ts`) write the
  `@supabase/ssr` cookie (`sb-<project ref>-auth-token`, chunked `.0`, `.1`,
  possibly `base64-` prefixed) for the whole domain, so `theideaiq.com`,
  `spark.` and `design.` read the same session. Set the same value on web,
  app and storybook; leave it unset locally and on previews (host-only
  cookie; on localhost cookies are shared across ports anyway).
- **return_to.** A path inside Spark (`/en/cart`) is kept as is. An absolute
  URL must be http(s) on the host of `NEXT_PUBLIC_WEB_URL`, `_APP_URL`,
  `_DESIGN_URL` or `_API_URL` (plus localhost in development,
  `isAllowedReturnTo`); anything else falls back to Spark (`safeReturnTo`).
  The older `?next=/cart` still works. Without a destination, sign-in goes
  to Spark's home and the authenticator step to "Your Pass". After signing
  in the browser does a full navigation, so the next page reads the cookie.
- **Sign-out.** The buttons ("Your Pass", the authenticator step, the
  back office) remove this device's push registration and then call a
  Server Action. The `/sign-out` route signs out only on navigations from
  The IDEA's own sites (`Sec-Fetch-Site: same-site` or `same-origin`); a
  link from anywhere else lands on "Your Pass" instead.
- **Customer area.** `RequireAuth` sends signed-out visitors to
  `/{locale}/sign-in?return_to=<the page>`; the website's "Sign in" links
  there too (`passUrl`).
- **Later: OAuth consent.** Signing in to third-party apps with The IDEA
  Pass can use Supabase Auth's OAuth 2.1 server (Authentication → OAuth
  Server): Supabase sends people to an authorization page (for example
  `/{locale}/oauth/consent?authorization_id=…`), which shows the client and
  scopes and calls `supabase.auth.oauth.approveAuthorization` or
  `denyAuthorization`. Add it under `apps/app/app/[locale]/(customer)/(pass)`;
  the sign-in redirect with return_to already brings people back to it.

### The back office

`/{locale}/admin` in The IDEA Spark, for staff: catalog, orders, rentals,
customers and CRM, finance (ledger, scenarios, payments and financial
settings), editorial, reviews, support, Telegram, staff and the audit log.
Newsletters are not sent from here but from Resend Broadcasts (4.3); the
payroll plan, cap table, fixed assets and the own email campaigns were
retired on 2026-10-24 and their data kept in the `archive` schema.

- **Gate** (`lib/admin/session.ts`, in the console layout and again in
  every page and Server Action): signed out → `/{locale}/sign-in?return_to=/{locale}/admin`;
  staff on AAL1 → `/{locale}/mfa?return_to=/{locale}/admin`; signed in
  without a `staff` row → `/{locale}/admin/no-access`. Each section checks
  the role's access (`lib/admin/roles.ts`); the database grants staff rights
  only to AAL2 sessions (enable **Authentication → Multi-Factor → TOTP**;
  it is on in the local stack).
- **Server Actions** (`staffAction` in `lib/admin/action.ts`) re-check the
  session and role, validate with zod and run as the staff member, so RLS
  applies. Privileged steps (staff lookup) call
  `apps/api/app/admin/*` with the staff member's token (`lib/admin/api.ts`).
  No secret lives in Spark (`bun run check:secrets`).
- **Links** use `@/lib/admin/navigation`, whose `Link`, `redirect`,
  `useRouter` and `usePathname` take paths relative to `/admin`.
- Grant the first superadmin with SQL, finding the account by its email
  (`insert into staff (user_id, role) select id, 'superadmin' from auth.users where email = '…'`).

### Principles that shape the code

1. **Row Level Security is the security boundary.** The product app queries
   Postgres with the signed-in user's token, so the database decides what each
   user can read and write. Client-side checks such as `RequireAuth` or
   `canManage` only decide what to *show*.
2. **Secrets live in `apps/api` and Supabase, never in `apps/app`.** Anything
   the iOS/Android bundle contains can be extracted, so `apps/app` only has
   `NEXT_PUBLIC_*` variables. When it needs a privileged action, it calls
   `apps/api` with `callApi()` (`apps/app/lib/api.ts`), which sends the user's
   access token as `Authorization: Bearer …` and the client platform as
   `x-client-platform`. The API verifies the token (`authenticateRequest`),
   checks the caller's role in the organization (`apps/api/lib/membership.ts`)
   and only then uses the admin client.
3. **One source of truth for project settings.** `packages/config/project.json`
   holds the organization and project names, URL, bundle id, locales, region
   (Iraq, `Asia/Baghdad`, IQD, Latin digits, Saturday week start) and the
   commerce mode. Read it through `@repo/config`.
4. **Arabic first, English second.** Every UI string comes from
   `packages/internationalization/messages/{ar,en}.json`. Layouts use logical
   Tailwind utilities so they mirror in RTL. `bun run check:i18n` and
   `bun run check:rtl` enforce both rules in CI.
5. **Secrets live only in `apps/api`.** The other apps hold public values
   only (the back office works with the staff member's session and the
   publishable key); the website's contact form and status badge call the API.
   `bun run check:secrets` fails on a server-only variable or a
   secret-reading package module anywhere else, client components never
   import `env.ts`, and CI scans every client bundle for server variable
   names.

### How a request flows

| Flow | Path |
| --- | --- |
| Sign in | The IDEA Pass in Spark: email → `supabase.auth.signInWithOtp` → email with a 6-digit code (Resend SMTP) → code → `verifyOtp` (`type: "email"`) → session in the shared cookie (the browser's, or the WebView's in the apps). |
| Read or write data | Screen → TanStack Query hook (`apps/app/lib/queries.ts`) → `supabase.from(…)` with the user's JWT → RLS policies. |
| Create an organization | Onboarding form → `rpc("create_organization")`, which inserts the organization and the caller's `owner` membership in one transaction. |
| Privileged action | Screen → `callApi(supabase, "/checkout", …)` → `apps/api` verifies the token and role → admin client or third-party API. |
| Payment | `/checkout` → Wayl payment link → customer pays on Wayl → signed webhook → `/webhooks/payments` → payment and subscription updated → purchase reported to analytics. |

### Locale routing in the product app

See [The IDEA Spark](#the-idea-spark): the proxy adds the locale, and
`app/[locale]/layout.tsx` is the root layout (server-rendered `lang` and
`dir`). Unknown paths render the localized 404 (`[...rest]`). Inside
`apps/app`, link with `Link` and `useRouter` from
`@repo/internationalization/navigation` so URLs keep their language prefix.

---

## 1. The project and its organizations

> This repository was created from the template on 2026-10-23 with
> `--commerce physical --keep-modules rate-limit,ai`. The section below is
> kept as a short record; there is nothing to run here.

> **Two kinds of "organization".** The *template organization* is the client
> or company the codebase is created for. It is set once by `bun run init`.
> *Tenant organizations* are the workspaces end users create inside the
> product (teams, companies, clinics…). They are rows in the `organizations`
> table and are covered at the end of this section.

The generator (`bun run init`), its options and the optional-module markers
live in the template repository, `shaheenfarjo/monorepo`. They were removed
here once the project existed: `scripts/init.ts`, `scripts/template/` and the
unused modules (CMS, collaboration, notifications service, outbound webhooks,
feature flags) are gone, and `bun run check:placeholders` fails on any
template token left behind.

### 1.5 Tenant organizations in the product

New users go through a two-step onboarding (`/[locale]/onboarding`):

1. **Profile:** name and preferred language (`profiles.full_name`,
   `profiles.locale`). The language choice also switches the UI.
2. **Organization:** name and an address slug (lowercase Latin letters,
   digits and hyphens, 2–64 characters). Arabic names have no Latin letters
   to derive a slug from, so the form suggests `org-<random>`, which the user
   can edit. Submitting calls the `create_organization` RPC,
   which creates the organization and makes the caller its `owner` in one
   transaction. A taken slug shows "already in use" (Postgres error `23505`).

If someone has invited the user's email (or phone number), onboarding lists the
pending invitations first (`pending_invitations()` RPC). Accepting one joins
that organization instead (`accept_invitation`). Invitation links
(`/[locale]/invite?token=…`) work too.

Later, users create more organizations from the sidebar's organization switcher
(`/[locale]/organizations/new`). The active organization is remembered per
device (`apps/app/lib/active-organization.ts`); it is a UI preference, not a
permission. Roles are `owner`, `admin` and `member`:

| Action | owner | admin | member |
| --- | :-: | :-: | :-: |
| See the organization, its members and projects | ✓ | ✓ | ✓ |
| Create and rename projects | ✓ | ✓ | ✓ |
| Rename the organization, invite and remove members, change roles | ✓ | ✓ | |
| See payments, start a checkout, open the webhook portal | ✓ | ✓ | |
| Delete the organization | ✓ | | |

An organization always keeps at least one owner (a trigger enforces it).

### 1.6 Account deletion

Apple (guideline 5.1.1(v)) and Google Play require apps that let users create
accounts to let them delete those accounts in the app. Users find it under
**Settings → Delete account**, and on the onboarding screen for people who
haven't joined an organization yet.

**Organization ownership.** A user may be the only owner of an organization.
Deleting their account would leave it without an owner, so they must resolve
it first. When the dialog opens, it calls `account_deletion_blockers()`, which
lists each organization the user alone owns and how many other members it
has. For each one, the user either:

- **makes another member an owner** (offered when the organization has other
  members; RLS only lets owners grant the owner role), or
- **deletes the organization**, after typing its address. This calls
  `POST /organizations/delete` in `apps/api`. The delete runs as the user, so
  the owners-only policy applies. Projects, memberships, invitations and the
  subscription go with it, payment records are kept with the organization
  cleared, and the `org-files/<organization id>/` folder is removed.

Once no blockers remain, the user types a confirmation phrase ("delete my
account" or «احذف حسابي»). `POST /account/delete` then:

1. checks `account_deletion_blockers()` again, and answers `409` with the
   list if a new one appeared, which takes the dialog back to that step;
2. removes the user's `avatars/<user id>/` folder (storage objects have no
   foreign key to users);
3. deletes the auth user with the admin API. That cascades to the profile
   and memberships and clears `created_by`, `invited_by` and
   `payments.user_id`.

The database is the final guard: `private.protect_last_owner` refuses to
remove the last owner's membership, so even a request that skips the checks
cannot orphan an organization. The app then clears the local session,
analytics identity and stored organization, and the sign-in page confirms the
deletion. The pgTAP suite (`10_rls.test.sql`) and `apps/api/__tests__/deletion.test.ts`
cover these rules.

---

## 2. Supabase migrations and Row Level Security

### 2.1 Where things live

```
packages/database/
  supabase/
    config.toml            local stack settings (auth, email codes, redirect URLs)
    templates/             Auth emails with the code (Arabic and English; paste into production)
    migrations/            ordered SQL migrations: the schema's history
    tests/database/        pgTAP tests (RLS and RPC behaviour)
    seed.sql               local seed data (plans)
    functions/send-sms/    Send SMS auth hook (Edge Function; phone sign-in is off)
  types.ts                 generated TypeScript types (do not edit)
  admin.ts                 service-role client; bypasses RLS (server only)
```

Current schema:

| Migration | Contents |
| --- | --- |
| `…_tenancy.sql` | `profiles`, `organizations`, `memberships`, `invitations`, `projects`; RLS helpers in the `private` schema; `create_organization` and `accept_invitation` RPCs; last-owner protection |
| `…_billing.sql` | `plans`, `subscriptions`, `payments`, `webhook_events` (idempotency) |
| `…_storage.sql` | `org-files` (private) and `avatars` (public) buckets with path-based policies |
| `…_pending_invitations.sql` | `pending_invitations()` RPC for onboarding |
| `…_account_deletion.sql` | `account_deletion_blockers()`: organizations the caller alone owns (see 1.6) |
| `…_staff.sql` | `staff` roles (superadmin, admin, editor, finance, marketing, support) and the `private.has_staff_role` / `is_staff` helpers; `audit_logs` written by `private.audit_change` triggers; `set_staff_role` (superadmins only, last superadmin protected); customer suspension (`profiles.banned_at`); the private calendar token |
| `…_commerce.sql` | Megastore catalog (`product_categories`, `products`, `product_variants`), `cart_items`, `store_settings` (delivery fee), `orders` + `order_items`; `create_order()` prices the cart from the catalog, `complete_order_payment()` (server only) marks it paid and takes stock; staff can only move orders forward. Billing extended to individual subscribers (`subscriptions.user_id`) and order payments (`payments.order_id`); plans get an `audience` (`plus` / `business`) and `rental_slots` |
| `…_plus.sql` | The IDEA Plus `rentals`: `request_rental()` within the member's slots, `cancel_rental()`, `my_rental_allowance()`, `mark_overdue_rentals()` (daily cron); a trigger keeps stock and dates consistent |
| `…_editorial.sql` | `posts`, `events` + `event_rsvps` (capacity, closed after start), `journal_issues`, `submissions` + staff-only `submission_reviews`; `review_queue()` hides authors until a decision (blind review) |
| `…_back_office.sql` | `crm_contacts`, `marketing_segments`, `marketing_campaigns` (opted-in customers only: `profiles.marketing_opt_in`), double-entry ledger (`chart_of_accounts`, `ledger_entries`, `ledger_lines`, `post_journal_entry()`, `ledger_monthly_summary()`), `staff_plan`, `equity_rounds`, `equity_holders` |
| `…_content_storage.sql` | `catalog` and `editorial` (public) and `submissions` (private, `<author id>/…`) buckets |
| `…_droid.sql` | Telegram bot tables: `telegram_chats`, `telegram_members`, `telegram_requests`, `telegram_faq` |
| `…_staff_mfa.sql` | Staff rights require an authenticator-app session (`aal2` claim) in every policy |
| `…_retire_back_office_extras.sql` | Moves the retired `marketing_segments`, `marketing_campaigns`, `staff_plan`, `equity_rounds`, `equity_holders` and `fixed_assets` (and their enums) to the `archive` schema, which no client role can reach, and drops `fixed_asset_schedule()`; adds the newsletter sync bookkeeping (`private.newsletter_contacts`, the service-only `newsletter_audience()` and `mark_newsletter_synced()`, see 4.3) |

### 2.2 Run the database locally

```sh
bun run db:start     # starts Postgres, Auth, Storage, Studio in Docker; applies migrations + seed
bun run db:reset     # drops the local database and re-applies migrations + seed
bun run db:test      # runs the pgTAP tests
bun run db:types     # regenerates packages/database/types.ts
bun run db:stop
```

`bunx supabase status` (from `packages/database`) prints the local URLs and
keys. Put `API_URL` and `PUBLISHABLE_KEY` into `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `SECRET_KEY` into
`SUPABASE_SECRET_KEY` (API only). The publishable key starts with
`sb_publishable_`; the older JWT "anon" key is rejected by env validation.

Local sign-in emails its codes to Mailpit, the stack's mail catcher
(`[local_smtp]`, `MAILPIT_URL` in `supabase status -o env`, by default
<http://127.0.0.1:54324>): open it to read the code. The e2e journeys and
the auth integration tests read the codes through Mailpit's API, so start
the stack with it (CI does: `supabase start -x …` without `mailpit`).

### 2.3 Change the schema

1. **Create a migration file.**

   ```sh
   bun run --cwd packages/database migration:new add_bookings
   ```

   This creates `supabase/migrations/<timestamp>_add_bookings.sql`. You can
   also make the change in local Studio (http://localhost:54323) and run
   `bun run --cwd packages/database db:diff -f add_bookings` to generate the
   SQL. Always read and clean up the generated file.

2. **Write the SQL** following the checklist below.
3. **Apply it locally:** `bun run db:reset`.
4. **Regenerate types:** `bun run db:types`. CI fails if `types.ts` is out of
   date.
5. **Write tests** in `supabase/tests/database/` and run `bun run db:test`.
6. **Lint:** `bun run --cwd packages/database db:lint`.
7. Commit the migration, the tests and `types.ts` together.

Never edit a migration that has been applied to a shared database. Fix
forward with a new migration.

#### Checklist for a new table

- [ ] `alter table … enable row level security;` in the same migration that
      creates the table. A table without RLS is readable by anyone holding the
      publishable key.
- [ ] One policy per operation (`select`, `insert`, `update`, `delete`) that
      needs one. Name it in plain English.
- [ ] Use the helpers instead of re-implementing membership checks:
      `private.is_org_member(org_id)`,
      `private.has_org_role(org_id, array['owner','admin']::public.org_role[])`
      and `private.shares_org_with(user_id)`.
- [ ] Write `(select auth.uid())`, not `auth.uid()`, so Postgres evaluates it
      once per query instead of once per row.
- [ ] Never authorize with `auth.jwt() -> 'user_metadata'`: users can edit it.
- [ ] `revoke all` from `anon, authenticated`, then grant only what the app
      needs, column by column for `insert` and `update`. Column grants stop a
      user from setting `created_by`, `organization_id` or `role` to something
      they shouldn't.
- [ ] Index foreign keys and every column a policy filters on.
- [ ] `security definer` functions go in the `private` schema (or are
      explicitly granted), with `set search_path = ''` and fully qualified
      names.
- [ ] Add `set_updated_at` triggers for tables with `updated_at`.

Example: organization-scoped bookings that members can read and create, and
only owners and admins can cancel.

```sql
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  starts_at timestamptz not null,
  customer_phone text not null check (customer_phone ~ '^\+[0-9]{8,15}$'),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create index bookings_organization_id_starts_at_idx
  on public.bookings (organization_id, starts_at);

alter table public.bookings enable row level security;

create policy "Members see their organization's bookings"
  on public.bookings for select to authenticated
  using ((select private.is_org_member(organization_id)));

create policy "Members create bookings"
  on public.bookings for insert to authenticated
  with check (
    (select private.is_org_member(organization_id))
    and created_by = (select auth.uid())
  );

create policy "Owners and admins cancel bookings"
  on public.bookings for delete to authenticated
  using (
    (select private.has_org_role(
      organization_id, array['owner', 'admin']::public.org_role[]
    ))
  );

revoke all on public.bookings from anon, authenticated;
grant select, delete on public.bookings to authenticated;
grant insert (organization_id, starts_at, customer_phone) on public.bookings to authenticated;
grant all on public.bookings to service_role;
```

### 2.4 Test the policies

RLS tests are pgTAP files run inside a transaction that is rolled back.
`10_rls.test.sql` shows the pattern: insert fixtures as the superuser, then switch
identity with the helpers and assert what each user can see or do.

```sql
select pg_temp.login_as('00000000-0000-0000-0000-00000000000b'); -- a member of org one

select is(
  (select count(*) from public.bookings),
  1::bigint,
  'Members only see their own organization''s bookings'
);

-- A policy that doesn't match filters rows instead of raising an error:
-- the delete runs but returns nothing.
select is_empty(
  'delete from public.bookings returning id',
  'Members cannot cancel bookings'
);

-- No grants at all for anon: the query itself is refused.
select pg_temp.login_anon();
select throws_ok(
  'select * from public.bookings',
  '42501',
  null,
  'Anonymous users cannot read bookings'
);
```

Remember to raise `select plan(n);` at the top by the number of tests you add.
For every policy, cover at least: the allowed user succeeds, a user from
another organization sees nothing, and an anonymous request is denied.

### 2.5 What CI checks

The `Database` job in `.github/workflows/ci.yml` starts a fresh local stack
and runs:

1. every migration and `seed.sql`;
2. `supabase db lint --fail-on warning`;
3. the pgTAP suite (`bun run db:test`): the shared preamble is in sync,
   `00_structure` (RLS and a primary key on every table), `00_advisors` (the
   Supabase advisor lints at zero) and the feature suites;
4. a diff of `types.ts` against freshly generated types;
5. integration tests for auth, billing and storage against the real stack
   (`SUPABASE_INTEGRATION=1`).

### 2.6 Deploy migrations to a hosted project

In production this is automatic: after a merge to `main`, the **Migrate
production database** workflow (`.github/workflows/migrate.yml`) runs
`supabase db push` once CI passes, and **Back up production database**
(`backup.yml`) takes an encrypted nightly dump. Setup and restore steps:
[`docs/platform`](docs/platform/README.md). The manual commands below are
for a new environment or a first push.

Create one Supabase project per environment (at least *production*, ideally
also *staging*) in a region close to your users; Frankfurt (`eu-central-1`)
is a common choice for Iraq.

```sh
cd packages/database
bunx supabase login
bunx supabase link --project-ref <project-ref>
bunx supabase db push --dry-run   # shows which migrations will run
bunx supabase db push             # applies them
```

`db push` only applies migrations that the remote database hasn't seen, in
timestamp order. Production plans are *not* seeded: insert them with SQL in
the dashboard, or with a migration if they should be versioned.

Take a backup, or make sure Point-in-Time Recovery is on, before pushing
destructive changes such as dropping columns. Prefer two-step changes: add the
new column and deploy code that writes both, then remove the old column in a
later migration.

### 2.7 Configure Auth for production

In the Supabase dashboard:

1. **Authentication → URL Configuration.** Set **Site URL** to the product URL
   (`https://spark.theideaiq.com`). Add these **Redirect URLs**:
   - `https://spark.theideaiq.com/**` (The IDEA Spark, with The IDEA Pass)
   - `capacitor://localhost/**` (iOS app)
   - `https://localhost/**` (Android app)
   - `<bundle id>://**`, for example `iq.example.app://**` (native deep links)
2. **Authentication → Sign In / Providers → Email:** enabled, with
   **Confirm email** on (new accounts confirm their address with the code),
   **Email OTP length** `6` and **Email OTP expiration** `600` seconds
   (10 minutes). Leave "Secure email change" on.
3. **Authentication → Sign In / Providers → Phone:** disabled (no SMS plan;
   see "Phone sign-in is switched off" in [The IDEA Pass](#the-idea-pass)).
   Remove any test phone numbers.
4. **Authentication → Emails → SMTP Settings:** enable custom SMTP with
   Resend (the built-in sender is for testing only and allows a few emails
   an hour):
   - Sender email `hi@theideaiq.com`, sender name `The IDEA Pass`
     (theideaiq.com verified in Resend, with its SPF and DKIM records);
   - Host `smtp.resend.com`, port `465`, username `resend`;
   - Password: a Resend API key (Resend → API Keys, "Sending access" for
     theideaiq.com). It lives only in Supabase; never commit it.
5. **Authentication → Emails → Templates:** paste the files from
   `packages/database/supabase/templates/` (open each, copy all of it) into
   the template of the same name, with these subjects (the same as
   `config.toml`):
   - **Confirm signup** ← `confirmation.html`, subject
     `رمز التسجيل في The IDEA Pass · Sign-up code for The IDEA Pass: {{ .Token }}`;
   - **Magic Link** ← `magic_link.html`, subject
     `رمز الدخول إلى The IDEA Pass · Sign-in code for The IDEA Pass: {{ .Token }}`;
   - **Change Email Address** ← `email_change.html`, subject
     `تأكيد البريد الإلكتروني · Confirm your email for The IDEA Pass`.
   Each shows `{{ .Token }}` and no link. Send yourself a code from
   `/en/sign-up` to check it arrives from hi@theideaiq.com.
6. **Rate limits.** Under **Authentication → Rate Limits**, set the emails
   per hour to what Resend's plan allows (for example 100) and keep the
   per-address interval at 60 s (the form's resend cooldown).

### 2.8 Which client to use where

| Where | Client | RLS |
| --- | --- | --- |
| `apps/app` client components (browser and the apps' WebView) | `useAuth().supabase` (from `getSupabase()`) | applies |
| `apps/app` Server Components and Server Actions (The IDEA Pass, the back office) | `@repo/auth/server` | applies |
| `apps/web` and other server-rendered code acting for a user | `@repo/auth/server` | applies |
| `apps/api` endpoints called by users | verify with `authenticateRequest`, check `membershipRole`, then the admin client for the privileged step | bypassed: check access yourself |
| Webhooks, cron jobs | `@repo/database/admin` | bypassed |

### 2.9 Files (Storage)

Use `@repo/storage`. Organization files go in the private `org-files` bucket
under `<organization id>/…`; avatars go in the public `avatars` bucket under
`<user id>/…`. The storage policies read the first path segment, so a file
outside that layout is not accessible.

---

## 3. The iOS and Android apps (The IDEA Spark shell)

### 3.1 How the native apps work

The iOS and Android apps are a native shell (Capacitor 8) around the live
**The IDEA Spark** at `https://spark.theideaiq.com`. The WebView loads Spark
from `server.url`: the same server-rendered pages, cookie session, Server
Actions and deployments as the browser. A web deploy reaches the apps at
once; a store release is only needed for native changes (plugins,
permissions, icons, `capacitor.config.ts`).

```
┌──────────── iOS / Android app ─────────────┐
│ native: splash, status bar, push, share,   │
│ app links, offline screen (native/www)     │
│ ┌─────────────── WebView ────────────────┐ │        ┌──────────────┐
│ │ https://spark.theideaiq.com            │─┼──────▶ │ Spark (Vercel)│
│ │ cookie session (.theideaiq.com)        │ │        └──────────────┘
│ │ window.Capacitor → native plugins      │─┼──────▶ apps/api (push
│ └────────────────────────────────────────┘ │        register, checkout)
└────────────────────────────────────────────┘
```

| | Browser | iOS/Android app |
| --- | --- | --- |
| Pages | Spark on Vercel | the same Spark, in a WebView |
| Session | Supabase cookie shared across `*.theideaiq.com` | the same cookie, kept by the WebView |
| Detecting the shell | — | client: `isNativeApp()` (`apps/app/lib/platform.ts`); server: `isNativeShellUserAgent()` (`lib/native/user-agent.ts`, the WebView appends `TheIDEASpark/1`) |
| Ad pixels | load when configured | never load |
| Digital goods (The IDEA Plus) | Wayl checkout | only when `allowNativeCheckout` is on (`canSellDigitalGoods()`) |
| Physical store orders | Wayl checkout | Wayl checkout in the system browser |
| No connection | browser error page | bundled ar/en offline screen with retry |

**Files:**

- `apps/app/capacitor.config.ts`: app id (`project.bundleId`), name "The
  IDEA Spark", `server.url`, `allowNavigation`, offline page, splash,
  status bar, push presentation, user-agent marker.
- `apps/app/native/www/`: the only bundled web assets: `offline.html`
  (`server.errorPath`), `index.html` (Capacitor requires one; it forwards to
  Spark) and `shell.js`, generated by `native/prepare.ts` on every
  `cap:sync` with the Spark URL and the offline text from the messages
  files (`app.native.offline`). `shell.js` is git-ignored.
- `apps/app/native/assets/`: icon and splash sources for
  `@capacitor/assets`: the yellow bulb on The IDEA Pink (`#D81B60`), rendered
  from `docs/brand/logos` (brand v1.0).
- `apps/app/lib/native/`: client helpers: `push.ts` and
  `use-native-push.ts` (push registration), `share.ts` (share sheet with
  Web Share and clipboard fallbacks), `checkout.ts`
  (`canSellDigitalGoods()`), `user-agent.ts`, `secure-storage.ts`.
- `apps/app/public/.well-known/`: `apple-app-site-association` and
  `assetlinks.json` for app links (3.6).
- `apps/api/app/push/*`, `apps/api/app/webhooks/notifications`,
  `apps/api/app/cron/push`, `apps/api/lib/push/*`: push delivery (3.5).

**Navigation.** Spark's own host is always loaded in the WebView.
`allowNavigation` adds `theideaiq.com` and `*.theideaiq.com` (the website,
The IDEA Design, the API). Every other URL, Wayl checkout included, opens
in the system browser, so the WebView never shows a third-party page.

**Plugins in use** (keep every `@capacitor/*` package on the same major
version as `@capacitor/core`; `bun run --cwd apps/app cap:doctor` lists
them):

- `@capacitor/app`: app links, the Android back button, foreground and
  background events (`components/native-bridge.tsx`).
- `@capacitor/push-notifications`: push (3.5).
- `@capacitor/share`: the system share sheet.
- `@capacitor/splash-screen`, `@capacitor/status-bar` and `SystemBars`
  (core): launch screen, dark status bar, edge-to-edge layout with
  `--safe-area-inset-*` CSS variables.
- `@capacitor/browser`: opens Wayl checkout in the system browser.
- `@aparajita/capacitor-secure-storage`: Keychain/Keystore storage, kept for
  any token the shell must hold outside the cookie.

### 3.2 Prerequisites

- macOS with Xcode for iOS; Android Studio with an Android SDK and JDK for
  Android, at the versions in Capacitor 8's environment setup guide
  (https://capacitorjs.com/docs/getting-started/environment-setup).
- An Apple Developer Program membership and a Google Play Console account.
- A Firebase project for push (3.5).

### 3.3 Create the native projects (once)

```sh
cd apps/app
bun run cap:add       # writes native/www/shell.js, then cap add ios + android
bun run cap:assets    # icons and splash screens from native/assets
```

Commit `apps/app/ios` and `apps/app/android`: they hold signing settings,
icons, capabilities, permissions and the app-link setup. Never commit
`google-services.json` or `GoogleService-Info.plist` (both are in
`apps/app/.gitignore`); each machine or CI job copies them in (3.5).

**Recommended hardening (Android).** Set `android:allowBackup="false"` on
`<application>` in `AndroidManifest.xml`.

### 3.4 Sync, run and live reload

```sh
bun run cap:sync                       # from the root (turbo), or:
bun run --cwd apps/app cap:sync        # prepare.ts + cap sync
bun run --cwd apps/app cap:open:ios    # Xcode
bun run --cwd apps/app cap:open:android
bun run --cwd apps/app cap:run:ios     # simulator or device
bun run --cwd apps/app cap:doctor      # versions of the Capacitor packages
```

There is no web build step: `cap sync` copies `native/www` and the config
into both projects and updates native plugin dependencies. Run it after
changing `capacitor.config.ts`, the offline page or a plugin.

**Which Spark the app loads** is decided at sync time:

| Variable | Use | Example |
| --- | --- | --- |
| none | production | `https://spark.theideaiq.com` |
| `NEXT_PUBLIC_APP_URL` | a preview or staging Spark | `NEXT_PUBLIC_APP_URL=https://spark-git-x.vercel.app bun run --cwd apps/app cap:sync` |
| `CAP_SERVER_URL` | live reload against `next dev` on your LAN (allows cleartext HTTP) | `CAP_SERVER_URL=http://192.168.1.20:3000 bun run --cwd apps/app cap:sync` |

A preview host outside `*.theideaiq.com` works as the start URL, but links to
other The IDEA hosts open in the system browser. Run `cap:sync` again
without either variable before a release build.

### 3.5 Push notifications

**Flow.** A database trigger writes a `notifications` row (order shipped,
support reply, …). A Supabase Database Webhook posts the insert to
`POST /webhooks/notifications` on apps/api, which claims the row
(`claim_push_notifications` sets `pushed_at`, so nothing is pushed twice),
reads the recipient's devices from `push_devices` and sends one FCM HTTP v1
message per device. The title is the event's title in the recipient's
language (`profiles.locale`); the body is the generic "Open to see the
details." so order numbers and product names never show on a locked
screen. Tapping opens the notification's `link` in the app. Devices FCM
reports as unregistered are deleted. `GET /cron/push` (daily, Vercel Cron)
catches anything the webhook missed in the last 24 hours; on a Vercel plan
with frequent crons, run it every few minutes instead.

**In the app.** `useNativePush` (mounted in `NativeBridge`) runs once
someone is signed in, inside the shell only: it asks for notification
permission (once; iOS and Android 13+ show the system prompt), registers
with FCM and sends the token to `POST /push/register` with the user's
access token (`register_push_device`, which moves a token to the new
account when a phone changes hands). Call
`unregisterPushNotifications(supabase)` just before signing out so the next
person on the phone doesn't receive the previous account's notifications.

**Setup (once):**

1. **Firebase:** create a project (or use The IDEA's), add an iOS app with
   the bundle id `com.theideaiq.app` and an Android app with the same
   package name.
2. **APNs key (iOS):** Apple Developer → Certificates, IDs & Profiles →
   Keys → create a key with Apple Push Notifications service; download the
   `.p8` once and note the Key ID and Team ID. Upload it in Firebase →
   Project settings → Cloud Messaging → Apple app configuration.
3. **iOS project:** in Xcode, add the **Push Notifications** and
   **Background Modes → Remote notifications** capabilities. Add the
   Firebase SDK (`FirebaseMessaging`) with Swift Package Manager
   (https://github.com/firebase/firebase-ios-sdk). Copy
   `GoogleService-Info.plist` into `ios/App/App/` (not committed). In
   `AppDelegate.swift`, configure Firebase and hand Capacitor the FCM token
   instead of the raw APNs token, so the server can use FCM for both
   platforms:

   ```swift
   import FirebaseCore
   import FirebaseMessaging

   // in application(_:didFinishLaunchingWithOptions:)
   FirebaseApp.configure()

   func application(_ application: UIApplication,
                    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
     Messaging.messaging().apnsToken = deviceToken
     Messaging.messaging().token { token, error in
       if let error {
         NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
       } else if let token {
         NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
       }
     }
   }

   func application(_ application: UIApplication,
                    didFailToRegisterForRemoteNotificationsWithError error: Error) {
     NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
   }
   ```

4. **Android project:** copy `google-services.json` into `android/app/`
   (not committed). The Capacitor template applies the Google Services
   Gradle plugin when the file is present.
5. **API secrets** (Vercel project `api`, and `apps/api/.env.local` for
   development):
   - `FCM_SERVICE_ACCOUNT`: Firebase → Project settings → Service accounts
     → Generate new private key; the JSON file's contents on one line, or
     base64 of it. Push is off while it is unset.
   - `PUSH_WEBHOOK_SECRET`: `openssl rand -hex 32`.
6. **Database webhook:** Supabase → Database → Webhooks → Create: table
   `public.notifications`, event **Insert**, type HTTP request, `POST`
   `https://api.theideaiq.com/webhooks/notifications`, header
   `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`.
7. **CI builds:** store both Firebase files as secrets and write them into
   place before `cap sync`.

**Test it:** sign in on a device, accept the prompt, check that a row
appears in `push_devices`, then change one of your orders' status in the
back office: the push arrives and tapping it opens the order.

### 3.6 App links (Universal Links and Android App Links)

`https://spark.theideaiq.com/...` links (emails, messages, the website)
open in the app when it is installed. `NativeBridge` receives them
(`appUrlOpen`) and routes to the path, keeping the language.

Spark serves both verification files from `apps/app/public/.well-known/`
(`apple-app-site-association` with `Content-Type: application/json`, set
in `apps/app/vercel.json`). Fill in the placeholders before the first
release:

| File | Placeholder | Where to find the value |
| --- | --- | --- |
| `apple-app-site-association` | `APPLE_TEAM_ID` (twice) | Apple Developer → Membership details → Team ID |
| `assetlinks.json` | `PLAY_APP_SIGNING_SHA256_FINGERPRINT` | Play Console → Test and release → App integrity → App signing key certificate → SHA-256 (add the upload key's too if you test signed builds outside Play) |

The `/.well-known/*` paths must not be redirected by Spark's locale proxy.
Check after deploying: `curl -I https://spark.theideaiq.com/.well-known/apple-app-site-association`
and `https://spark.theideaiq.com/.well-known/assetlinks.json` both return 200
with JSON.

- **iOS:** Xcode → App target → Signing & Capabilities → **Associated
  Domains**: `applinks:spark.theideaiq.com` and
  `webcredentials:spark.theideaiq.com` (password autofill).
- **Android:** in `android/app/src/main/AndroidManifest.xml`, inside the
  main `<activity>`:

  ```xml
  <intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="spark.theideaiq.com" />
  </intent-filter>
  ```

  Verify on a device with
  `adb shell pm get-app-links com.theideaiq.app`.

The custom scheme `com.theideaiq.app://` (Xcode URL Types and an Android
intent filter with `android:scheme="com.theideaiq.app"`) is optional now;
`NativeBridge` still routes such links if you register it.

### 3.7 Sign-in and payments inside the apps

**Sign-in** happens in the WebView with The IDEA Pass's email code, which
needs no redirect (a magic link would open in the system browser instead); the session cookie is first-party for Spark and
persists like Safari's or Chrome's. Google and Apple block their OAuth
pages inside embedded WebViews, so OAuth sign-in (if ever added) must go
through the system browser and an app link back.

**Digital goods.** Call `canSellDigitalGoods()` (`apps/app/lib/native/checkout.ts`)
on every screen that sells a digital good (The IDEA Plus, plans). With
`project.commerce.allowNativeCheckout: false` it returns false in the shell:
show the plan as managed on the website, with no purchase button and no
link to the website checkout (App Store 3.1.1/3.1.3, Google Play payments
policy). On the server, `isNativeShellUserAgent()` gives the same answer
before the page reaches the client. Physical store orders are not digital
goods and use Wayl as on the web, opened in the system browser; the
webhook, not the redirect, marks the payment as paid.

### 3.8 App Store review: minimum functionality (guideline 4.2)

Apple rejects apps that are "a repackaged website". The shell earns its
place with native features; keep them working and mention them in the
review notes:

- push notifications for orders, rentals and support replies;
- the system share sheet, app links, the native splash and status bar and
  an offline screen instead of a browser error;
- no browser UI: external sites open in the system browser, the Android
  back button navigates inside the app;
- in-app account deletion (Settings → Delete account, guideline 5.1.1(v));
- content and layout made for phones (safe areas, touch targets), no
  "download our app" banners inside the app.

Avoid features that only make sense on the web inside the shell (cookie
banners for ad pixels, links to the desktop site).

### 3.9 Release

**Versioning:** bump both numbers for every store upload.

- iOS: Xcode → App target → General → **Version** (`MARKETING_VERSION`) and
  **Build** (`CURRENT_PROJECT_VERSION`).
- Android: `android/app/build.gradle` → `versionName` and `versionCode`.

**iOS (App Store / TestFlight):** `bun run --cwd apps/app cap:sync` →
`cap:open:ios` → Signing & Capabilities (team, automatic signing) → **Any
iOS Device (arm64)** → **Product → Archive** → **Distribute App → App Store
Connect** → TestFlight, then submit.

**Android (Google Play):** `cap:sync` → create an upload keystore once (keep
it and its passwords in the password manager; enable Play App Signing) →
`cap:open:android` → **Build → Generate Signed App Bundle** → upload the
`.aab` to internal testing, then promote. Or
`bunx cap build android --keystorepath … --keystorepass … --keystorealias … --keystorealiaspass … --androidreleasetype AAB`.

**Store submission checklist:**

- [ ] `cap:sync` ran without `CAP_SERVER_URL` and `NEXT_PUBLIC_APP_URL`
      (the app loads `https://spark.theideaiq.com`).
- [ ] Icons and splash generated (`cap:assets`); app name "The IDEA Spark".
- [ ] Push works on a real iPhone and Android phone (3.5); APNs key in
      Firebase; `FCM_SERVICE_ACCOUNT`, `PUSH_WEBHOOK_SECRET` and the
      database webhook set in production.
- [ ] App links verified (3.6), placeholders filled in the
      `.well-known` files.
- [ ] Privacy policy URL; App Privacy (Apple) and Data safety (Google)
      forms: email address, phone number (delivery), push token,
      analytics if enabled.
- [ ] Account deletion works against production; its location is in the
      review notes.
- [ ] Review notes: a review account's email address and how its code
      reaches the reviewer (an inbox you watch during review and reply
      from, or a mailbox shared with the reviewer), the native features
      listed in 3.8, and the commerce mode.
- [ ] `project.commerce.allowNativeCheckout` matches what the app sells.
- [ ] Android: `allowBackup="false"`, target SDK as Play requires.

### 3.10 Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Offline screen although online | Spark is down or the URL is wrong. `bunx cap config` shows `server.url`; inspect the WebView with Safari → Develop (iOS) or `chrome://inspect` (Android). |
| App loads a laptop or preview URL | `cap:sync` ran with `CAP_SERVER_URL` or `NEXT_PUBLIC_APP_URL` set. Sync again without them. |
| A The IDEA page opens in the system browser | Its host is not in `allowNavigation` (`capacitor.config.ts`). |
| No push prompt | Not signed in, or permission was refused before (Settings → Notifications → The IDEA Spark). |
| Token registered but no push | `FCM_SERVICE_ACCOUNT` missing or wrong project; the database webhook missing (check its logs in Supabase); on iOS the APNs key isn't in Firebase or `AppDelegate` still hands over the APNs token. |
| Universal link opens Safari | Associated Domains missing, wrong Team ID in the AASA file, or the file is redirected. Reinstall the app after fixing (iOS caches the file). |
| "Run `bun run init` first" | `project.json` still has the placeholder bundle id. |

---

## 4. Marketing tracking and Wayl payments

### 4.1 Tracking architecture

```
@repo/analytics
  provider.tsx       <AnalyticsProvider>: loads GA4 + Meta Pixel + TikTok Pixel directly
  bootstrap.ts       inline script: consent defaults, tag loaders; does nothing inside Capacitor
  page-view.tsx      page views on every client-side navigation; remembers fbclid/ttclid
  client.ts          track(), identify(), resetIdentity(), setConsent(), getAttribution()
  events.ts          the event catalogue and its mapping to GA4, Meta and TikTok names
  conversions/       server-side Meta Conversions API and TikTok Events API
```

`<AnalyticsProvider>` is rendered once in the root layouts of `apps/web` and
`apps/app`. Code never calls `gtag`, `fbq` or `ttq` directly. It calls

```ts
import { track } from "@repo/analytics/client";
track("begin_checkout", { currency: "IQD", value: 75000, items: [{ id: "pro-monthly" }] });
```

and the package translates the event for each destination.

**Tags:** set `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID` and
`NEXT_PUBLIC_TIKTOK_PIXEL_ID` (any subset). The package loads each tag and
sends every event to each one with the right name and parameters.

Google Tag Manager is not supported (removed 2026-10-24): every tag loads
from code, so third-party scripts such as cookie banners or chat widgets
cannot appear on the site without a code review.

#### Event catalogue

| `track()` event | GA4 | Meta | TikTok | Fired from |
| --- | --- | --- | --- | --- |
| page view (automatic) | `page_view` | `PageView` | page | every navigation, web and app |
| `sign_up` | `sign_up` | `CompleteRegistration` | `CompleteRegistration` | app: code verified on the sign-up page |
| `login` | `login` | — | — | app: code verified on the sign-in page |
| `search` | `search` | `Search` | `Search` | app: header search |
| `begin_checkout` | `begin_checkout` | `InitiateCheckout` | `InitiateCheckout` | app: billing, "Pay" clicked |
| `purchase` | `purchase` | `Purchase` | `Purchase` | app: billing, after returning from a paid checkout. **Also** server-side from the payment webhook (Meta and TikTok). |
| `generate_lead` | `generate_lead` | `Lead` | `Lead` | web: contact form sent |
| `add_to_cart`, `add_payment_info`, `view_item`, `contact`, `start_trial`, `subscribe` | GA4 recommended names | standard events | standard events | available for project-specific screens |

To add an event, extend `EventProperties` and `eventNames` in
`packages/analytics/events.ts` and add a test in `events.test.ts`.

#### Purchases and deduplication

A purchase can be reported twice: by the browser when the customer returns
from Wayl, and by `apps/api` when Wayl's webhook confirms the payment. Both use
the same event id, `purchase:<payment reference>` (Meta `eventID`, TikTok
`event_id`), so Meta and TikTok count it once. The server-side report still
counts when the customer closes the tab before returning, or when an ad
blocker hides the pixel.

How the server knows which ad click to credit:

1. The page-view tracker stores `fbclid` and `ttclid` from the landing URL
   for the visit.
2. When checkout starts, the app sends `getAttribution()` to `/checkout`:
   the `_fbp`, `_fbc` and `_ttp` cookies, `ttclid` and the page URL. The API
   adds the client's IP address and user agent.
3. `apps/api` stores it in the payment's `metadata`, but only for web
   checkouts and only when a conversions token is configured.
4. On the paid webhook, `apps/api/lib/conversions.ts` sends `Purchase` to the
   Meta Conversions API and TikTok Events API. It includes the user's phone,
   email and id, hashed with SHA-256 as the platforms require, and the stored
   attribution.

Renewals and native-app purchases carry no browser context, so they are not
reported as ad conversions. They are still recorded in PostHog as
`Payment Completed`.

#### Consent

By default, consent is granted, except that visitors from the EEA, the UK and
Switzerland always start denied for Google tags (Consent Mode v2). If a
project needs a consent banner, pass
`defaultConsent={{ ads: false, analytics: false }}` to `<AnalyticsProvider>`
and call `setConsent({ ads, analytics })` from the banner. That updates
Google consent, Meta's `fbq('consent')`, TikTok's consent API and PostHog in
one call.

#### Inside the native apps

Web pixels never load inside the iOS/Android apps: the bootstrap script exits
when it detects Capacitor. Apple requires App Tracking Transparency for that
kind of tracking, and web pixels in a WebView misattribute installs. PostHog
product analytics still works. For app-install campaigns, use the platforms'
mobile SDKs or a mobile measurement partner. Those are native integrations
outside this template.

#### Verify tracking

| Destination | How |
| --- | --- |
| GA4 | Open the site with the Google Tag Assistant extension connected, then **GA4 → Admin → DebugView**. Click through sign-up, search, checkout. Realtime reports confirm production traffic. |
| Meta (browser) | Meta Pixel Helper extension: each event should show once, with an event id on `Purchase`. |
| Meta (server) | Set `META_TEST_EVENT_CODE` in `apps/api` (from **Events Manager → Test events**), make a test payment and watch the event arrive. In **Overview**, the `Purchase` row should show browser and server events *deduplicated*. Remove the test code afterwards. |
| TikTok | TikTok Pixel Helper for the browser, `TIKTOK_TEST_EVENT_CODE` with **Events Manager → Test events** for the server. Remove the test code afterwards. |

### 4.2 Wayl payments

#### Delivery, pickup and cash orders

Store orders are placed with `create_order(shipping, fulfilment,
payment_method, delivery_zone)` (migration `20261120000160_delivery.sql`).
The database prices the delivery fee from `delivery_zones` (one per
governorate, edited in Back office → Catalog → Settings); pickup is free and
offered once **Store pickup** is on and has an address; the free-delivery
threshold applies to every zone.

- **Pay online** (`online`): the order is `pending` and the customer pays
  on Wayl as below.
- **Cash on delivery / pay at pickup** (`cash_on_delivery`, switched by
  **Offer cash payment**): the order starts `confirmed` with its stock
  taken. Spark asks `POST /orders/confirmation` (Bearer token) to email the
  confirmation once (`confirmation_emailed_at`). Staff move it through
  preparing and shipped (pickup: "Ready for pickup"), and **Mark cash
  collected** (`mark_cash_collected`, support or finance) marks it paid and
  delivered and records a `cash` payment for the ledger. Until then it can
  still be cancelled, which returns the stock. Cash is not third-party
  checkout, so it is offered in the iOS/Android apps too.

#### How a payment flows

```mermaid
sequenceDiagram
  participant U as Customer (apps/app)
  participant API as apps/api
  participant W as Wayl
  participant DB as Supabase
  U->>API: POST /checkout {organizationId, planId, attribution} + Bearer token
  API->>API: verify token, owner/admin role, purchase policy
  API->>DB: insert payment (pending, reference pay_…)
  API->>W: POST /api/v1/links (referenceId, amount, webhookUrl, webhookSecret)
  W-->>API: link URL
  API-->>U: {referenceId, url}
  U->>W: pays (card, Qi Card, ZainCash, FIB…)
  W->>API: POST /webhooks/payments (x-wayl-signature-256)
  API->>API: HMAC-SHA256 check over the raw body
  API->>DB: record webhook_events (once per event)
  API->>W: GET /api/v1/links/{reference} (re-read the real status)
  API->>DB: payment → paid, subscription → active, period end set
  API-->>W: 200
  API->>API: after(): PostHog + Meta/TikTok purchase
```

Defensive design:

- **Webhooks are verified before anything is parsed.** The signature is an
  HMAC-SHA256 of the raw body with `WAYL_WEBHOOK_SECRET`, compared in
  constant time. A bad signature gets `401`.
- **The webhook payload is not trusted for the status.** The service re-reads
  the link from Wayl's API before changing anything.
- **Each delivery is recorded once.** `webhook_events` has a unique key, so
  repeated deliveries return `duplicate` and change nothing.
- **Errors return `5xx`,** so Wayl retries later.

Renewals: Wayl has no card-on-file subscriptions. The daily cron
`/cron/subscriptions` creates a renewal payment link 3 days before each
period ends and emails it to the organization's owners and admins. It marks unpaid
subscriptions `past_due`, then `expired` after a 7-day grace period.

#### Set up Wayl

1. Get a merchant account at https://wayl.io and create an API token in the
   Wayl dashboard.
2. Generate a webhook secret: `openssl rand -hex 32`.
3. In the **api** Vercel project, set `WAYL_API_TOKEN`, `WAYL_WEBHOOK_SECRET`,
   `WAYL_ENV` (`test` while integrating, `live` for real charges) and
   `NEXT_PUBLIC_API_URL` (the public API URL; the webhook URL
   `<NEXT_PUBLIC_API_URL>/webhooks/payments` is derived from it and sent with
   every link). Set `WAYL_API_URL=https://api.thewayl-staging.com` only to use
   Wayl's staging server.
4. Make sure Wayl can reach the webhook. Vercel **Deployment Protection**
   blocks unauthenticated requests to protected deployments, so test on a
   domain that isn't protected, or configure a protection bypass.
5. Insert the real plans into `public.plans` in production. Amounts are whole
   IQD, and Wayl's minimum is 1,000 IQD.

Without `WAYL_API_TOKEN`, development uses an in-memory mock provider. In
production, the API refuses to start a checkout without Wayl credentials.

#### Verify payments in production

Work through this list once on staging (`WAYL_ENV=test`) and once on
production (`WAYL_ENV=live`):

1. **The API is up and protected:**

   ```sh
   curl -i https://api.example.iq/health                      # 200 OK
   curl -i -X POST https://api.example.iq/webhooks/payments \
     -H 'content-type: application/json' -d '{"referenceId":"x"}'  # 401: unsigned
   curl -i https://api.example.iq/cron/subscriptions          # 401: no CRON_SECRET
   ```

2. **Make a payment.** Sign in as an organization owner, open **Billing** and
   pay for a plan. In production, use a temporary low-priced plan:

   ```sql
   insert into public.plans (id, name, amount, billing_interval)
   values ('verification', 'Verification', 1000, 'month');
   ```

3. **Check the webhook** in Vercel → api project → **Logs**, filtered to
   `/webhooks/payments`: expect `200` with `"status":"processed"`.
4. **Check the database:**

   ```sql
   select reference_id, status, amount, paid_at, created_at
   from public.payments order by created_at desc limit 5;

   select organization_id, plan_id, status, current_period_end
   from public.subscriptions order by updated_at desc limit 5;

   select provider, reference_id, received_at, processed_at
   from public.webhook_events order by received_at desc limit 5;
   ```

   Expect `payments.status = 'paid'`, the subscription `active` with a period
   end about one interval ahead, and a `webhook_events` row with
   `processed_at` set.
5. **Check the dashboard.** Wayl shows the link as *Complete*, and the app's
   Billing page shows the plan as active and the payment as paid.
6. **Check conversions** (if configured). With the test event codes set, a
   `Purchase` appears in Meta and TikTok test events with the same event id
   as the browser event.
7. **Clean up.** Refund the verification payment from the Wayl dashboard, and
   deactivate the plan with
   `update public.plans set active = false where id = 'verification';`.
8. **Check the cron.** Vercel → api project → **Settings → Cron Jobs** lists
   `/cron/subscriptions` (06:00 UTC) and `/cron/keep-alive` (01:00 UTC). To run
   one manually:
   `curl -H "Authorization: Bearer $CRON_SECRET" https://api.example.iq/cron/subscriptions`.

#### Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Webhook returns `401` | The signature didn't match: `WAYL_WEBHOOK_SECRET` changed after the link was created (each link carries the secret it was created with), or a proxy altered the body. |
| Payment stays `pending` | The webhook never arrived. `NEXT_PUBLIC_API_URL` points to the wrong host, or Deployment Protection blocks Wayl. Check the API logs. |
| `/checkout` returns `502` | Wayl rejected the request: wrong token for the environment, amount below 1,000 IQD, or Wayl is unavailable. The API logs show Wayl's message. |
| `/checkout` returns `403` `store-billing-required` | Expected in the iOS/Android apps when the project sells digital goods (see 1.3). |
| Webhook returns `500` | The database or Wayl API failed while processing. Wayl retries; check the logs. |

### 4.3 Newsletters (Resend Broadcasts)

The IDEA doesn't send its own campaigns any more (decision of 2026-10-24):
newsletters are written and sent in **Resend → Broadcasts**, to one Resend
segment that `apps/api` keeps in step with the accounts.

- **Consent** stays in the product: `profiles.marketing_opt_in`, set during
  onboarding and in Settings. The back office shows it per customer
  (Customers, "opted in" filter) and on the dashboard.
- **Sync** (`GET /cron/newsletter-contacts`, daily at 04:00 UTC,
  `apps/api/lib/newsletter.ts`): every account with an email becomes a
  contact of the `RESEND_SEGMENT_ID` segment with its first and last name,
  `unsubscribed` unless it opted in (suspended accounts are always
  unsubscribed). Contacts that unsubscribed in Resend (the broadcast's
  unsubscribe link) turn the account's opt-in off. When both sides changed,
  the newer change wins: the trigger on `profiles.marketing_opt_in` stamps
  when consent changed, and the sync records when it last pushed each
  account (`private.newsletter_contacts`). Contacts in the segment without
  an account (deleted accounts) are deleted from Resend, so **don't add
  contacts to this segment by hand**; use another segment for lists from
  elsewhere.
- Only differences are sent, paced under Resend's rate limit (2 requests a
  second by default). The first sync of a large account base can take
  several daily runs (each stops after about four minutes and reports
  `"partial": true`); run it by hand to catch up:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://api.example.iq/cron/newsletter-contacts`.

Set it up once:

1. Resend → **Audience → Segments** → create a segment (for example "The
   IDEA customers") and copy its id.
2. Vercel → `api` project → set `RESEND_SEGMENT_ID` to that id. The
   `RESEND_TOKEN` there must be a full-access key (a sending-only key can't
   manage contacts).
3. Run the cron once by hand (above) and check the contacts in Resend.
4. Write broadcasts in Resend, keep its unsubscribe link in the footer
   (Resend's editor has a placeholder for it) and send them to that
   segment; Resend only delivers to subscribed contacts.

---

## 5. Vercel environment variables

### 5.1 Projects

Create four Vercel projects from the same repository:

| Project | Root Directory | Domain | Notes |
| --- | --- | --- | --- |
| web | `apps/web` | `theideaiq.com` | The public website |
| app | `apps/app` | `spark.theideaiq.com` | The IDEA Spark: customer app, The IDEA Pass, back office; the iOS/Android apps load it |
| api | `apps/api` | `api.theideaiq.com` | Cron jobs are defined in `apps/api/vercel.json` |
| storybook | `apps/storybook` | `design.theideaiq.com` | The IDEA Design; `vercel.json` sets `bun run build` (Storybook, then Next.js). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`. No Vercel Authentication: the proxy is the gate. |

For each project:

- **Framework Preset:** Next.js.
- **Build Command:** `turbo run build`, so the packages an app depends on
  are built first.
- **Install Command:** `bun install`. Vercel detects Bun from `bun.lock`.
- **Node.js Version:** 24.x (matches `.nvmrc`).
- Keep **Automatically expose System Environment Variables** on (`VERCEL`,
  `VERCEL_ENV`, `VERCEL_URL`).

`vercel.json` in each app already skips builds for commits marked `[skip ci]`.

### 5.2 How variables are validated

Each app validates its environment at build time with `@t3-oss/env-nextjs`
(`apps/*/env.ts`, composed from each package's `keys.ts`). A missing required
variable, or a value in the wrong format, fails the build with a clear message.
For example, a Supabase publishable key must start with `sb_publishable_` and
a Resend token with `re_`. Most integrations are optional: leave the variable
unset and the feature turns itself off.

- Do not set `SKIP_ENV_VALIDATION` in Vercel. It is for CI only.
- `NEXT_PUBLIC_*` values are compiled into the JavaScript at build time.
  Changing one requires a redeploy.
- Use separate values for **Production** and **Preview**: a staging Supabase
  project, `WAYL_ENV=test`, test event codes.

The API's CORS only allows the configured app and web origins. Give previews
stable domains (for example a `staging` branch with `staging.app.example.iq`
and `staging.api.example.iq`) instead of relying on per-deployment URLs.

Legend: **Build**: the deployment fails without it. **Feature**: the
deployment succeeds, but the named feature is off or broken without it.
**Optional**: enables an extra integration.

### 5.3 `web` (apps/web)

Public values only. **Secrets live only in `api`** (`bun run check:secrets`
fails otherwise): the contact form posts to `POST /contact` on the API and
the footer's status badge reads `GET /status`, so Resend, Arcjet, Upstash
and Better Stack are configured on `api`, not here.

| Variable | Need | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_WEB_URL` | Build | This site's URL, `https://theideaiq.com`; also the API's CORS origin for the contact form |
| `NEXT_PUBLIC_APP_URL` | Build | The IDEA Spark, `https://spark.theideaiq.com`, for "Sign in" (The IDEA Pass) and "Get started" links |
| `NEXT_PUBLIC_API_URL` | Feature | The API. Without it the contact form shows "unavailable" and the status badge is hidden. |
| `NEXT_PUBLIC_DOCS_URL` | Optional | Documentation link |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Feature | The public catalog, plans, news, events and journal (read anonymously, under Row Level Security). Without them those sections show empty states. |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Optional | See 4.1 |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional | Product analytics |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Error reporting |
| `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional | Source map upload during the Vercel build (build-time only, never read by the site) |

Remove `RESEND_*`, `ARCJET_KEY`, `UPSTASH_*` and `BETTERSTACK_*` from this
project if they are still set. Page-level bot protection for the site is
Vercel's Firewall (Bot Protection / Attack Challenge Mode), not Arcjet.

### 5.4 `app` (apps/app)

The IDEA Spark: the customer app, The IDEA Pass and the back office. Every
variable here is public (it may end up in the browser and the apps'
WebView). **Never add a secret to this project.**

| Variable | Need | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Build | This app's URL, `https://spark.theideaiq.com`; every Pass link is built on it |
| `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` | Feature (production) | `.theideaiq.com`, so the website and the design site read the session; unset on previews |
| `NEXT_PUBLIC_DESIGN_URL` | Optional | The IDEA Design, an allowed return_to host |
| `NEXT_PUBLIC_WEB_URL` | Build | Marketing site URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Feature (the app can't sign in without it) | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Feature (same) | `sb_publishable_…` |
| `NEXT_PUBLIC_API_URL` | Feature | Checkout, push registration and the back office's staff lookup call it |
| `NEXT_PUBLIC_DOCS_URL` | Optional | Help links |
| The GA4, Meta and TikTok IDs | Optional | Same values as `web`, so visitors are followed across both |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional | |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional | |
| `NEXT_PUBLIC_LIVEBLOCKS_ENABLED` | Optional (`collaboration`) | `true` shows presence and cursors; the secret lives in `api` |
| `NEXT_PUBLIC_KNOCK_API_KEY`, `NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID` | Optional (`notifications`) | Public Knock keys |

### 5.5 `api` (apps/api)

| Variable | Need | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL` | Build | Also the CORS allow-list (the public `/contact` and `/status` allow the web origin only) |
| `NEXT_PUBLIC_API_URL` | Feature | This API's public URL; the Wayl webhook URL is derived from it |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Feature | Verifying users' tokens |
| `SUPABASE_SECRET_KEY` | Feature | `sb_secret_…`. Webhooks, cron, account and organization deletion. **Server only.** |
| `CRON_SECRET` | Feature | At least 32 characters (`openssl rand -hex 32`). Vercel sends it to the cron routes; without it every cron call is rejected. |
| `FCM_SERVICE_ACCOUNT` | Feature | Firebase service account JSON (or base64 of it) for push notifications to the iOS/Android apps (3.5); push is off without it. **Server only.** |
| `PUSH_WEBHOOK_SECRET` | Feature | At least 32 characters; the Supabase database webhook on `notifications` sends it to `POST /webhooks/notifications` (3.5). |
| `WAYL_API_TOKEN`, `WAYL_WEBHOOK_SECRET` | Feature | Payments. Checkout fails in production without them. |
| `WAYL_ENV` | Feature | `live` in Production, `test` in Preview |
| `WAYL_API_URL` | Optional | Wayl staging server |
| `PAYMENTS_PROVIDER` | Optional | Leave unset (Wayl when the token is set). Never `mock` in production. |
| `RESEND_TOKEN`, `RESEND_FROM` | Feature | Receipts, renewal invoices and the website's contact form (`POST /contact`, delivered to `supportEmail` in `project.json`); without them the form answers "unavailable" |
| `RESEND_SEGMENT_ID` | Feature | The Resend segment newsletters go to; `/cron/newsletter-contacts` syncs the accounts there (4.3). The sync is off without it. Needs `RESEND_TOKEN` with full access (contacts), not a sending-only key. |
| `ARCJET_KEY` | Optional | `ajkey_…`. Guards the website's public forms (`@repo/security/form`: shield, bots, 5 per 10 minutes, undeliverable addresses) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Feature | Droid's sessions and flood counters; the contact form's one message per visitor per day |
| `NEXT_PUBLIC_META_PIXEL_ID`, `META_CONVERSIONS_ACCESS_TOKEN` | Optional | Server-side purchases to Meta; same pixel as the web apps |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID`, `TIKTOK_EVENTS_ACCESS_TOKEN` | Optional | Server-side purchases to TikTok |
| `META_TEST_EVENT_CODE`, `TIKTOK_TEST_EVENT_CODE` | Optional | Verification only; remove in Production |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Optional | `Payment Completed` events |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Optional | |
| `BETTERSTACK_API_KEY`, `BETTERSTACK_URL` | Optional | Better Stack Uptime token and public status page, for the website's status badge (`GET /status`); without them the badge is hidden |
| `LIVEBLOCKS_SECRET` | Feature, if `collaboration` is kept | `sk_…` |
| `SVIX_TOKEN` | Feature, if `webhooks` is kept | Customer webhook portal |

### 5.6 Managing variables

```sh
npm i -g vercel
vercel link --cwd apps/api              # once per app
vercel env add WAYL_API_TOKEN production --cwd apps/api
vercel env pull apps/api/.env.local --cwd apps/api   # copy Development values locally
```

After changing variables, redeploy (**Deployments → … → Redeploy**). Keep the
`.env.example` files in sync whenever a variable is added: they are the list
`bun run init` copies from and what new developers start with.

### 5.7 Go-live checklist

- [ ] Supabase production project linked and migrations pushed (2.6); Auth
      URLs, email codes (OTP length 6), templates and Resend SMTP
      configured, phone provider off (2.7).
- [ ] Four Vercel projects (web, app, api, storybook) with domains and the variables above;
      `WAYL_ENV=live`; no test event codes in Production.
- [ ] Wayl webhook verified end to end (4.2).
- [ ] Tracking verified in GA4 DebugView and in Meta and TikTok test events
      (4.1).
- [ ] Cron jobs listed in Vercel and `CRON_SECRET` set.
- [ ] Native apps synced against production Spark, push and app links
      verified, account deletion tested, submitted (3.9).

### 5.8 The shared session (The IDEA Pass)

| Variable | Need | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Build, on every project | `https://spark.theideaiq.com`; every "Sign in" links to The IDEA Pass there (`passUrl`; defaults to `http://localhost:3000`) |
| `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` | Feature, on every project that reads the session (app, storybook, web) | `.theideaiq.com`; unset on previews |
| `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_DESIGN_URL`, `NEXT_PUBLIC_API_URL` | Feature (app) | The other allowed return_to hosts |

Supabase's redirect URLs include `https://spark.theideaiq.com/**`.
