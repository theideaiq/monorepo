# The IDEA

The IDEA IQ Inc.'s production monorepo: the whole of The IDEA — the
digital ecosystem for Iraq — in one repository. Arabic (RTL) first and English
(LTR), local payments through Wayl, and native iOS and Android apps.

| Product | What it is | Where |
| --- | --- | --- |
| The IDEA Store | Gaming, tech, books and lifestyle, delivered across Iraq (`/`, `/store`) | `apps/web` (catalog, cart, checkout) |
| The IDEA Plus | Monthly membership to rent games, books and movies (`/plus`) | `apps/web/app/[locale]/plus` |
| The IDEA Club | Posts, events with RSVPs, member submissions and the Telegram rooms (`/club`) | `apps/web/app/[locale]/club` |
| The IDEA Pass | A person's membership: sign-in, the card, orders, Bulbs and settings (`/pass`) | `apps/web` |
| The IDEA Partners | Procurement, team Plus, perks and Sign in with The IDEA Pass apps for organizations: `/partners` on the website, the organization dashboard at partners.theideaiq.com | `apps/web/app/[locale]/partners`, `apps/partners` |
| Staff | The tools The IDEA's team uses, and The IDEA Design (every UI component and email template) at `/design`: staff.theideaiq.com | `apps/staff` |
| The IDEA Droid | Telegram bot: orders and Bulbs for linked members, support, FAQ, product search (also inline) | `packages/droid`, `apps/api/app/telegram` |

Built on the shaheenfarjo/monorepo template (initialized with `bun run init`:
physical-goods commerce, rate-limit and AI modules). It replaces the earlier
theideaiq/monorepo, theideaiq/mono (editorial portal) and theideaiq/droid
(legacy bot) repositories, whose git history is merged into this one.

## Stack

| Concern | Choice |
| --- | --- |
| Monorepo | Turborepo + Bun workspaces |
| Web apps | Next.js (App Router), React, Tailwind CSS v4, shadcn/ui |
| Auth & database | Supabase (Postgres, Row Level Security, email one-time codes) |
| Payments | Provider-agnostic `@repo/payments` with Wayl (ZainCash, FIB, Qi Card, cards) |
| Localization | Arabic + English, RTL-aware design system, `Asia/Baghdad` dates, IQD |
| Mobile | Capacitor (iOS + Android) shells that load the website (`apps/web`) |
| Analytics | GA4, Meta Pixel, TikTok Pixel, server-side conversions |
| Hosting | Vercel (apps) + Cloudflare (DNS, Turnstile, R2) |
| Quality | Biome via Ultracite, TypeScript strict, Vitest, GitHub Actions |

## Structure

```
apps/
  web/        theideaiq.com: The IDEA Store, Plus, Club, The IDEA Pass (sign-in and its pages),
              cart and checkout; loaded by the iOS/Android apps via Capacitor (port 3001)
  partners/   The IDEA Partners (partners.theideaiq.com): the organization dashboard (port 3000)
  staff/      Staff (staff.theideaiq.com): the tools The IDEA's team uses, and The IDEA Design
              (Storybook: UI and email review) at /design (port 3003; Storybook dev on 6006)
  api/        Checkout, payment webhooks, cron, Telegram webhook, calendar feed, Staff endpoints (port 3002)
  docs/       Mintlify documentation (port 3004)
packages/
  config/     Project identity, locales and regional settings (single source of truth)
  auth/       Supabase Auth clients, email one-time codes, session middleware
  database/   Supabase schema, migrations, RLS tests and generated types
  payments/   Payment-provider interface, Wayl provider, billing (organizations and individuals, store orders)
  commerce/   Catalog queries, prices, governorates, cart totals
  droid/      The Telegram bot and its moderation engine
  design-system/, internationalization/, analytics/, security/, seo/, …
scripts/      Repository checks
```

## Getting started

Prerequisites: Node.js 24 (`.nvmrc`), [Bun](https://bun.sh), and Docker if you want to run
Supabase locally.

```sh
bun install
bun run db:start  # local Supabase with migrations and seed data (Docker)
bun run dev       # starts every app
```

Each app reads its environment from `.env.local` (copy the app's
`.env.example`). Without credentials the apps still start; integrations whose
keys are missing are disabled. Staff sign in to Staff (`apps/staff`, localhost:3003) through
The IDEA Pass on the website, with an authenticator app; grant the first superadmin with SQL (see
`ARCHITECTURE_AND_INTEGRATIONS.md`).

## Common scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Run all apps in development |
| `bun run build` | Build all apps |
| `bun run check` / `bun run fix` | Lint and format with Biome |
| `bun run typecheck` | Type-check every workspace |
| `bun run test` | Run all unit tests |
| `bun run check:placeholders` | Fail on leftover template tokens or unbalanced module markers |
| `bun run check:rtl` / `bun run check:i18n` | Physical Tailwind utilities / UI text missing from the messages files |
| `bun run db:start` / `db:reset` / `db:test` / `db:types` | Local Supabase, migrations, RLS tests, generated types |
| `bun run cap:sync` | Copy the Capacitor configuration into the iOS and Android projects |

## Further reading

- `ARCHITECTURE_AND_INTEGRATIONS.md` — how the apps fit together, and step-by-step
  setup for the template generator, Supabase migrations and RLS, the Capacitor apps,
  tracking, Wayl payments and Vercel environment variables
- `AGENTS.md` — conventions for humans and AI agents
- `.github/CONTRIBUTING.md` — workflow and local checks
- `THIRD_PARTY_NOTICES.md` — licenses of included open-source code

Repository: https://github.com/theideaiq/monorepo · Support: hi@theideaiq.com
