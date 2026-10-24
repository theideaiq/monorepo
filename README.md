# The IDEA

The IDEA IQ Inc.'s production monorepo: the whole of The IDEA — the
digital ecosystem for Iraq — in one repository. Arabic (RTL) first and English
(LTR), local payments through Wayl, and native iOS and Android apps.

| Product line | What it is | Where |
| --- | --- | --- |
| Megastore | Gaming, tech, books and lifestyle, delivered across Iraq | `apps/web` (catalog), `apps/app` (cart, checkout, orders) |
| IDEA Plus | Monthly membership to rent games, books and movies | `apps/web/plus`, `apps/app/plus` |
| Academy | Courses and cultural-exchange programs | `apps/web/academy` |
| IDEA Suite | Procurement and recruitment for companies (business accounts) | `apps/web/suite`, `apps/app/business` |
| The Club | Community rooms on Telegram | `apps/web/club` |
| Editorial | News, events with RSVPs, the journal and member submissions | `apps/web`, `apps/app`, `apps/admin` |
| Droid | Telegram bot: moderation, FAQ, product search, AI assistant | `packages/droid`, `apps/api/app/telegram` |

Built on the shaheenfarjo/monorepo template (initialized with `bun run init`:
physical-goods commerce, rate-limit and AI modules). It replaces the earlier
theideaiq/monorepo, theideaiq/mono (editorial portal) and theideaiq/droid
(legacy bot) repositories, whose git history is merged into this one.

## Stack

| Concern | Choice |
| --- | --- |
| Monorepo | Turborepo + Bun workspaces |
| Web apps | Next.js (App Router), React, Tailwind CSS v4, shadcn/ui |
| Auth & database | Supabase (Postgres, Row Level Security, phone OTP) |
| Payments | Provider-agnostic `@repo/payments` with Wayl (ZainCash, FIB, Qi Card, cards) |
| Localization | Arabic + English, RTL-aware design system, `Asia/Baghdad` dates, IQD |
| Mobile | Capacitor (iOS + Android) from the same `apps/app` codebase |
| Analytics | GTM, GA4, Meta Pixel, TikTok Pixel, server-side conversions |
| Hosting | Vercel (apps) + Cloudflare (DNS, Turnstile, R2) |
| Quality | Biome via Ultracite, TypeScript strict, Vitest, GitHub Actions |

## Structure

```
apps/
  web/        Public website: store catalog, Plus, Academy, Suite, Club, news, events, journal (port 3001)
  app/        Customer app — web + iOS/Android via Capacitor (port 3000)
  api/        Checkout, payment webhooks, cron, Telegram webhook, calendar feed, back-office endpoints (port 3002)
  email/      React Email templates (port 3003)
  docs/       Mintlify documentation (port 3004)
  admin/      Back office for staff: catalog, orders, CRM, finance, editorial (port 3005)
  storybook/  Design-system workbench (port 6006)
packages/
  config/     Project identity, locales and regional settings (single source of truth)
  auth/       Supabase Auth clients, phone OTP, session middleware
  database/   Supabase schema, migrations, RLS tests and generated types
  payments/   Payment-provider interface, Wayl provider, billing (organizations and individuals, store orders)
  commerce/   Catalog queries, prices, governorates, cart totals
  droid/      The Telegram bot and its moderation engine
  design-system/, internationalization/, analytics/, security/, seo/, …
scripts/      Repository checks
```

## Getting started

Prerequisites: Node.js 22+, [Bun](https://bun.sh), and Docker if you want to run
Supabase locally.

```sh
bun install
bun run db:start  # local Supabase with migrations and seed data (Docker)
bun run dev       # starts every app
```

Each app reads its environment from `.env.local` (copy the app's
`.env.example`). Without credentials the apps still start; integrations whose
keys are missing are disabled. Staff sign in to the back office with their
phone and an authenticator app; grant the first superadmin with SQL (see
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
| `bun run build:native` / `bun run cap:sync` | Static export of `apps/app` / copy it into the iOS and Android projects |

## Further reading

- `ARCHITECTURE_AND_INTEGRATIONS.md` — how the apps fit together, and step-by-step
  setup for the template generator, Supabase migrations and RLS, the Capacitor apps,
  tracking, Wayl payments and Vercel environment variables
- `AGENTS.md` — conventions for humans and AI agents
- `.github/CONTRIBUTING.md` — workflow and local checks
- `THIRD_PARTY_NOTICES.md` — licenses of included open-source code

Repository: https://github.com/theideaiq/monorepo · Support: hi@theideaiq.com
