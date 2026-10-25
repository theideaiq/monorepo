# Progress

The working checklist for launch: what is done, what is left, what needs an
owner's decision. Agents and contributors read this first (see `AGENTS.md`)
and continue from the first unticked item. Tick items as they land; record
decisions with a date.

## Done

- [x] One repository: website, customer app (web + iOS/Android), back office,
      API and Telegram bot on the template base (PR #945).
- [x] The old apps' features rebuilt on the new schema: store, Plus rentals
      with tiers, wishlists, reviews, support tickets, notifications,
      editorial, CRM, marketing, ledger with scenarios, fixed assets, cap
      table (PR #951). Payroll plan, cap table, fixed assets and the own
      email campaigns were retired again on 2026-10-24 (see Decisions).
- [x] v1.0 hardening: advisors at zero, RPC bodies in `private`, structure
      and advisor pgTAP suites; patched Next.js/Storybook/Zod/sharp with
      `bun audit` in CI; strict Turborepo env; Knip; coverage; end-to-end
      journeys; secret scan of client bundles; CodeQL, production migration
      and nightly backup workflows; platform runbooks.

## Launch checklist (needs an owner with access)

- [ ] **Supabase:** `supabase db push` the new migrations (or let
      `migrate.yml` do it once its secrets are set). Turn on TOTP MFA
      (Authentication → Sign In / Providers → Multi-factor) — staff rights
      need an authenticator-app session. Set the Site URL to
      `https://theideaiq.com` (The IDEA Pass lives on the website) and add
      `https://theideaiq.com/**` and `https://spark.theideaiq.com/**` to
      the redirect URLs.
- [ ] **Supabase, email codes (The IDEA Pass sign-in;
      `ARCHITECTURE_AND_INTEGRATIONS.md` 2.7):**
      - Authentication → Sign In / Providers → Email: enabled, Confirm
        email on, Email OTP length `6`, expiration `600` s.
      - Authentication → Sign In / Providers → Phone: **disabled**; no test
        phone numbers.
      - Authentication → Emails → SMTP Settings: custom SMTP, host
        `smtp.resend.com`, port `465`, user `resend`, password = a Resend
        API key (sending access for theideaiq.com, verified in Resend),
        sender `hi@theideaiq.com`, name `The IDEA Pass`.
      - Authentication → Emails → Templates: paste
        `packages/database/supabase/templates/confirmation.html` (Confirm
        signup), `magic_link.html` (Magic Link) and `email_change.html`
        (Change Email Address), with the subjects from `config.toml`.
      - Authentication → Rate Limits: emails per hour to fit the Resend
        plan; then sign up on `/en/sign-up` and check the code arrives.
- [ ] **GitHub → Environments → `production`:** `SUPABASE_ACCESS_TOKEN`,
      `SUPABASE_DB_PASSWORD`, `BACKUP_PASSPHRASE`, optional
      `BACKUP_HEARTBEAT_URL`; repository variable `SUPABASE_PROJECT_REF`
      (`docs/platform/releases.md`).
- [ ] **GitHub → Code security:** switch CodeQL "default setup" off (it
      still lists the obsolete "Analyze (java-kotlin)"); `codeql.yml`
      replaces it.
- [ ] **Vercel: four projects**, each with Node 24, its environment
      variables (section 5 of `ARCHITECTURE_AND_INTEGRATIONS.md`) and "skip
      unaffected projects" on. Optional: `TURBO_TOKEN`/`TURBO_TEAM` for the
      remote cache.
      - `web` (`apps/web`) → `theideaiq.com`
      - `app` (`apps/app`, The IDEA Spark: the back office and The IDEA
        Suite) → `spark.theideaiq.com` (DNS)
      - `api` (`apps/api`) → the API host
      - `storybook` (`apps/storybook`, The IDEA Design) →
        `design.theideaiq.com` (DNS), with `NEXT_PUBLIC_SUPABASE_URL` and
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] **Vercel, retire the old projects:** delete the `admin` and `pass`
      projects (their apps are now `/admin` in Spark and the Pass pages on
      the website);
      redirect any `admin.`/`pass.` DNS to `spark.theideaiq.com` if they
      were ever published. Remove `NEXT_PUBLIC_PASS_URL` and
      `NEXT_PUBLIC_ADMIN_URL` from every project.
- [ ] **Vercel, shared URLs:** on every project set
      `NEXT_PUBLIC_WEB_URL=https://theideaiq.com` (every "Sign in" goes to
      The IDEA Pass there), `NEXT_PUBLIC_APP_URL=https://spark.theideaiq.com`
      and `NEXT_PUBLIC_DESIGN_URL`; set
      `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.theideaiq.com` on web, app and
      storybook (production only).
- [ ] **Vercel, secrets only in `api`:** remove `RESEND_*`, `ARCJET_KEY`,
      `UPSTASH_*` and `BETTERSTACK_*` from the `web` and `app` projects and
      set them on `api`, which serves the contact form (`POST /contact`)
      and the status badge (`GET /status`). Turn on Vercel Firewall bot
      protection for `web` (Arcjet no longer runs there).
- [ ] **Resend newsletters (`ARCHITECTURE_AND_INTEGRATIONS.md` 4.3):**
      create a segment in Resend (Audience → Segments, e.g. "The IDEA
      customers"), set its id as `RESEND_SEGMENT_ID` on the Vercel `api`
      project (with a full-access `RESEND_TOKEN`), then run
      `/cron/newsletter-contacts` once by hand and check the contacts.
      Send newsletters from Resend Broadcasts to that segment only.
- [ ] **Wayl:** production keys and the webhook URL
      (`/webhooks/payments` on the API host).
- [ ] **Telegram:** bot token and webhook (`apps/api/scripts/telegram-setup.ts`).
- [ ] **Domains:** once every subdomain serves HTTPS, submit the apex at
      hstspreload.org (the sites already send the preload header).
- [ ] **First staff member:** they get The IDEA Pass with their email
      (`/ar/sign-up`), then in the SQL editor:
      `insert into staff (user_id, role) select id, 'superadmin' from auth.users where email = '<their email>';`
      they then link an authenticator app on The IDEA Pass and open
      `https://spark.theideaiq.com/ar/admin` (or "Open the back office"
      in My Pass).
- [ ] **Brand v1.0 (after the brand pull request ships):** paste the
      three Supabase auth templates again
      (`packages/database/supabase/templates`, now with the pink header;
      the logo loads from `https://theideaiq.com/brand/lockup-on-pink.png`,
      so the website must be deployed first); run `cap:assets` for the new
      icons and splash; switch every social avatar and the Telegram
      channels (The IDEA Club, The IDEA Post, The IDEA Droid, The IDEA
      Staff) to the new tiles (`docs/brand/BRAND_GUIDELINES.md`, 13).
- [ ] **Google Wallet (optional):** an issuer in the Google Pay & Wallet
      Console and a service account added to it; set
      `GOOGLE_WALLET_ISSUER_ID` and `GOOGLE_WALLET_SERVICE_ACCOUNT` on the
      `api` project (`ARCHITECTURE_AND_INTEGRATIONS.md`, The IDEA Pass →
      Google Wallet). Until then the card has no wallet button.
- [ ] Delete the old branches on `theideaiq/monorepo` (the session's token
      is not allowed to).

## Native apps (the website on iOS/Android)

The shell is in place (Capacitor loading `https://theideaiq.com`,
offline screen, splash/status bar, push, share, app-link files); these
steps need Xcode, Android Studio and the store/Firebase accounts
(`ARCHITECTURE_AND_INTEGRATIONS.md`, section 3).

- [ ] `bun run --cwd apps/web cap:add` and `cap:assets`; commit
      `apps/web/ios` and `apps/web/android`.
- [ ] Firebase project with the iOS and Android apps; APNs key uploaded;
      `GoogleService-Info.plist` / `google-services.json` copied in (not
      committed); `AppDelegate` hands Capacitor the FCM token (3.5).
- [ ] Xcode capabilities: Push Notifications, Background Modes → Remote
      notifications, Associated Domains (`applinks:` and
      `webcredentials:theideaiq.com`); Android `autoVerify` intent
      filter and `allowBackup="false"` (3.3, 3.6).
- [ ] Fill `APPLE_TEAM_ID` and `PLAY_APP_SIGNING_SHA256_FINGERPRINT` in
      `apps/web/public/.well-known/` and verify both URLs return JSON.
- [ ] Vercel `api`: `FCM_SERVICE_ACCOUNT`, `PUSH_WEBHOOK_SECRET`; Supabase
      database webhook on `notifications` inserts →
      `/webhooks/notifications` (3.5).
- [ ] Push and app links tested on a real iPhone and Android phone.
- [ ] Store listings, privacy forms, review notes (a review account's
      email and how its code reaches the reviewer, native features for
      guideline 4.2), TestFlight and internal testing, then submission
      (3.8, 3.9).


- [ ] Staff cannot open a support ticket on a customer's behalf.
- [ ] A staff reply on a closed ticket keeps it closed (by design today;
      decide whether it should reopen).
- [ ] Plan names are stored in English only; Arabic pages show the English
      name.
- [ ] `PRODUCT_CARD_COLUMNS` doesn't select `rental_tier`, so cards can't
      badge tiered rentals.
- [ ] `product_review_list.author_name` should be typed nullable.

- [ ] Brand v1.0 follow-ups: rename The Club / Droid in the legal
      Markdown documents (legal review); store checked market prices
      (price, date, evidence) so SouqPrice can show; remove Poppins from
      `lib/fonts.ts` in the next release.

## Decisions

- 2026-10-24: Four deployments only (web, app, api, design). The app is The
  IDEA Spark at `spark.theideaiq.com`, server-rendered, with The IDEA Pass
  and the back office (`/admin`) inside it; `apps/pass` and `apps/admin`
  are gone, and so are `NEXT_PUBLIC_PASS_URL` and `NEXT_PUBLIC_ADMIN_URL`.
- 2026-10-24: The IDEA Pass signs people in with a 6-digit email code
  (Supabase email OTP, sent through Resend SMTP from hi@theideaiq.com), not
  SMS (no SMS plan). No passwords, no magic links (they break inside the
  iOS/Android shell). Phone sign-in is switched off but its code is kept;
  phone numbers stay as an optional delivery field.
- 2026-10-24: The IDEA keeps its staff-role model (`private.has_staff_role`
  with AAL2); auibsal's permission system was not adopted.
- 2026-10-24: On Arabic pages the site's name (logo, page titles) is ايديا;
  product names (The IDEA Pass, The IDEA Plus, …) keep Latin letters.
- 2026-10-24: The IDEA brand v1.0 (`docs/brand`): Paper ground, Readex
  Pro, pink primary with the yellow bulb, never black in brand blocks.
  Condition bulbs map stored conditions as new → new, open box and
  refurbished → like new, used → used.
- 2026-10-24: Retired from the back office: the payroll plan
  (`staff_plan`), the cap table (`equity_rounds`, `equity_holders`), fixed
  assets (`fixed_assets`, `fixed_asset_schedule()`) and the own email
  campaigns and segments (`marketing_campaigns`, `marketing_segments`,
  `apps/api` `admin/campaigns`, `admin/segments`, `admin/unsubscribe`).
  No data was dropped: the tables moved to the `archive` schema
  (migration `20261120000000_retire_back_office_extras.sql`), which no
  client role can reach. The double-entry ledger, scenarios, payments and
  `financial_settings` stay (the finance dashboard uses its fiscal year).
  The CRM and the customers' marketing opt-in stay. Newsletters are sent
  from Resend Broadcasts; `/cron/newsletter-contacts` syncs every account's
  email, name and opt-in to the `RESEND_SEGMENT_ID` segment and pulls
  Resend unsubscribes back. The back office has no Marketing section any
  more; the marketing role keeps the dashboard and customers (read).
- 2026-10-24: Catalog tools in the back office. **Catalog → Import**
  reads a CSV of the inventory sheet in the browser, previews new, changed,
  unchanged and invalid rows, and applies them in batches through
  `import_products` (catalog staff, AAL2); blank cells never overwrite.
  **Find picture** (product page) and **Find missing pictures**
  (`/admin/catalog/covers`) look covers up on MusicBrainz and the Cover Art
  Archive (records, CDs, cassettes), Open Library (books) and Wikipedia
  (everything else); staff confirm each one. Store search everywhere goes
  through `search_products` (Arabic folded: tashkeel, alef forms, ya and
  ta marbuta; pg_trgm), migration `20261120000200_catalog_tools.sql`.
- 2026-10-24: Megastore delivery: a delivery zone (fee and days) per
  governorate, seeded for all 18 (Baghdad 5,000 IQD; edit them in Catalog →
  Settings), store pickup (off until an address is set) and cash on
  delivery or at pickup (on). Cash orders are confirmed at once and paid
  when staff press **Mark cash collected**. Owner step: set the pickup
  address and hours, and check the zone fees.
- 2026-10-24: **Sell to us** (trade-ins): customers send an item with
  photos from My Pass (`/pass/sell`), staff review it in the back office
  (Trade-ins), make an offer the customer accepts or declines, and can turn
  a completed request into a draft product. Migration
  `20261120000300_trade_ins.sql` (private `trade-ins` bucket). The
  website's store page links to it.
- 2026-10-24: **WhatsApp order updates** through the Meta WhatsApp Cloud
  API for customers who opt in (My Pass → Settings): order confirmed, order
  shipped, rental due soon, trade-in offer. Off until the owner creates the
  templates and sets `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
  (`ARCHITECTURE_AND_INTEGRATIONS.md` 4.4).
- 2026-10-25: **The website and Spark split.** theideaiq.com (`apps/web`)
  holds every customer feature: The IDEA Pass sign-in pages, **My Pass**
  (`/pass`: the membership card, orders, Plus, wishlist, Sell to us,
  events, submissions, support, settings), the cart and checkout, and
  buying, reviews and RSVPs on the public pages. The iOS/Android apps
  load the website. **The IDEA Spark** (`apps/app`) is only for staff (the
  back office) and businesses (The IDEA Suite at `/business`); it has no
  sign-in of its own and sends people to the website's, and its old
  customer paths redirect there. A person's membership is The IDEA Pass:
  the word "account" is never shown. Owner step: Supabase Site URL and
  redirect URLs (above), and `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` on `web`.
- 2026-10-25: **The IDEA Pass card.** My Pass opens with a passport-style
  card: guilloché, a sheen that follows the pointer, a member number and a
  QR code with a code that changes every 30 seconds (TOTP worked out on
  the device, so it works offline and in the apps), the member's perks,
  and "Add to Google Wallet" (same rotating code). Staff check a card in
  Customers → Check a Pass. Migration `20261126000000_pass_card.sql`.
- 2026-10-25: **The IDEA Post.** News, the Journal and the Academy page
  are one publication at `/post` with four sections (News, Stories,
  Members' work, Learn), online only: the PDF journal issues are gone.
  Accepted submissions become Members' work posts with the member's byline
  (back office → Editorial → the submission → Create the post). Migration
  `20261127000000_the_post.sql`.
- 2026-10-25: Next, in order: one shared catalogue with stock per copy
  (condition, purpose, location, cost and price); The Post (News, Journal
  and Academy at `/post`, online only); **Bulbs** (1 Bulb = 100 IQD; tiers
  Glow 3%, Shine 4% from 250,000 IQD, Beam 5% from 750,000 IQD, Blaze 7%
  from 2,000,000 IQD of spend in 12 months; Plus +1%; consoles and laptops
  half; server-written only); invites and affiliates; Telegram sign-in and
  linking (OIDC) with a slimmer Droid; The IDEA Suite workspace.
- 2026-10-25: **English URLs have no prefix.** English is the default
  language and lives at `/` (`/store`, `/pass`); Arabic keeps `/ar`
  (`/ar/store`). Visitors whose browser or saved choice is Arabic are
  sent to `/ar`; old `/en/…` links redirect to the unprefixed page.
  `localePath()` builds every path.
- 2026-10-25: **Shared catalogue.** One product per real thing, with every
  physical copy in `stock_items` (condition, for sale / for rent / used by
  the business, status, location, cost, own price). Stock counts are
  derived from the copies; orders, rentals and trade-ins take and release
  specific copies; product pages offer buy new or used, rent with Plus,
  Sell to us and other formats (`group_key`). Migration
  `20261125000000_stock_copies.sql` turns today's counts into copies.
