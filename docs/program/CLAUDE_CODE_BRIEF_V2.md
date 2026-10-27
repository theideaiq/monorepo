# Brief for Claude Code: Program Revision v2

The decisions behind this brief are in the **Program Revision v2** document
(The IDEA's shared docs). This file is what the repository needs from it, in
order. Read `AGENTS.md` and `PROGRESS.md` first and follow every repository
rule: logical RTL utilities, every string in the messages files, migrations
with RLS and pgTAP tests, secrets only in `apps/api`, Biome, tests.

There are no customers yet, so renames are straight renames: no redirects,
no compatibility aliases.

Work stage by stage, **one pull request per numbered item**, each green on CI
before the next starts. Record each as a dated decision in `PROGRESS.md` and
update `AGENTS.md` wherever it names a route, app or product that changes.

## What v2 decides (summary)

- **Store becomes a marketplace.** Shops sell in their own name; The IDEA
  collects payment as their disclosed agent through its existing Wayl and
  Boxy accounts and pays them weekly after the 14-day return window, minus
  commission. People sell through The IDEA Space (meet and pay in person) or
  cash on delivery; money from people's sales never passes through The IDEA.
  Auctions for collectibles. "Get offers from shops" replaces Sell to us.
- **Plus** stays The IDEA's service; its catalogue also holds copies lent by
  supplier shops. Single rentals open to shops. No rentals between people.
- **Bulbs:** 1 Bulb = 10 IQD; earn 1% (Plus Glow 2%, Shine 3%, Blaze 4%);
  existing balances × 10; spent in steps of 100; no cash-out, no transfer.
- **Club:** three sections, Join · Read · Yours. Programs (partner camps,
  exchanges, competitions sold as whole packages; xDigital, the online
  exchange; free programs with Notify me) live in Join.
- **The IDEA Space** (University of Technology gate) and **Zaytona** (its food
  brand) are places and brands, not tabs.
- **Pass:** address book, saved payment, payout account, Fill with The IDEA
  Pass on partner sites, organization membership at sign-in.
- **The IDEA Droid** becomes a Telegram manager bot that runs partner bots.
- **Developers:** the docs are served at `api.theideaiq.com`.
- **Dropped:** Arboon, Suwiya, The IGCESE, Hiring, Sell to us.

## Stage 1 — Quick wins (start now)

1. **Developer docs at `api.theideaiq.com`.**
   - Replace the Mintlify starter content in `apps/docs` (`mint.json` still
     says "Starter Kit" and links to Mintlify) with The IDEA's developer
     docs: introduction, Sign in with The IDEA Pass (OpenID Connect, scopes,
     consent, refresh tokens, the card check), registering an app in
     Business → Developers, and the API reference. English first; brand
     colours and logos from `docs/brand`.
   - In `apps/api`, serve the docs site at `/` and its pages by rewrite
     (no redirect). API paths stay where they are: `/oidc/*` must not move
     (it is the issuer partners use), plus `/webhooks/*`, `/cron/*` and the
     existing endpoints. New endpoints go under `/v1/*`.
   - Remove every mention of `docs.theideaiq.com`.
2. **Address book and saved payment in the Pass.**
   - Today orders carry a one-off `shipping_address` (jsonb) and nothing is
     saved. Add a `user_addresses` table (RLS: owner only): label,
     governorate, area, street, nearest landmark, map pin (optional), contact
     phone, default flag. Pass → Settings → Addresses; checkout picks the
     default and offers Change.
   - Saved payment: ask Wayl's API for saved cards (tokens held by Wayl,
     never by us); remember ZainCash and Qi numbers; remember the cash on
     delivery preference. If Wayl has no saved cards, ship the rest and note
     it in `PROGRESS.md`.
   - One-tap checkout: "Deliver to Home · Card ••42 · Place order".
3. **Fill with The IDEA Pass and organization membership at sign-in.**
   - Add the standard OpenID Connect `address` scope and claim (from the
     default address), with the existing per-item consent and revocation.
   - Add an `organizations` scope whose claim lists the person's
     organizations in The IDEA Business and their role, so a partner site
     (The Iraqi Curator) can admit only its staff. Document both in the
     developer docs.
4. **The Club as Join · Read · Yours.**
   - **Join:** events, surveys to answer and (later) programs, one list
     sorted by date or deadline, with filters Events · Programs · Surveys.
   - **Read:** posts in one feed; News, Stories and Guides become topic tags
     (`?topic=`), not sections. Map the existing post sections to tags in a
     migration.
   - **Yours** (signed in): tickets, applications, surveys you created,
     submissions, followed programs. The Telegram rooms become one card at
     the bottom.
   - Update `currentAppPath` for stored links, the e2e journeys and
     `AGENTS.md`.

## Stage 2 — Shops marketplace (starts only after the owner confirms the lawyer's opinion)

Do not start until `PROGRESS.md` records that the agent model has been
confirmed in writing.

5. **Sellers and offers.** A product (the work) gets offers: seller, variant,
   condition, price, stock. "The IDEA" is the first seller and holds today's
   stock. Product pages list offers; cart lines name the offer. Seller
   vetting data (documents, payout account, security deposit) with staff
   approval in the back office.
6. **Seller Central** in The IDEA Business: listings, orders, returns,
   payouts, statements. Pickup requests to Boxy from each shop's address on
   The IDEA's Boxy account.
7. **Agent payouts.** Payment collected on The IDEA's Wayl account is
   recorded per seller; payouts run weekly after the return window, minus
   commission (per category, a setting), refunds and the Bulbs credit.
   Pages say "Sold by [shop] · delivered and paid through The IDEA".
8. **The IDEA Guarantee.** Refunds on valid complaints from The IDEA,
   recovered from the shop's deposit and next payout. Price history on every
   listing; the "…4,750 / …9,750" rule and souq prices only on The IDEA's
   own listings.
9. **Plus supplier shops.** Copies lent by a supplier shop join the Plus
   pool, with per-rental or monthly fees owed to the supplier in Business →
   Supply. Single rentals offered by shops (their own deposit and ID check).
10. **Bulbs v2.** 1 Bulb = 10 IQD, rates 1/2/3/4%, balances × 10 in a
    migration, spending in steps of 100, bonus amounts rescaled.
11. **Remove Hiring** from The IDEA Business.

## Stage 3 — The IDEA Space and partner bots

12. **The IDEA Space** as a pickup point at checkout, the swap point for
    Plus, and the venue for events (address, hours, map).
13. **The IDEA Droid as a manager bot.** Telegram's managed bots
    (https://core.telegram.org/api/bots/managed-bots): the owner turns on bot
    management for The IDEA Droid in BotFather; a partner creates its bot
    through the Droid's managed-bot link (the partner's account owns it); the
    Droid receives the token (`updateManagedBot`, `bots.exportBotToken`) and
    `packages/droid` runs several bots, each with its own name, commands,
    data (separated by organization, RLS) and website connection. Partners
    manage their bot from Business → Developers. First partner: AUIB SAL's
    HudHud (check whether an existing bot can be put under a manager;
    otherwise SAL hands over its token through a secure form).

## Stage 4 — People selling and auctions

14. Listings by people (18+, verified Pass): photos, condition, fixed price
    or offers; meet and pay at The IDEA Space, or cash on delivery paid to
    the seller. Optional paid inspection with the "Checked at The IDEA
    Space" badge. Hidden phone numbers; messages through The IDEA.
15. "Get offers from shops" (replaces Sell to us; delete the old flow).
16. Auctions for collectibles: proxy bidding, reserve, Buy It Now, 2 extra
    minutes for a bid in the last 2 minutes, verified bidders, strikes for
    winners who don't pay, shill-bidding checks.

## Stage 5 — Programs

17. Programs in Join: partner programs sold as whole packages (insurance,
    chaperone for under-18 groups, refund schedule including visa refusal,
    installments, guardian approval, application details reused from the
    Pass, passport scans kept per application and deleted after); partners
    list programs from Business → Programs; free programs (IYLEP, UWC) with
    Notify me reminders and no fees. xDigital ("xDigital · Iraq × China") is
    the first program.

## Not code (owner tasks; keep them in `PROGRESS.md`)

Lawyer's written opinion on the agent model, the shop contract, the Plus
supplier agreement, program packages and travel licensing, the Space's
licenses, Bulbs terms and the SAL–The IDEA agreement; accountant on agent
collections; Wayl (payouts to many accounts, saved cards) and Boxy (pickups
from many shops); shortlist 10–20 shops and 2–3 supplier shops; BotFather
bot management for the Droid; The Iraqi Curator's developer registers under
Developers; first program partners.

## Checks for every pull request

`bun run check`, `typecheck`, `test`, `check:rtl`, `check:i18n`,
`check:placeholders`, `check:unused`, `boundaries`, `db:test` for schema
changes, every build, and the Playwright + axe journeys. Screenshots of
changed screens in Arabic and English, light and dark.
