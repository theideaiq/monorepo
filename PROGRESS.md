# Progress

The working checklist for launch: what is done, what is left, what needs an
owner's decision. Agents and contributors read this first (see `AGENTS.md`)
and continue from the first unticked item. Tick items as they land; record
decisions with a date.

## Current state (2026-10-27: program revision, step 5f; Sign in with The IDEA Pass)

- The IDEA Partners and Staff (Program Revision v2, item 2): `apps/partners`
  (`partners.theideaiq.com`, port 3000) is the organization dashboard;
  `apps/staff` (`staff.theideaiq.com`, port 3003) is everything The IDEA's
  team uses, with The IDEA Design at `/design`. The website's `/business`
  is now `/partners` ("For partners"). `business.theideaiq.com`,
  `design.theideaiq.com` and `apps/storybook` are gone, with no redirects.
  **To do (owner):** see the Vercel item in the launch checklist.

- Sign in with Google, Apple, Microsoft, Facebook and LinkedIn (buttons
  under the password form; the apps open the provider in the system
  browser and come back by deep link), Settings → Ways to sign in to link
  or remove them, and a university Google Workspace account verifies the
  student at once (migration `20261230000000_social_sign_in.sql`).
  **To do (owner, ARCHITECTURE_AND_INTEGRATIONS.md 2.7 step 8):** set up
  each provider and Supabase's "Allow manual linking", then list them in
  `NEXT_PUBLIC_AUTH_PROVIDERS` on the website. Apple is required in the
  iOS app once Google is offered.

- Passwords are the default way into The IDEA Pass: email and password
  (getting a Pass takes one emailed code; a forgotten password is reset
  with another code; Settings → Password sets or changes it), with "Email
  me a code instead" kept. Cloudflare Turnstile protects the forms once
  configured. **To do (owner, ARCHITECTURE_AND_INTEGRATIONS.md 2.7):** the
  password policy, secure password change and leaked password protection
  in Supabase; paste the Reset Password and Reauthentication templates;
  then the Turnstile site key on Vercel, deploy, and the secret key in
  Supabase.

- Partner self-service (migration `20261229000000_pass_developers.sql`):
  companies register their own Sign in with The IDEA Pass apps in The IDEA
  Partners → Developers (verify a domain, register, test with their own
  members, go live). Sensitive answers (university email, phone, date of
  birth, address, refresh tokens) wait for staff review in Companies →
  Sign in with the Pass (and the inbox); staff can suspend any app. Secrets
  rotate with 24 hours' grace; `private_key_jwt` with uploaded keys.
  **To do:** auibsal.org registers through Developers (invite SAL's
  developer to a SAL company in The IDEA Partners), then review its
  `student_email` request.

- Sign in with The IDEA Pass (migration `20261227000000_pass_sign_in.sql`):
  partner sites sign people in through our own OpenID Connect provider
  (`<API URL>/oidc`); the consent screen is `/oauth/authorize`, and people
  manage sites in Pass → Settings → Connected sites. Partner apps check
  Pass card QR codes (`/oidc/card/check`) and, with consent, show the
  person's card (`/oidc/card`, without the scannable code).
  `PASS_OIDC_SIGNING_KEY` is set on the API (production and preview have
  separate keys). **To do:** an outside security review before a second
  partner. Partner guide: `docs/platform/pass-sign-in.md`.

- Surveys (migration `20261226000000_surveys.sql`): verified students
  create surveys in Club → Yours → Surveys, free (give to get, 10
  credits to start), rewarded in Bulbs from their balance, or rewarded
  and paid in IQD; anyone 18+ with a Pass answers the ones aimed at them.
  Surveys open at once unless the checker flags a sensitive topic or
  someone reports one; those wait in Customers → Surveys. Creators
  download the answers (CSV, Excel, SPSS). **To do:** announce the pilot
  at AUIB; students add their major, year and governorate in Settings
  for targeting.

- Students and partner perks (migration
  `20261225000000_students_and_perks.sql`): members verify as students
  with a university email (an emailed code) or a student card photo that
  support reviews in Customers → Students; the badge lasts until 30 June
  and brings Plus at 20% off (monthly), no deposits for rent and kits,
  and student perks. Partners are organizations in The IDEA Partners with
  perks (Staff → Companies → Perks); their team checks Pass cards and records
  uses (once a day) in The IDEA Partners → Perks. **To do:** check the
  universities' email domains in Customers → Students (seeded from public
  information); add the first partners (an organization each, invited
  from The IDEA Partners) and their perks; emails need `RESEND_FROM` and
  `RESEND_TOKEN` on the API.

- Boxes (migration `20261224000000_boxes.sql`): Store products built from
  parts, in stock while their parts are, priced 10–15% below them. Vinyl
  starter (379,750), Mystery vinyl (154,750) and Reading (54,750) are on
  sale; the customer picks a theme (genre or subject) on the product page
  and staff pack to it in Orders → Boxes to pack. **To do:** switch on the
  Eid, Ramadan nights and Back to university boxes in Catalogue → Boxes
  for their seasons, and add box photos in the product editor.

- Game night kits (migration `20261223000000_game_night_kits.sql`): PS5
  (49,750 with 4 games), Switch party (39,750) and Retro (24,750) for
  Thursday evening to Saturday evening, up to 8 weekends ahead, delivered
  in Baghdad, adults only, Plus Blaze 25% off, with a 100,000 IQD
  refundable deposit staff can waive after checking ID. Booking at
  `/kits/<kit>` from `/plus#kits`. **To do:** add each kit in Rentals →
  Kits when it's ready (none in production yet, so nothing can be booked).

- The IDEA Plus launch (migration `20261222000000_plus_launch.sql`): 60
  places, then a waitlist (the next person in Baghdad is invited
  automatically and has 72 hours to join); joining asks for the area in
  Baghdad (15 areas seeded without delivery days: set them in Rentals →
  Plus places); Plus rentals have no due dates; Saved is the queue; swaps
  are booked from Your Plus (home swaps 1/2/4 a month, extra ones 3,000 IQD,
  counter swaps unlimited) and completed in Rentals → Swaps; annual plans
  (10 months for 12), pause up to 31 days a year, cancel at the period end,
  and plan changes from the next renewal.

- Single-item rent and Keep it (migration `20261221000000_single_rent.sql`):
  rentable items can be rented on their own from the product page
  (`/rent/<slug>`) at the category's rate (games 9,750 for 7 days, books
  3,750 for 14, films 2,750 for 7), with a refundable deposit of half the
  item's price charged at checkout; late fees are worked out per day and
  settled at return on Rentals, and after 14 days late the item is charged
  at its used price. Plus members can keep a rented copy at its used price
  less one month of their plan. Rates and the deposit are in Finance →
  Rental rates.

- Ages (migration `20261220000000_ages.sql`): the Pass is from 13 and asks
  for the date of birth at first sign-in; 13–17-year-olds link a guardian
  signed in with The IDEA Pass who approves each order and The IDEA Plus in
  Settings; PEGI 18 items are hidden from them. Reviews that earned the photo bonus say so.
- The 14 public policies at `/legal/<policy>` (terms, privacy, delivery,
  returns with condition, plus, rewards, selling, club, programs, surveys,
  business, accessibility, security, copyright), with
  `/.well-known/security.txt`.

- Catalogue fixes (migration `20261219000000_catalogue_fixes.sql`): six
  categories (Music, Games, Books, Films, Audio, Tech); prices moved into
  the bands by format and edition (games mostly 59,750, books 14,750 or
  19,750, films 29,750, vinyl 54,750–89,750, CDs 19,750–24,750); the two
  250 IQD prices fixed (A4000 224,750, Frank Ocean – Orange CD 19,750);
  the drafts with a photo and a copy published, the rest still drafts;
  one copy of each Switch game moved to rent; condition shown as four
  plain labels; rental-only items show Rent with "Worth …"; PEGI age
  ratings on every game.

- Money rules (migration `20261218000000_money_rules.sql`): flat Bulbs (3%
  for everyone, Plus Glow 4%, Shine 5%, Blaze 6%; spend tiers gone, nobody lost
  Bulbs); free Baghdad delivery over 150,000 IQD for everyone and on any
  order for Plus Shine and Blaze; a 14-day return window for Bulbs; at most 20% of an order given away; no cash on
  delivery over 500,000 IQD; Plus plans Glow 14,750 (1 item), Shine
  22,750 (2), Blaze 39,750 (4), seeded inactive; Telegram rooms open,
  Pass or Plus; the checkout shows the server's price (`checkout_quote`);
  Finance → Prices checks every copy against a 20% margin floor.

- Products: The IDEA Store (`/`, `/store`), The IDEA Plus (`/plus`), The
  IDEA Club (`/club`) and The IDEA Pass (`/pass`), plus The IDEA Partners
  (`/partners` on the website, the organization dashboard at
  `partners.theideaiq.com`) and The IDEA Droid (the Telegram bot); Staff
  (`staff.theideaiq.com`) is for The IDEA's team. Spark, Suite, Business,
  Megastore, The IDEA Post, Discover, Academy and Launcher are gone as
  names.
- `apps/partners` (package `partners`): the organization pages at its
  root. `apps/staff` (package `staff`): Staff at its root (companies at
  `/companies`) and The IDEA Design at `/design`. `NEXT_PUBLIC_APP_URL` is
  The IDEA Partners; `NEXT_PUBLIC_STAFF_URL` is Staff.
- Website: menu Store · Plus · Club · Pass; `/club/<slug>` replaces
  `/post/…`; `/pass` has four pages (card, orders, bulbs, settings);
  `/saved`, `/help`, `/careers` and `/r/<code>` are new addresses; one
  sign-in page (no `/sign-up`). Old addresses have no redirects; stored
  notification links are mapped by `currentAppPath`/`businessPath`.
- Migration `20261217000000_program_revision_names.sql`: Droid FAQ topics
  general, store, plus, club, business, and `referral_kind(code)`.
- The Spark Catcher mini-game was removed. Telegram handles change in a
  later step.

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

- [ ] **Owner decisions of 2026-10-28** (`docs/program/decisions-2026-10-28.md`):
      SPF, DKIM and DMARC; Meta Business verification; Google Search
      Console and Bing Webmaster Tools; the PCI SAQ A self-assessment; a
      WCAG 2.2 AA accessibility statement; compare digital-code suppliers'
      discounts on the top 10 brands (Reloadly, LikeCard, Golden Codes) and
      record the result here; ask Boxy whether a reverse-pickup order type
      is planned.
- [ ] **Twilio Verify (phone codes):** create a Twilio account and a
      Verify service; set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and
      `TWILIO_VERIFY_SERVICE_SID` on the theideaiq-api Vercel project. For
      WhatsApp, add a WhatsApp sender to the Verify service (needs the
      verified Meta Business); until then codes go by SMS. Once codes
      arrive, turn on Staff → Catalogue → Settings → "Require a verified
      phone for deliveries" so deliveries and Plus homes need one.
- [ ] **Wayl, to check and record here:** whether Plus and Pro can renew
      automatically through Wayl subscriptions; a partial refund in test
      mode, then turn on Staff → Catalog → Delivery → "Refund returns
      through Wayl".

- [ ] **Developer docs:** connect `apps/docs` to Mintlify (mintlify.com →
      new deployment from GitHub, monorepo path `apps/docs`; or `bunx mint
      login` then publish), and in its Custom domain settings turn on
      "Host at" `api.theideaiq.com` with no base path. Then set `DOCS_URL`
      to the deployment's `https://<subdomain>.mintlify.site` on the
      theideaiq-api Vercel project (Production) and redeploy it.

- [ ] **Drafts:** about 140 drafts remain (44 with copies but no photo,
      the rest without copies). Photograph and publish them, or delete
      them, in Staff (Catalog, status Draft).
- [ ] **Prices to check:** consoles, accessories, hi-fi and cameras kept
      their prices (cost plus 10–15% once costs are in); the band moves
      raised the cheapest vinyl to 54,750 and CDs to 19,750 and capped
      vinyl at 89,750, so check box sets and singles. Check that the
      Frank Ocean – Orange CD is an official release before selling it.

- [ ] **Costs:** enter the cost of every copy (Staff → the product →
      copies; all 684 are empty), then fix what Finance → Prices lists.
- [ ] **Money rules:** set the real Wayl fee rate and our delivery cost on
      Finance → Bulbs (3% and 5,000 IQD are placeholders).
- [ ] **Plus launch:** turn on the Glow, Shine and Blaze plans (Catalog →
      Plans) when The IDEA Plus opens.
- [x] **Returns policy:** the 14 public policies in
      `apps/web/content/legal` (returns replaces refund, 14 days; club
      replaces community and conduct), 2026-10-26. Owner step: confirm
      Wayl's refund window and fees.

- [ ] **Delivery with Boxy** (ARCHITECTURE_AND_INTEGRATIONS.md 4.5): Boxy
      key and secret on the `api` project (sandbox first), the pick-up
      location, the webhook with its custom header, `CRON_SECRET` as a
      GitHub Actions secret, then run "Follow Boxy parcels" once to copy
      Boxy's areas.
- [ ] **Supabase:** `supabase db push` the new migrations (or let
      `migrate.yml` do it once its secrets are set). Turn on TOTP MFA
      (Authentication → Sign In / Providers → Multi-factor) — staff rights
      need an authenticator-app session. Set the Site URL to
      `https://theideaiq.com` (The IDEA Pass lives on the website) and add
      `https://theideaiq.com/**`, `https://partners.theideaiq.com/**` and
      `https://staff.theideaiq.com/**` to the redirect URLs.
- [x] **Telegram sign-in** (done 2026-10-27): in @BotFather open the bot →
      Login Widget, add the Redirect URI
      `https://api.theideaiq.com/auth/telegram/callback`, then set
      `TELEGRAM_LOGIN_CLIENT_ID` and `TELEGRAM_LOGIN_CLIENT_SECRET` on the
      Vercel api project. "Continue with Telegram" appears once they're set.
- [ ] **Supabase, email codes (The IDEA Pass sign-in;
      `ARCHITECTURE_AND_INTEGRATIONS.md` 2.7):**
      - Authentication → Sign In / Providers → Email: enabled, Confirm
        email on, Email OTP length `8` (the website's code box takes 8 digits), expiration `600` s.
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
        plan; then sign in on `/sign-in` with a new address and check the
        code arrives.
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
      - `theideaiq-partners` (root directory `apps/partners`, The IDEA
        Partners) → `partners.theideaiq.com` (DNS: a CNAME to Vercel)
      - `api` (`apps/api`) → the API host
      - `theideaiq-staff` (root directory `apps/staff`, Staff and The IDEA
        Design at `/design`; the project that used to serve the design
        site) → `staff.theideaiq.com` (DNS: a CNAME to Vercel)
- [ ] **Vercel, The IDEA Partners and Staff (Program Revision v2, item
      2):** set the root directories (`theideaiq-partners` → `apps/partners`,
      `theideaiq-staff` → `apps/staff`) and the Staff project's environment
      variables (`ARCHITECTURE_AND_INTEGRATIONS.md` 5.5); Claude does this
      at merge. Then delete the `business.` and `design.` DNS records (no
      redirects). Retiring `docs.` stays for item 5.
- [ ] **Vercel, retire the old projects:** delete the `admin` and `pass`
      projects (their apps are now Staff, `staff.theideaiq.com`, and the
      Pass pages on the website);
      remove any `admin.`/`pass.`/`spark.` DNS records if they were ever
      published. Remove `NEXT_PUBLIC_PASS_URL` and
      `NEXT_PUBLIC_ADMIN_URL` from every project.
- [ ] **Vercel, shared URLs:** on every project set
      `NEXT_PUBLIC_WEB_URL=https://theideaiq.com` (every "Sign in" goes to
      The IDEA Pass there) and `NEXT_PUBLIC_APP_URL=https://partners.theideaiq.com`;
      `NEXT_PUBLIC_STAFF_URL=https://staff.theideaiq.com` on web, api and
      staff (an allowed return_to host and CORS origin); set
      `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.theideaiq.com` on web, partners and
      staff (production only). Remove `NEXT_PUBLIC_DESIGN_URL` from every
      project.
- [ ] **Vercel, secrets only in `api`:** remove `RESEND_*`, `ARCJET_KEY`,
      `UPSTASH_*` and `BETTERSTACK_*` from the `web` and `theideaiq-partners` projects and
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
- [x] **Telegram** (done 2026-10-27): on the API project set `TELEGRAM_BOT_TOKEN`,
      `TELEGRAM_WEBHOOK_SECRET` and, for sign-in, `TELEGRAM_LOGIN_CLIENT_ID`
      and `TELEGRAM_LOGIN_CLIENT_SECRET` (Login Widget Allowed URL
      `https://api.theideaiq.com/auth/telegram/callback`); redeploy, then
      Staff → Telegram → Bot → Set up now.
- [x] **Primary domain:** `theideaiq.com` serves the website and
      `www.theideaiq.com` redirects to it (308), as on auibsal.org; every
      setting (`NEXT_PUBLIC_WEB_URL`, Supabase, Google, Telegram, The IDEA
      Pass for partners, app links) uses the bare domain. The API and The
      IDEA Pass accept both in case a redirect flips again.
- [ ] **Domains:** once every subdomain serves HTTPS, submit the apex at
      hstspreload.org (the sites already send the preload header).
- [ ] **Sign-in providers:** Google is on (`NEXT_PUBLIC_AUTH_PROVIDERS=google`
      on the website). Add `apple`, `azure`, `facebook`, `linkedin_oidc`
      there as each is turned on in Supabase (ARCHITECTURE 2.7 step 8).
- [ ] **Leaked password protection:** Supabase → Authentication → Attack
      Protection (the security advisor still flags it).
- [ ] **First staff member:** they get The IDEA Pass with their email
      (`/ar/sign-in`), then in the SQL editor:
      `insert into staff (user_id, role) select id, 'superadmin' from auth.users where email = '<their email>';`
      they then link an authenticator app on The IDEA Pass and open
      `https://staff.theideaiq.com/ar` (or "Open Staff" on their Pass).
- [ ] **Brand v1.0 (after the brand pull request ships):** paste the
      three Supabase auth templates again
      (`packages/database/supabase/templates`, now with the pink header;
      the logo loads from `https://theideaiq.com/brand/lockup-on-pink.png`,
      so the website must be deployed first); run `cap:assets` for the new
      icons and splash; switch every social avatar and the Telegram
      channels (The IDEA Club, The IDEA Droid, The IDEA
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


- [x] Staff open a support ticket on a customer's behalf (customer page →
      Support tickets; `open_support_ticket_for`), 2026-10-25.
- [ ] A staff reply on a closed ticket keeps it closed (by design today;
      decide whether it should reopen).
- [x] Plans have an Arabic name (`plans.name_ar`, back office plan form);
      Arabic pages fall back to the English name while it's empty, 2026-10-25.
- [x] Tiered rentals are badged: rental lists fetch `rental_tier`
      (`getRentals`, `getRentalTiers`, `useRentalTiers`).
- [x] `author_name` is handled as nullable in the website's review types
      (the generated function type can't express it).

- [ ] Brand v1.0 follow-ups: rename The Club / Droid in the legal
      Markdown documents, and the retired names there (Megastore → The
      IDEA Store, The IDEA Suite and The IDEA Business → The IDEA
      Partners, the Academy's programs). (Poppins removed 2026-10-25; the
      souq price was removed 2026-10-28.)

## Decisions

- 2026-10-28: Master brief from the owner, the last word on everything
  decided so far (recorded in `docs/program/decisions-2026-10-28.md`,
  "Master brief"). Where it differs from earlier messages it wins:
  - **Store pickup goes.** No delivery/pickup choice at checkout, no
    `PickupDetails`/`PickupLocation` in `@repo/commerce/catalog`, no pickup
    locations or their Staff settings (removed by a migration). Every
    order, rental, kit and Plus swap is delivered by Boxy; past orders keep
    showing "Picked up".
  - **The sign-in scope `membership` becomes `pass`,** its claims
    `pass_number` and `pass_since`, with no alias. SAL (auibsal.org), the
    only partner using it, is updated in the same change.
  - **`public.memberships` becomes `public.organization_members`,** with
    its indexes, policies, functions (recreated), types, code and tests.
  - **The wordmark is live text:** `BrandLogo` sets "The IDEA" in
    Alexandria 700 at −1% tracking beside the bulb, replacing the outlined
    drawing; the logo files in `docs/brand/logos/` are redrawn in
    Alexandria Bold and replace the apps' copies, the email header and the
    Open Graph image.
  - **Order of work:** clean-ups (store pickup, the live wordmark and the
    redrawn logos, then whatever of the rest is left), the two renames,
    phone verification for every delivery order, the student check,
    selling, payouts, prices, Saved and lists, Bulbs, surveys, catalog,
    Plus features and Team, supply and verification, then Opportunities,
    auctions, Get offers from shops, people selling, textbook resale, Plus
    Duo, digital codes and Apple Wallet. One pull request per item, schema
    first, each green before the next.
- 2026-10-28: Brand update (still v1.0), from the owner with
  `docs/brand/CLAUDE_CODE_BRIEF.md`. `docs/brand/` now holds the updated
  guidelines, design system and tokens, the new `logos/tile-partners.svg`,
  and the designed guidelines and the packaging guide as PDFs; the
  condition bulbs (`logos/condition-*.svg`) are retired. The changes:
  - one palette: pink, yellow, paper and ink for every product; the
    Plus violet, Partners cobalt and Club orange tokens (`plus`,
    `business`, `club`, `on-accent`, `on-accent-warm`), the `plus` button
    variant and the accent badge tones go; status colors are only for
    states;
  - Alexandria replaces Readex Pro and Cairo for Arabic and Latin
    (Readex Pro has no گ, چ, پ or ژ); the logo's wordmark stays an
    outlined drawing;
  - names: Partners, Droid and Staff are always short; full names (The
    IDEA Store, Plus, Club, Pass) in titles and first mentions outside
    our own surfaces, short names inside them; always capitalized; "your
    Pass"; no "membership", "account" or "users". Every "The IDEA
    Partners" in the earlier decisions reads as "Partners";
  - no mascot: Droid's profile photo is `tile-droid.svg`;
  - removed: condition bulbs (condition is four plain labels), SouqPrice,
    boxes and the counter, with their stories;
  - new components (DESIGN_SYSTEM.md section 4.1: offers, auctions, Make
    an offer, Saved, Bulbs, verification, gifts, codes, surveys) and
    updates to the Pass card, plan cards, product cards, header, tabs and
    the footer (desktop only).
  No separate brand pull request: the token, font and name changes and
  the removals go with step 1 (clean-ups); each new component lands, with
  its stories in The IDEA Design, with the feature that uses it.

- 2026-10-28: Further owner decisions, part 2
  (`docs/program/decisions-2026-10-28.md`, given in full after part 1).
  They win where they differ from part 1. Nothing is dropped or postponed;
  each change joins the step it belongs to in the order of work below:
  - step 1 (clean-ups) gains: the counter removed entirely (Staff →
    Counter, counter swaps and any counter sale or pickup code, with
    migrations dropping what only the counter uses; Plus swaps are home
    swaps only, 1/2/4 a month and 3,000 IQD for an extra one); Partners'
    Bulk buying and Plus seats merged into one feature, Team (`/team`,
    Staff → Partners → Team); Microsoft, Facebook and LinkedIn sign-in
    removed (email + password, email code, Google, Apple and Telegram
    stay); no "membership" anywhere (copy in both languages, code names,
    Staff labels: "your Pass" / "The IDEA Pass", "Plus" / "your plan",
    Staff's "Memberships" → "Plus seats").
  - step 3 (selling) gains Make an offer ("Accept offers" on a listing:
    not on digital codes, rentals, Plus, kits, tickets, programs or items
    in a sale or campaign; offers under 60% of the price blocked;
    accept, decline or counter once each way; 48 hours to answer; optional
    automatic accept and decline amounts; an accepted offer sits in the
    buyer's cart at that price for 24 hours; one open offer per listing
    and 3 per seller; The IDEA's own stock declines offers under the
    margin floor).
  - step 7 (Bulbs) becomes one universal earn rate: 2% for everyone and
    3% / 4% / 5% for Plus Glow / Shine / Blaze on everything (The IDEA's
    sales, shop items, rentals, kits, tickets, programs), rounded to whole
    Bulbs; digital codes and Plus fees earn nothing; Gear's commission
    rises to 9% standard / 7% Pro; product pages say "Earn 340 Bulbs" and
    plan cards the plan's rate; Bulbs are spent on purchases and on Plus,
    never sold, cashed out or transferred; the rewards policy follows.
    Surveys become Free and Boosted only (Boosted paid in IQD through an
    order at the reward × 1.1, rewards by median time at 100 Bulbs a
    minute from 200 to 2,000, counting rules, appeals, bias controls,
    perks, privacy and creator rules as recorded); they land with the
    Bulbs step, since they replace the Bulbs-paid survey kinds.
  - Additions, each with the step that owns its area: a review request 3
    days after delivery; a cart reminder after 24 hours (marketing
    consent); Staff → Catalog's empty searches; WhatsApp order updates
    once Meta Business verification is done; key metrics on Staff's home
    page; a check that referral rewards were converted to 1 Bulb = 1 IQD.
  - After step 9, in this order (replacing "digital codes in Stage 6,
    after Opportunities"): Opportunities; auctions (collectible copies,
    proxy bidding, anti-sniping, 48 hours to pay, second chance,
    non-payment strikes; `collectible`, `auctions`, `bids`, `offers`);
    Get offers from shops; people selling; textbooks; the new Plus
    features (pay with Bulbs up to 50% of a month in steps of 250,
    monthly survey credits 10/25/50, early access to campaigns, Plus
    prices on offers, tickets and programs, Plus RSVP 48 hours early and
    Blaze seats, Shine 10% off kits, the queue picked for home swaps,
    tiered and paired partner perks), then Plus Duo (Glow 20,750 · Shine
    31,750 · Blaze 55,750 IQD a month, `plus_members`); digital codes;
    Apple Wallet.
  - Sign in with The IDEA Pass for other sites is offered only to SAL
    until the outside security review is done. Finance (ledger, journal)
    gets no new features. Before store submission, push notifications,
    Google Wallet and the share sheet must work in the native apps
    (Apple guideline 4.2). No legal review is planned: the Iraqi-law and
    "(legal review)" items are removed.
  - Pay with Bulbs and Wayl renewals: Plus doesn't renew through Wayl
    subscriptions at a fixed amount. Billing is invoice-based
    (`packages/payments/billing/service.ts`): the daily
    `/cron/subscriptions` issues a renewal invoice before each period
    ends, paid through a new Wayl checkout link. So Bulbs can apply to
    every renewal (taken off that invoice) as well as to prepaid months.

- 2026-10-28: Selling (item 11), bundles, part 1, the schema
  (`20270112000000_bundles.sql`). A shop lists several of its own items as
  one offer (a turntable and 3 records) with `create_bundle()`: the bundle
  is a product of its own, created by the shop and checked like any
  product a shop creates, and `bundle_items` lists the variants in it and
  how many of each (2 or more units, each item one the shop has an active
  offer on, never a bundle in a bundle). The bundle has its own offer
  (condition, price, copies, SKU), so carts, orders and payouts treat it
  like any product; its copies don't take copies of the items in it, so
  the shop sets how many bundles it has. Contents are fixed once listed.
  Part 2 adds the Partners screen and the bundle's contents on the
  product page.
- 2026-10-28: Selling (item 11), spreadsheet upload. Partners → Selling →
  Listings takes a CSV (or tab-separated text) of up to 500 rows: barcode,
  condition (new if empty), price, quantity and SKU, plus name_en, name_ar
  and category for a barcode nobody has listed. The file is read and
  checked in the browser; each row shows as found, a new product or what
  to fix, and nothing is sent until the shop confirms. Each row is then
  sent on its own (`set_offer()` or `create_listing()`), so one refusal
  doesn't stop the rest. No schema change. The CSV reader Staff's catalog
  import used is now shared (`@repo/commerce/csv`).
- 2026-10-28: Selling (item 11), part 1, the listings schema
  (`20270111000000_listings.sql`). Barcodes are stored as digits (an
  ISBN-10 as its ISBN-13) and stay unique, so a scanned or typed code finds
  one product (`find_by_barcode`). A shop's offer (`seller_offers`: one
  variant in one condition, its price and its own SKU) is set with
  `set_offer()`, which keeps that many available copies at that price and
  retires extras; copies already sold or reserved are untouched. Owners and
  admins of an approved shop list; members see the offers. With no match a
  shop creates the product (`create_listing()`): live at once, a draft if
  it names a banned term (`banned_terms`, staff-edited), and checked for
  missing fields, a photo and likely duplicates (`product_checks`, for
  Staff → Inbox). A barcode already in the catalogue must be picked ("Product
  exists"). Shops never edit products; they flag wrong details
  (`product_flags`). "Notify me" (`product_alerts`) tells a waiting Pass
  once when a copy goes on sale. Bundles, plan limits and commission come
  in later parts; the Partners screens and the Staff inbox items follow in
  part 2.
- 2026-10-28: Selling, returns, part 2. Pass → Orders: delivered lines get
  a Return button (reason, how many, details, photos in the private
  `return-photos` bucket, "unopened" for a change of mind), and the order
  lists its returns with where each is and the refund, withdrawable until
  collection. Partners → Selling → Returns: accept or dispute within 48
  hours, check what came back, confirm refused parcels. Staff → Orders →
  Returns: decide disputes and who is at fault; refunds due are sent the
  way the customer paid (Wayl, or ZainCash, Qi or a transfer) and marked
  with the reference; both are Inbox items. `/cron/selling` (daily) runs
  `sweep_returns`, `sweep_offers` and `refresh_seller_scores`. The returns
  policy describes the request, answers, delivery costs, refused cash
  orders and same-day refunds. Still to come: booking the collection with
  Boxy (the temporary-pickup-location workaround, tried in sandbox first),
  automatic Wayl refunds and the bell notifications for returns.
- 2026-10-28: Selling, return lists for shops
  (`20270126000000_return_lists.sql`). `seller_returns(shop)` lists a
  shop's returns with the item and the customer as "first name · area",
  and `seller_parcels_back(shop)` the parcels refused at the door that it
  must confirm; shops can't read orders, lines or parcels themselves.
- 2026-10-29: Saved, lists and the Plus queue, part 1 (master brief step 8,
  section 12; `20270205000000_saved_lists_queue.sql`). Pass → Saved has
  three tabs. Saved: everything hearted, each with its state (Price
  dropped · In stock · Out now · Rentable now · Coming soon · Unavailable),
  filter chips (All · On sale · In stock · Coming soon), a sort (recently
  saved, price), "Tell me" (on by default, with an optional price target)
  and Add to cart, Add to queue, Move to list and Remove. Lists: named
  lists, private or shared by link (`/lists/<token>` shows the list's
  name, the owner's first name and its products). Queue (Plus members):
  its own table now, copied from each Plus member's rentable saved items;
  rentable product pages have Add to queue, and swaps take from the top.
  The bell tells of the first copy in stock ("Back in stock", or "Out now"
  within 14 days of a release date, which Staff set on the product) and of
  lower prices (under the target, when set).
- 2026-10-29: Saved, part 2 (step 8). The cart has "Save for later" (the
  line moves to Saved). Signed out, the heart works too: hearts are kept
  in the browser and move into Saved at sign-in. "Notify me" saves the
  product with "Tell me" on instead of writing `product_alerts`, which a
  later migration drops once this is live. Still to come in step 8: Send
  as a gift from a shared list (with the gift checkout, section 11).
- 2026-10-29: Bulbs, part 1 (master brief step 9, section 16;
  `20270207000000_bulbs_one_iqd.sql`). 1 Bulb = 1 IQD: every balance,
  bonus and Bulbs amount was multiplied by 100, so nobody lost value. One
  rate, 2% for everyone and 3% / 4% / 5% for Plus Glow / Shine / Blaze, on
  what is paid for goods (shop items too), rentals, keeps and kits,
  rounded to whole Bulbs; Plus fees, deposits and surveys earn nothing.
  Bulbs are spent in steps of 250, at least 1,000 an order. Bonuses: first
  order 2,000, invite 5,000, birthday 2,500, photo review 500, event
  check-in 1,000, Telegram link 1,000. Until part 2 (the website and Staff)
  ships, screens still show the old value of a Bulb.
- 2026-10-29: Bulbs, part 2 (step 9). The website, Staff and Droid show a
  Bulb as 1 IQD: product pages say "Earn 195 Bulbs" (at the member's rate,
  the store's when signed out), Plus plan cards show their rate, checkout
  spends from 1,000 Bulbs in steps of 250 ("Using 2,250 Bulbs = 2,250 IQD
  off"), staff adjust up to 10,000,000 at a time, and the rewards policy
  and every bonus in the copy follow.
- 2026-10-29: Surveys, part 1 (master brief step 10, section 20;
  `20270208000000_surveys_boosted.sql`). Surveys are Free or Boosted: the
  Bulbs and cash kinds are gone (open Bulbs surveys run out under the old
  rules; cash surveys became Boosted). A Boosted survey is paid in IQD by
  an order (the reward × 1.1 per response), opens for 60 days and refunds
  what it didn't use through Wayl when that is at least 1,000 IQD. Rewards
  are 100 Bulbs a minute (200 to 2,000), estimated from the questions and
  reset to the median after 10 counted responses; a higher median pauses
  collection until the creator pays the difference. A response doesn't
  count with 2+ failed attention checks or under a third of the median
  time; the respondent can appeal once (support decides). Respondents can
  delete a submitted response while the survey is open (the reward
  stays), and closing early still pays whoever started in the last hour.
  The code: the builder offers Free or Boosted with the time estimate and
  reward; the start screen shows the reward, the time, the check
  questions and the counting rules; after answering, members see whether
  it counted (and why not, with one appeal) and can delete their answers;
  creators accept a higher reward and pay the difference from Club →
  Yours and see their refund; Staff → Customers → Surveys decides
  appeals (an Inbox item); the daily selling cron closes surveys past 60
  days and refunds Boosted ones through Wayl; the survey terms follow.
- 2026-10-29: Student verification for partners (owner, 2026-10-29), a
  separate service (`20270213000000_student_verifications.sql`): a
  partner's backend starts one with its app credentials
  (`POST /v1/student-verifications`) and sends the student to
  theideaiq.com/verify/<id> (redirect, popup, or `?embed=1` from its
  verified domains), who comes back to the partner afterwards. A Pass with
  a valid badge shares it in one tap; anyone else uses the university
  email and an emailed 8-digit code (5 a day per address, Upstash) or a
  student card / enrollment proof checked in Staff → Customers →
  Students (Inbox), deleted after review. One per partner per person,
  until 30 June; partners get only the status, university and
  valid_until (`GET /v1/student-verifications/<id>` and a signed webhook
  set in Partners → Developers). The confirmation email links to deleting
  it. The shared student check (one-time checks, in-person codes, the
  `student_check` answer) is gone from the apps; a cleanup migration drops
  its tables. Returns now refund the original delivery fee when the return
  isn't the customer's doing (`20270212000100_return_delivery_fee.sql`); a
  shop at fault pays it from its payout.
- 2026-10-29: Pass → Settings → Student verification has "Remove student
  status" (verified or waiting for review): the badge goes and a waiting
  card is withdrawn; partners' own verifications stay. Part 3 of
  `docs/program/decisions-2026-10-28.md` records the partner verification
  and delivery-fee decisions.
- 2026-10-29: Catalog, part 1 (master brief step 11;
  `20270215000000_category_families.sql`). Categories can sit one level
  under a top-level one: Comics & manga and Textbooks under Books. New
  Board games (rentable, in Plus too, at the games rate) and Trading cards.
  The store shows top-level chips and the chosen category's subcategories;
  a parent's filter and search include them. Staff → Catalog → Categories
  picks the parent; the product forms (Staff, Partners) list subcategories
  as "Books › Comics & manga". Next: rent up to 3 for one delivery fee,
  textbook semesters, one cart, Send as a gift.
- 2026-10-29: Catalog, part 2 (step 11; `20270216000000_rent_together.sql`).
  Up to 3 films, books or games (board games and Books' subcategories
  included) rent together in one order for one delivery fee
  (`create_rentals_order`, priced by `rentals_quote`): the rent checkout
  has "Rent more for the same delivery". Rentals get the zone's
  free-delivery threshold on the rent (deposits don't count), as
  purchases do. Gear and music still rent one at a time.
- 2026-10-29: Catalog, part 3 (step 11; `20270217000000_textbook_terms.sql`).
  Textbooks rent for the term: Staff → Finance → Rentals sets the terms
  (names and dates) and marks a category's rate "For the term". A
  textbook rented now is priced for, and due at the end of, the current
  term (or the next one starting within 30 days); between terms it can't
  be rented. The rent checkout shows "until <date>". **To do (owner):**
  enter this year's terms in Staff before textbooks go on sale. Textbook
  resale between students is step 14.
- 2026-10-29: Catalog, part 4 (step 11; `20270218000000_gifts.sql`). Send
  as a gift: at checkout, "Send as a gift" replaces the address with where
  it goes (the area sets the delivery fee), a message and "Hide the
  price"; gifts are paid online or with Bulbs. The order's page shares the
  gift link (a new link replaces the old one). The recipient opens
  `/gift/<link>`, sees who it's from, the message and what's inside, signs
  in and gives their own address in that area; nothing ships until then
  (Staff shows "Gift · waiting for the address" and holds the order). The
  recipient finds it under Pass → Orders → Gifts for you and hears when it
  ships and arrives; the buyer hears when it's accepted and sees only the
  area. Staff's order page shows the message to put in the parcel and
  whether prices stay out. Gifting Plus or other non-physical items is
  still to come.
- 2026-10-29: Catalog, part 5 (step 11; `20270219000000_one_cart.sql`). One
  cart: "Rent it" on a product page puts the rental in the cart beside
  what's bought (up to 3 rentals, several only films, books and games),
  and everything checks out in one order with one delivery fee. The cart
  shows each rental's days and deposit, with refundable deposits on their
  own line; free delivery counts what's bought and the rent, not the
  deposits; invite and coupon discounts apply to what's bought; Bulbs pay
  anything but deposits. A cart with a rental can't be sent as a gift.
  The separate rent checkout (`/rent/<item>`) still works for old links.
- 2026-10-29: Catalog, part 6 (step 11; `20270220000000_cart_kits.sql`). A
  game night kit goes in the cart too: the kit page (weekend, extra days,
  the PS5 kit's games) now ends in "Add to cart", and the kit checks out
  with everything else in one order (delivered in Baghdad; on its own,
  free as before). The cart shows its weekend and deposit; a cart with a
  kit or a rental can't be sent as a gift. One cart now holds everything
  bought once that exists today; tickets, programs and digital codes join
  when they're built, and gifting Plus months is still to come.
- 2026-10-29: Catalog, part 7 (step 11; `20270221000000_plus_gifts.sql`).
  Plus months as a gift: "Give Plus" on the Plus page puts 1, 3, 6 or 12
  prepaid months of a monthly plan in the cart, and they always check out
  with Send as a gift (alone, with no area or delivery fee, or with other
  things). The recipient claims them from the link without an address:
  without Plus, it starts at once (as joining allows) and ends with the
  gift unless they keep it; with Plus, each renewal uses a gifted month
  instead of an invoice (the renewal job calls `use_plus_gift_month`
  first). Gifted months count for no free delivery, discount, cap or
  cashback; Bulbs pay up to half of one month. The cart badge now counts
  the kit and Plus months too. Step 11 is done.
- 2026-10-29: Verification, part 3 (step 13, code): Pass → Settings has a
  Verification card (`#verification`): the identity check (both sides of
  the National Card and a selfie, uploaded to the private `verifications`
  bucket) and the educator badge, by a staff email code (`POST
  /pass/educator-code` in apps/api, the student code email in its educator
  wording) or a staff card or letter for review. The four outcome
  notifications have copy. Staff's review screens come next.
- 2026-10-29: Verification, parts 1 and 2 (step 13; schema
  `20270227000000_identity_educators.sql`, `20270228000000_shop_org_verification.sql`).
  Identity checks (National Card both sides and a selfie, reviewed by
  support, only the name and date kept), the educator badge (staff email
  code or documents; every student perk, "Educator" on the Pass card),
  shop kinds (registered: no limits; individual trader: a monthly sales
  limit from Staff, checked on every order line) and organization
  verification (a verified domain at once, or an official letter;
  student societies add their university's approval and are always
  reviewed). The screens follow once production has the migrations.
- 2026-10-29: Plus features, part 4 (step 12; `20270225000000_perk_tiers.sql`).
  Partner perks can be for given Plus tiers (Glow, Shine, Blaze), and two
  perks of the same partner can be paired (a student and a Plus version):
  a member sees the better one they can use. Pass → partner perks shows
  which tier or badge opens a closed perk; Staff → Partners → Perks sets
  the tiers and pairs.
- 2026-10-29: Plus features, part 3 (step 12; `20270224000000_club_plus.sql`).
  Club RSVPs open at a set time (48 hours after an event is published,
  or its start if sooner; Staff can change it on the event), and Plus
  members can RSVP before then. Events can hold Blaze seats; any still
  free are released 24 hours before the start. The event page shows
  when RSVPs open, and that Plus gets in early.
- 2026-10-29: Plus features, part 2 (step 12; `20270223000000_plus_bulbs_credits.sql`).
  Your Plus → Manage has "Use Bulbs on my next renewal": in steps of 250,
  up to half of a month's price; the renewal invoice comes down by them and
  they're spent once it's paid. Each Baghdad month, `/cron/plus-credits`
  (apps/api, daily) gives Plus members their free survey credits (Glow 10,
  Shine 25, Blaze 50; a store setting), and one last set when Plus ends.
- 2026-10-29: Plus features, part 1 (step 12; `20270222000000_plus_prices.sql`).
  Plus prices: shops (Partners → Selling → Sales) and editors (Staff →
  Catalog, The IDEA's own stock) set a price for Plus members below the
  listing's, paid by the shop, as with student prices. Plus members see
  "Plus price" on the product page and pay it at checkout; a campaign's
  discount reaches them 24 hours before it opens (48 for Blaze). Shine
  gets 10% off game night kits (Blaze 25%). The plan cards and the Plus
  policy list the features per tier once step 12's parts are in.
- 2026-10-29: Surveys, part 2 (step 10; `20270209000000_surveys_bias.sql`).
  Bias controls: trusted respondents (20 counted answers, no failed check
  in the last 10) see Boosted surveys 24 hours early and fill at most half
  the target then, taking turns (one who answered early elsewhere in the
  last day waits); at most 5 Boosted surveys a day each; Boosted surveys
  need a phone no other Pass has verified (once `require_verified_phone`
  is on with Twilio); creators cap the share from one university, major,
  year or governorate; "Who answered" gives the counts, the median time
  and the respondents by targeting field, hiding groups under 5. The
  thresholds are store settings. The code: the builder takes quotas; the
  results page has the "Who answered" box with the note that respondents
  aren't a random sample of Iraq; Club → Join says when a phone of one's
  own is needed, when today's Boosted limit is reached and when someone is
  a trusted respondent; Staff → Catalog → Settings holds the thresholds.
- 2026-10-29: Surveys, part 3 (step 10; `20270210000000_surveys_trust.sql`).
  Every survey shows who runs it and why (academic, market or community
  research), needed to publish; academic surveys on sensitive topics need
  the ethics reference; deception studies need it and a debrief, shown
  only after submitting, and are always reviewed; the checker also flags
  advertising. Respondents see a results summary when a survey closes (no
  count under 5; academic surveys may turn it off), earn a contributor
  badge on the Pass card at 10, 50 and 200 counted answers, and print a
  participation certificate (`/club/surveys/certificate`, titles and dates,
  never answers). Raw answers are deleted 24 months after closing (up to
  120 with an ethics reference), with a bell notice 30 days before. The
  builder warns that free text can identify people; exports carry "Who
  answered" (a second Excel sheet and its own CSV) and say they're for the
  stated purpose only. Check questions' answers come from
  `survey_attention_answers()`; a follow-up migration hides
  `survey_questions.attention_answer` from respondents.
- 2026-10-29: Prices, part 5 (master brief step 7, section 9;
  `20270204000000_student_prices.sql`). Shops set a student price on any
  listing in Partners → Selling → Sales and deals (below its price; the
  shop pays the difference), and editors set them on The IDEA's own
  copies from the product's page in Staff (above the margin floor). Only
  verified students see it ("Student price" on the product page, never
  struck through) and pay it at checkout when it is lower than the price,
  sale or quantity deal; it never joins an accepted offer and stays out of
  price history. The cart shows the usual price; checkout's total is the
  student's. Educators join when the educator badge ships (section 21).
  Step 7 (prices) is done.
- 2026-10-29: Prices, part 4 (master brief step 7, section 9;
  `20270203000000_coupons.sql`). Staff → Finance → Coupons creates codes
  The IDEA pays for (a share up to 20% or an amount off, an optional most
  it takes off and smallest order, dates in Baghdad time, uses in all and
  per Pass) and turns them on or off; each shows how many orders used it.
  Members enter a code at checkout under the summary: it replaces a
  friend's invite only when it takes off more, the 20% giveaway cap still
  holds, and a code that isn't taken off says why. The receipt labels the
  discount "Coupon". Shops are paid on their full prices. Still to come in
  step 7: student prices.
- 2026-10-28: Prices, part 3 (master brief step 7, section 9;
  `20270202000000_campaigns.sql`). Staff → Catalog → Campaigns creates
  seasonal campaigns (names, description, dates in Baghdad time, up to 60
  days) and publishes them. Approved shops take part from Partners →
  Selling → Sales and deals with their own 5–50% off every listing, and
  can change it or leave until the campaign ends. A campaign price is a
  sale (the lower of a listing's own sale and its campaign price), so
  checkout, offers, price history and "was" prices follow it. The
  campaign page is `/store/campaigns/<slug>`, without struck-through
  prices. Each product's page in Staff now has Sales and deals for The
  IDEA's own copies (above the margin floor). Still to come in step 7:
  coupons within the 20% cap, student prices.
- 2026-10-28: Prices, part 2 (master brief step 7, section 9;
  `20270201000000_shop_sales.sql`). Partners → Selling → Sales and deals:
  a listing's sale price between two days (never overlapping; every copy
  costs the sale price while it runs, so checkout, offers and price history
  follow it) and quantity deals (a share off each copy from 2 to 20
  copies, the best one applying at checkout, never with an accepted
  offer). A listing on sale takes no offers. Product pages show when a sale
  ends and the listing's deals. The selling cron records the prices sales
  leave behind (`sweep_listing_sales`). The IDEA's own sales and deals
  (editors, above the margin floor) are in the schema; their Staff screen
  comes with campaigns.
- 2026-10-28: Prices, part 1 (master brief step 7, section 9;
  `20270131000000_price_history.sql`). Every listing keeps a price history
  (`price_history`). Product pages list offers cheapest first with "Lowest
  price" marked, and show each listing's lowest price in the last 30 days.
  A struck-through "was" price is worked out, never typed: only a price the
  listing held for 15 of the last 30 days, above today's
  (`product_variants.compare_at_price` follows it; the selling cron ages it
  out with `refresh_was_prices`). Staff forms show it read-only, and the
  spreadsheet import no longer has a compare-at column. A listing with a
  "was" price is on sale and takes no offers. Still to come in step 7: campaigns,
  coupons within the 20% cap, student prices.
- 2026-10-28: Payouts (master brief step 6, section 8;
  `20270130000000_payouts.sql`). Finance → Payouts prepares the weekly batch
  (`prepare_payouts`): each approved shop owed more than it owes gets a
  pending payout with a statement line per item whose 14-day return window
  closed with no return open (its payout after commission, less any quantity
  refunded), less Boxy's fee for returns at the shop's fault and each Pro
  month or year begun. Download the batch as CSV, transfer by bank, ZainCash
  or Qi, then mark each paid with the reference (`mark_payout_paid`), or
  cancel one so its lines wait for the next batch; pending payouts are an
  Inbox item. Partners → Selling → Payouts shows each payout and its
  statement. Bulbs spent on a shop's item are The IDEA's: the shop is paid
  as if the full price was paid (to confirm with the owner).
- 2026-10-28: Selling, returns and offers, part 3. Support marks returns
  The IDEA collected by hand back at the shop (Staff → Orders → Returns,
  "Collected by hand"; `staff_mark_return_received`). The customer's bell
  follows each return (accepted, not accepted, refund on its way, refund
  sent; `notify_return_status`) and the seller's answers to offers. Make
  an offer has its screens: the product page, Pass → Saved → Your offers,
  Partners → Selling → Offers (answer within 48 hours, choose which listings
  take offers and automatic amounts) and Staff → Catalog → Offers for The
  IDEA's stock (Inbox item; each product's page sets which copies take
  offers). Refunds of returns paid online can go out through Wayl each
  morning (`/cron/selling`: `claim_return_refunds` → Wayl →
  `record_return_refund`, or `release_return_refund` for finance to send by
  hand), behind Staff → Catalog → Delivery → "Refund returns through Wayl",
  off until a partial refund has worked in Wayl's test mode. Still to come:
  booking the collection with Boxy.
- 2026-10-28: Selling, Make an offer, the schema
  (`20270125000000_offers.sql`; master brief step 5, section 14 without
  auctions). A listing (seller, variant, condition) takes offers when its
  shop's owners or admins, or Staff for The IDEA's stock, turn it on
  (`offer_settings`, `set_offer_settings`), optionally with an amount that
  accepts at once and one that declines. Never on items on sale (a
  compare-at price), rentals or anything not a sale copy.
  `offerable_listings()` tells the product page which listings take offers
  and the lowest offer (60% of the price, `store_settings.offer_floor_rate`).
  `make_offer()` allows one open offer per listing and 3 per seller; The
  IDEA's stock declines offers below its margin floor. `answer_offer()`:
  the seller accepts, declines or counters, the buyer answers a counter;
  one counter each way, 48 hours per move (`sweep_offers()` expires them).
  An accepted offer puts one copy in the buyer's cart at that price for 24
  hours (`price_checkout`), and ordering it marks the offer purchased. The
  buyer gets a bell notification for the seller's answer. Part 2: the
  product page, Pass → Saved (offers), Partners → Selling → Offers and
  Staff for The IDEA's stock, with the bell copy for offer events.
- 2026-10-28: Selling, shop orders, part 2. Partners → Selling gains
  Orders (`/selling/orders`: lines to pack with their ready-by time, the
  customer as "Ali · Karrada" and the payout; choose lines, the branch and
  the parcel size and press Ready for pickup; Out of stock; Print label
  until collected) and Pickup (`/selling/pickup`: branches with the pickup
  contact, area and map point, saved in Boxy). apps/api saves branches in
  Boxy (`/v1/selling/locations/sync`), sends one parcel per order from the
  branch with one pick-up request (`/v1/selling/ready`) and serves labels
  (`/v1/selling/label`). Orders go out in one parcel per seller: cash
  parcels collect their lines' share of the total, the first carries the
  delivery fee, and the order is shipped or delivered once all its
  parcels are. Staff → Orders → Shop lines lists late lines and refunds
  due (both in the Inbox); finance marks refunds done. The selling terms
  and privacy policy say the label carries the buyer's name, phone and
  address and how shops may use them.
- 2026-10-28: Selling, returns, the schema
  (`20270124000000_returns.sql`; master brief step 5, section 6).
  `returns`: a customer asks within 14 days of delivery
  (`request_return`), with a reason and photos (the private
  `return-photos` bucket); changed mind needs the item unopened, a wrong
  item is approved at once and a parcel that never arrived is refunded
  without collection. The shop accepts or disputes within 48 hours
  (`respond_to_return`; support answers for The IDEA's own stock), and
  silence accepts. Support decides disputes and who is at fault
  (`decide_return`). apps/api books the collection (a shipment with
  `return_id`), stores Boxy's fee and marks it back
  (`mark_return_received`). The shop then checks it within 48 hours
  (`confirm_return_condition`; silence means it's fine), and the refund
  falls due. That's the line's share of the goods paid, less the return
  delivery for changed mind; Bulbs spent come back and the line's cashback
  goes. Finance marks cash refunds paid (`mark_return_refunded`) and
  apps/api records Wayl refunds. `sweep_returns()` applies the deadlines
  (cron). A refused parcel, once the shop confirms it's back
  (`confirm_parcel_back`), cancels its lines. After 3 refused cash
  orders a Pass pays online (`store_settings.refused_cash_limit`,
  `must_pay_online()`, enforced on new orders). `sellers.score` (valid
  returns, out of stock and late lines over 90 days) is refreshed nightly
  (`refresh_seller_scores`). Part 2: the screens, Boxy collection (the
  temporary-pickup-location workaround, tried in sandbox first), Wayl
  refunds and the returns policy page.
- 2026-10-28: Selling, shop orders, the schema
  (`20270123000000_shop_orders.sql`; master brief step 5, section 5).
  `seller_locations` are a shop's pickup locations (one per branch, with
  the pickup contact the courier calls and its Boxy area), edited by its
  owners and admins; apps/api creates each in Boxy and stores its uid
  (Boxy's API has no update, so an edited branch becomes a new Boxy
  location). A shop's order line now
  waits, is readied at a branch, is picked up, or is out of stock
  (`order_items.seller_status`), due 2 days after the order is confirmed or
  paid (`ready_by`); a cancelled order cancels its open shop lines.
  `seller_order_lines()` is what Partners shows (order number, item,
  condition, quantity, price, payout, "Ali · Karrada", ready-by), never the
  phone, address or email. `mark_lines_ready()` readies lines at a branch
  Boxy knows and returns the orders for apps/api to send; an order has one
  live parcel per seller (`shipments.seller_id`, `location_id`).
  `mark_line_out_of_stock()` cancels a waiting line and retires its copy;
  finance marks paid lines refunded (`mark_line_refunded`). Part 2: the
  Partners screens, Boxy pickup locations, labels and pickups, and the
  late-lines and refunds items in Staff → Inbox.
- 2026-10-28: Selling, commission and plans, the schema
  (`20270122000000_seller_plans.sql`; master brief step 5, section 7).
  `commission_rates` holds each category's standard and Pro rate (Books,
  Music and Films 12% / 10%, Games 10% / 8%, Gear 9% / 7%), public to read
  and edited by finance staff; a new category starts at 12% / 10%. Shops
  are on `free` (up to 100 active listings, enforced on `seller_offers`)
  or `pro` (unlimited, the Pro rate; 49,750 IQD a month or 497,500 a year
  from payouts, `seller_plan_price()`), changed by the shop's owners and
  admins or finance with `set_seller_plan()`; going back to Free needs 100
  or fewer active listings. Each shop's order line keeps its rate, the
  commission and the payout after it (`order_items.commission_rate`,
  `commission`, `seller_payout`), fixed when ordered; The IDEA's own stock
  pays none. Pro's promoted-listing credit, seller API and full insights
  come with those features.
- 2026-10-28: The student check, part 2. theideaiq.com/verify ("Verify
  you're a student", no menus): signed out, the university and its email
  sign in with the emailed code and verify at once, or any email plus a
  card photo; signed in, the existing university-email code or card. A
  bare Pass then chooses "Just this once" or "Keep it for a year"; the
  result shows the student code (8 characters, `K7M2-QX9P`, with a QR of
  `STUDENT:<code>`), valid 24 hours, and "Delete your student status"
  (`POST /pass/student-status` deletes a bare Pass with it). Partners →
  Perks checks a student code like a Pass card (verified, university,
  until). `student_check` is a sign-in answer (consent, discovery, Staff
  and Partners → Developers, docs). `/cron/student-checks` runs the daily
  sweep.
- 2026-10-28: The student check, part 1, the schema
  (`20270121000000_student_check.sql`; master brief step 4). On
  theideaiq.com/verify a student signs in with their university email
  (the sign-in code proves it: `claim_student_from_email`) or any email
  plus a card photo. A Pass made there is bare (`profiles.student_only`,
  `begin_student_check`): no onboarding, and it becomes a full Pass once
  it gets a name, an order or a plan. Then the student chooses
  (`finish_student_check(keep)`): a one-time check removes the badge, or
  they keep it for the year (prices, Plus at 20% off, perks). Each check
  is a `student_checks` row with an 8-character code valid 24 hours;
  Partners checks it in person with `partner_check` (verified, university,
  until; no name). The `student_check` sign-in answer gives a partner the
  same. `forget_student_status` deletes "Your student status" (the API
  deletes a bare Pass with it); `sweep_student_checks` (daily) forgets
  checks after 30 days and lists bare Passes to delete. At most 5
  one-time checks a month per university email. The page, the API and
  Partners follow in part 2.
- 2026-10-28: Phone verification, part 1, the schema
  (`20270110000000_verified_phones.sql`). `verified_phones` holds the
  numbers a Pass proved with a code; only the API adds rows (after Twilio
  approves the code) and owners read and remove theirs. A number the Pass
  signed in with by SMS counts as verified too. With
  `store_settings.require_verified_phone` on, a customer's own delivery
  orders and Plus home need a verified number ("Verify your phone number
  first"); orders staff or scheduled jobs make (Plus swaps) aren't
  checked, since the Plus home they go to is. Off until Twilio is
  configured. Part 2 adds the API endpoints and the verify step.
- 2026-10-28: Phone verification, master brief step 3. The check
  already covers every delivery order (cash or paid online), rentals and
  kits included, and Plus homes; codes now go to Iraqi mobiles only
  (+964 7…), other numbers get "Codes go to Iraqi mobile numbers only".
  It turns on with Staff → Catalogue → Settings once Twilio Verify is set
  up (launch checklist).
- 2026-10-28: Owner decisions on selling and related points
  (`docs/program/decisions-2026-10-28.md`, given in full). They replace
  the earlier open questions and, where they differ, the v2 brief: Bulbs
  become 1 Bulb = 1 IQD (not 10 IQD), The IDEA Space is left out (nothing
  built, no mention in copy), boxes go entirely (shop bundles replace
  them), the souq price goes, Audio and Tech merge into Gear. Order of
  work, schema first and one PR each, every item green before the next:
  1. Clean-ups: The IDEA Space out of copy; the souq price removed (code,
     then the migration dropping its columns); boxes removed (code, then
     the migration deleting them, order lines keep their names); Audio +
     Tech → Gear; header with the Saved heart, no footer on phones, About
     & help in My Pass, version on /about (section 11 layout).
  2. Phone verification (one-time code to an Iraqi number), required for
     every delivery order. Codes go through Twilio Verify, WhatsApp first
     with SMS as the fallback (owner's choice, 2026-10-28).
  3. Selling (item 11): listings by ISBN/barcode or title (pick or create,
     product data filled in, automatic checks to Staff → Inbox, flags,
     spreadsheet upload, bundles, shop SKU, offers-only visibility with
     Notify me); shop orders with Boxy pickup locations, labels and
     pickups (no customer contact on Partners screens); returns;
     commission per category and the Free/Pro plans.
  4. Payouts (item 12): weekly batch, statements per line, Bulbs credit,
     Pro fee from payouts.
  5. Prices (section 7): price history, lowest in 30 days, honest "was"
     prices, shop sales and quantity deals, campaigns, coupons in the cap,
     student prices.
  6. Saved, lists and the Plus queue (section 10).
  7. Bulbs at 1 Bulb = 1 IQD (section 12), with the rewards policy.
  8. Catalogue (section 9): rent up to 3 for one delivery fee, textbooks,
     new categories, Send as a gift, one cart (section 11).
  9. Then item 13 (Plus supplier shops, kits lent by shops), Stages 3–5
     (identity, shop and organization verification, educators with their
     stages), and connections and imports with the stage that needs each
     (section 14). Digital codes move later (part 2, below).

- 2026-10-28: Program Revision v2, item 10 (sellers and offers), part 2,
  the code:
  - Website: the product page lists every offer (seller, condition,
    price, copies) and a shop's offer says "Sold by <shop> · delivered and
    paid through The IDEA"; cart lines carry `seller_id` (one line per
    product, variant, seller and condition) and are priced from their
    offer, as `create_order()` does; the cart and the order name the shop.
  - The IDEA Partners → Selling (`/selling`, the `selling` feature):
    owners and admins apply with the shop's name, upload documents (to the
    organization's Storage folder; staff read them through migration
    `20270108000000`) and enter payout bank details; members see the
    status and the review note. Linked to the selling policy.
  - Staff → Partners → Shops (`/partners/shops`): applications with their
    documents (signed links) and payout details; staff approve, reject or
    suspend with a note and set the security deposit (`decide_seller`).
  - Not yet: shop listings, orders, returns and payouts (item 11). The
    stock counts on products still include every seller's copies.

- 2026-10-28: Program Revision v2, item 10 (sellers and offers), part 1,
  the schema (migration `20270107000000`):
  - `sellers`: The IDEA (the house seller, fixed id
    `00000000-0000-4000-8000-000000000001`, holding today's stock) and
    shops, one per organization in The IDEA Partners, `pending` →
    `approved` / `rejected` / `suspended`. Visitors see approved sellers;
    members see their organization's application.
  - `seller_details`: documents (under the organization's Storage
    folder), payout bank details, the security deposit and the review
    note, for the organization's owners and admins and for staff. Owners
    and admins apply (`apply_to_sell`) and edit documents and payout
    details; staff decide (`decide_seller`) and set the deposit.
  - An offer is a seller's available copies of one variant in one
    condition: `stock_items`, `cart_items` and `order_items` gain
    `seller_id` (The IDEA by default; order lines also keep
    `seller_name`), `product_offers()` returns the seller, and checkout
    takes copies from the line's seller only, and only while it is
    approved. Kept as copies rather than a separate offers table, so
    The IDEA's per-copy stock, costs and the stock counts work unchanged.
  - Partners gains the `selling` section. Part 2 (website, Partners →
    Selling, Staff review) follows once this migration has run.

- 2026-10-28: Program Revision v2, item 9 (policies): 14 at
  `/legal/<policy>`. Condition and warranty is merged into Returns, which
  gains the refund for items not as described (shop items are refunded by
  The IDEA and recovered from the shop's deposit and next payout; no
  branded guarantee) and makes opened media returnable when not as
  described. New: Selling (shops selling in their own name with The IDEA
  as payment agent, weekly payouts after the return window, deposits;
  people selling at The IDEA Space or cash on delivery, never through The
  IDEA; Get offers from shops; auctions), opening in stages, and Programs
  (packages, guardian approval, installments, passport scans deleted
  after, refunds by notice period, visa refusal refunded minus costs
  actually paid and unrecoverable, free partner programs with Notify me).
  Business now describes The IDEA Partners (perks, bulk buying, team Plus,
  developers, shops and Pro, suppliers, opportunities). Terms, privacy,
  Plus, surveys, club and security follow (links, The IDEA Partners, the
  new hosts, selling and passport data). **Bulb values and rates stay as
  the site applies them today** (1 Bulb = 100 IQD, 3% and Plus 4/5/6%,
  survey rewards 2–10): the rewards page and those figures change with
  the Bulbs v2 migration (item 14), together with the code. Figures the
  brief leaves open (commission, deposit, Pro price, inspection fee,
  refund schedules) are "shown in Partners" or on the program page until
  set. Delivery per seller, The IDEA Space pickup and supplier copies in
  Plus are written into their policies with those stages.

- 2026-10-28: Program Revision v2, item 8 (The Club as Join · Read ·
  Yours), part 1, the schema (migration `20270106000000`): posts carry
  topic tags (`posts.topics`, `post_topic`: news, stories, guides), one
  to five each, for the Read feed's `?topic=`. Sections map to topics:
  news → news, stories and members' work → stories, learn → guides.
  `section` stays until the website and Staff stop reading it (part 2);
  until then a post saved without topics takes them from its section, and
  a later migration drops it. Opportunities (and following them) arrive
  with Stage 5, so Join starts with events and surveys.
  - Part 2, the website and Staff: `/club` is Join (`#join`, events and
    the surveys open to the member in one list, soonest date or deadline
    first, open-ended surveys last; chips Everything · Events · Surveys
    with `?show=`), Read (`#read`, chips by topic with `?topic=`) and Yours
    (`#yours`: tickets, the surveys you created with a receipt link when
    an order paid for one, submissions), then the Telegram card. Surveys
    to answer moved from Yours to Join. Staff tags posts with topics
    (checkboxes, at least one). Stored `/post/<section>` and
    `/club?show=news|stories|guides` links open the topic
    (`currentAppPath`). No redirects.

- 2026-10-28: Program Revision v2, item 7 (sign-in scopes), part 1, the
  schema (migration `20270105000000`):
  - `address` now comes from the person's default address in the address
    book (item 6), and only without one from their latest delivery.
    People still tick it on the consent screen, item by item.
  - New `organizations` answer: the person's organizations in The IDEA
    Partners and their role (`owner`, `admin`, `member`), with `app_owner`
    marking the organization that owns the app, so a partner such as The
    Iraqi Curator can admit only its own staff. It is sensitive (staff
    review it before a live app may ask) and is `[]` for people in none.
  - Part 2 offers it in Partners → Developers, Staff and on the consent
    screen (and in discovery), and documents both: the developer docs'
    Scopes page has an "Admitting only your staff" example, and the
    OpenAPI `Claims` schema an `Organization` list.

- 2026-10-28: Program Revision v2, item 6 (address book and saved
  payment), part 1, the schema (migration `20270104000000`):
  - `user_addresses` (RLS: the owner only): label, name, phone, delivery
    zone and governorate, area, street, nearest landmark, map pin (inside
    Iraq), default. At most 10 each; the first is the default, making one
    the default unsets the others, and removing the default promotes the
    newest.
  - `profiles.checkout_payment`: how the person last paid (online or cash on
    delivery); checkout starts there.
  - Orders keep the landmark and the map pin (`create_order`).
  - **No saved cards:** Wayl's API (`api.thewayl.com/openapi.v1.json`) only
    makes payment links, products and refunds; there are no card tokens,
    customers or recurring charges, and we never store cards ourselves.
    **No ZainCash or Qi numbers either:** a Wayl link takes no customer
    details (people type their number on Wayl's page), so a stored number
    would be personal data nothing uses. Revisit if Wayl adds tokens or we
    integrate a wallet directly.
  - Part 2, the website: Pass → Settings → Addresses (add, edit, remove,
    make default, nearest landmark, "Pin my location"); checkout starts
    with the default address shown briefly ("Edit" opens the form) and
    the way the member last paid, so it's one tap: "Deliver to Home · Pay
    online", then Place order. Another saved address or "A new address"
    is one tap away, and a new one can be saved for next time. Orders
    carry the landmark and the pin to the courier.

- 2026-10-28: Program Revision v2, item 5: developer docs at
  `api.theideaiq.com`. `apps/docs` (Mintlify, now `docs.json`) holds The
  IDEA's own docs: Introduction, Quickstart, Sign in with The IDEA Pass
  (overview, scopes, consent, tokens, client authentication), the Pass card
  (showing it, the live card on your site, door checks), registering an app,
  and an API reference from `api-reference/openapi.json`. The Mintlify
  starter content is gone. `apps/api` serves the docs at its root with
  fallback rewrites (`lib/docs.ts`) once `DOCS_URL` is set: every API route
  answers first, and the API's own path prefixes (`/oidc`, `/webhooks`,
  `/cron`, `/v1`, …) never fall through to the docs. No `docs.theideaiq.com`.
  Partner bots get their page with Stage 3, when they exist. Owner steps are
  in the launch checklist.
- 2026-10-28: Code ships after its schema. Merging #1029 deployed the
  website about seven minutes before its migration ran, and Your Pass
  showed "We couldn't load this page" until it did: the organization query
  named the new `organizations.features` column. Code that reads a new
  column, table or function now merges after its migration (AGENTS.md,
  Database standards).

- 2026-10-28: Program Revision v2, item 4: Partners and Staff menus.
  - **Partners:** a sidebar with the organization switcher at the top,
    then Home · Perks · Bulk buying · Developers · Organization (the bell
    stays in the top bar). An organization switches sections on with
    "Add" on Home and off in Organization → Sections (owners and admins;
    `organizations.features`, migration `20270103000000`). Organizations
    already using Perks, Bulk buying or Developers keep them, and staff
    adding a perk switches Perks on. Developers stays for owners and
    admins. Selling, Supply and Opportunities join the list when Stages
    2–5 build them.
  - **Renames, no redirects:** Procurement is Bulk buying (`/bulk-buying`);
    Members, The IDEA Plus, Plan, Invoices and the settings are tabs of
    Organization (`/organization/…`). Links already stored in
    notifications (`/business/procurement/…`, `/business/invoices`) open
    the new pages through `businessPath`.
  - **Staff:** one menu, Inbox (with Support) · Catalog (with Reviews) ·
    Orders and delivery · Rentals and Plus · Customers · Club (with
    Telegram) · Partners · The IDEA Space (the counter) · Finance ·
    Settings (staff, with the audit log). Pages moved with it:
    `/companies` → `/partners`, `/counter` → `/space`, `/editorial` →
    `/club`, `/telegram` → `/club/telegram`, `/reviews` →
    `/catalog/reviews`, `/staff` → `/settings`, `/audit` →
    `/settings/audit`. Each entry opens the first part the role can read
    (support's Club opens Telegram). Sellers and payouts comes with
    selling.

- 2026-10-27: The live Pass card on partner sites (requested by AUIB
  Society of Arts and Letters). `/pass/embed?client_id=…` shows only the
  live card (QR, code, countdown) for the member who allowed the site in
  that browser; only the app's verified domains may frame it
  (`frame-ancestors`). It's the `card_embed` answer in Developers:
  reviewed like the sensitive answers, open in testing. No session or
  card secret ever enters the frame: a popup on theideaiq.com hands it a
  revocable token (hash stored, 90 days from last use) and the codes are
  computed in the database. Members see and stop these sites in Pass →
  Settings; disconnecting a site stops it too. No new OpenID scope.

- 2026-10-27: Sign in with The IDEA Pass remembers consent. A member who
  already shared everything a site asks for (`pass_connections.scopes`)
  goes straight back to it signed in; the consent screen shows the first
  time, when the site asks for something new, or with `prompt=consent`
  (`login` too). `prompt=none` returns `consent_required` instead of
  showing it. Disconnecting a site in Settings asks again next time.

- 2026-10-27: Program Revision v2, item 3: navigation without repeats on
  the website. Each place has one way in:
  - **Top bar.** Phones: logo · search · bell · cart (the tabs carry
    Store · Plus · Club · Pass). Wider screens: logo · Store · Plus · Club
    · search · bell · cart · Pass avatar. "For business", the header's
    language and theme switches, the phone menu and the heart are gone.
  - **Bell** only in the top bar and only when signed in; page titles of
    Your Pass no longer carry it.
  - **Cart** on the Store and Plus screens, and anywhere while it holds
    items; hidden on sign-in and checkout.
  - **Saved** moved from `/saved` to Your Pass → Saved (`/pass/saved`), no
    redirect; the heart stays on products and the Plus queue reads the
    same list. Pass reads Pass (card with the Bulbs balance, orders,
    rentals and events on the way; the featured products left, the Store
    has its tab) · Orders · Saved · Bulbs · Settings.
  - **Preferences** left About: members change language and theme in
    Settings, visitors in the footer.
  - **Footer**, now on every screen: For partners · About · Careers · Help
    · Legal, language and theme, Telegram, copyright and version; Store,
    Plus, Club and Pass are no longer repeated there.
  - **One search** at `/search?q=`: products for sale and to rent
    (`search_products`), Club events and posts by title. The search boxes
    on the Store home, `/store` and Plus are gone; `/store?q=` and
    `/plus?q=` remain as the "All results" lists.
  - Deferred to their items: Selling in Your Pass (Stage 4), the
    footer's Developers link (item 5, docs at api.theideaiq.com), Visit
    The IDEA Space (item 15) and opportunities in search (when they
    exist).

- 2026-10-27: Program Revision v2, item 2: The IDEA Partners and Staff.
  Two apps, two hosts:
  - **The IDEA Business is renamed The IDEA Partners.** `apps/business` is
    `apps/partners` (package `partners`, port 3000,
    `partners.theideaiq.com`) and holds only the organization dashboard
    (`app/[locale]/(business)`: `/`, `/procurement`, `/invoices`, `/plus`,
    `/perks`, `/developers`, `/members`, `/billing`, `/settings`, `/new`,
    `/documents/<kind>/<id>`, invitations), no Staff code. The website's
    `/business` is `/partners` ("For partners").
  - **Staff is its own app**, `apps/staff` (package `staff`, port 3003,
    `staff.theideaiq.com`): the former back office at its root
    (`app/[locale]/(console)`, `/no-access` in `app/[locale]/(auth)`); the
    internal name `admin` stays in the code, and people see "Staff"
    ("Back office" is gone). Staff sign in through The IDEA Pass with
    `return_to` back to `NEXT_PUBLIC_STAFF_URL`, need an AAL2 session, and
    Staff loads no analytics.
  - **Rename without redirects:** `business.theideaiq.com`,
    `design.theideaiq.com` and `/business` on the website are gone, with
    no redirects (stored notification links are still mapped by
    `businessPath`).
  - **The design site moved into Staff:** Storybook's source and
    configuration are in `apps/staff` (`.storybook`, `stories/`,
    `assets/`), built into `public/design` and served at
    `staff.theideaiq.com/design` behind the same staff check
    (`lib/design-gate.ts`); `apps/storybook` is gone.
  - **Shared code only through packages:** the Pass card scan parser is
    `@repo/auth/pass-code` (`scannedPass`), the language and theme switches
    `@repo/internationalization/controls` (`LanguageSwitcher`,
    `ThemeToggle`); no imports across apps.
  - **Env and Vercel:** `NEXT_PUBLIC_STAFF_URL` (production
    `https://staff.theideaiq.com`, local `http://localhost:3003`, so the
    Pass's localhost cookie signs staff in) replaces
    `NEXT_PUBLIC_DESIGN_URL`; it is an allowed return_to host and an
    allowed CORS origin of the API. `NEXT_PUBLIC_APP_URL` is The IDEA
    Partners. Vercel project `theideaiq-partners` (root directory
    `apps/partners`, partners.theideaiq.com) and `theideaiq-staff` (root
    directory `apps/staff`, staff.theideaiq.com; the design site's
    project, reused); no project deleted. CI builds api, partners, staff
    and web, and e2e starts all four.

- 2026-10-27: Program Revision v2, item 1: what v2 drops (migration
  `20270101000000_v2_removals.sql`). There are no customers yet, so the
  tables were dropped outright, with no redirects or aliases:
  - Sell to us (trade-ins): `/pass/orders#sell`, Staff → Trade-ins,
    `trade_ins`, the `trade-ins` bucket, the WhatsApp `trade_in_offer`
    template, the 10 Bulbs for a completed trade-in and trade-in copies.
  - Affiliates: `/r/<code>` is a member's invite only (10% off the first
    order, at most 15,000 IQD) and `/pass/bulbs#invite` keeps only the
    invite card; Back office → Affiliates, `affiliates`,
    `affiliate_attributions`, `affiliate_commissions`, `payouts`,
    `orders.affiliate_id`, `subscriptions.affiliate_id`,
    `product_categories.affiliate_rate`, `AffiliateToucher` and the code
    at checkout are gone; `orders.discount_source` is only `'invite'`.
  - Boxes: no new boxes (RLS refuses them; `add_launch_boxes()` is
    dropped). The existing ones sell until their parts sell out, when
    `sync_box_stock` archives them; Catalog → Boxes and Orders → Boxes to
    pack stay while any are left.
  - Hiring: The IDEA Business's `/hiring`, Back office → Companies →
    Hiring, `job_requests`, `candidates`, the `candidates` bucket, the
    `candidate_proposed` notification, `decide_candidate` and
    `close_job_request`. The IDEA Business is procurement and team Plus.
  - IQD-paid surveys: respondents earn Bulbs only; the "cash" kind is
    relabelled as Bulbs rewards the creator buys from The IDEA with IQD.
  - Microsoft, Facebook and LinkedIn sign-in: the options are email and
    password (with "email me a code"), Google, Apple and Telegram, with
    instant student verification for university Google accounts.
  - The Teal and Lime design tokens; `--chart-4` is Club Orange.
  - The half-rate Bulbs rule (`store_settings.bulb_half_from`) and every
    per-product and per-category `bulb_multiplier`: Bulbs are a flat rate
    (the store's, or the Plus plan's) on the item subtotal;
    `set_money_rules(rules jsonb)` takes one argument and Finance → Bulbs
    edits only the money rules.

  `'trade_in'` stays as an unused label in the `notification_kind` and
  `bulb_kind` enums, since Postgres can't drop enum labels.

- 2026-10-27: The bare domain is primary on every site (theideaiq.com,
  auibsal.org); `www` redirects to it with a 308. Vercel's dashboard
  suggests the opposite, for DNS reasons that don't apply with
  Cloudflare's CNAME flattening, and every setting already used the bare
  domain. Passwords follow Supabase's strictest rule (lowercase,
  uppercase, digit and symbol; `packages/auth/password.ts` checks the
  same).
- 2026-10-27: Program revision v1, step 6 (Telegram names): the channel
  is "The IDEA • ايديا" @theideaiq, the group "The IDEA Club" @theideaiq_club
  with seven rooms (The Stage, The Lounge, The Arcade, Vibe Check, The
  Library, The Studio, The Office) and the bot "The IDEA Droid"
  @theideaiq_bot. The old @theideaclub and @TheIdeaDroidBot addresses no
  longer exist, so links in the code, the content files and the 20
  published posts (migration `20261231000000_telegram_handles.sql`) moved
  to the new ones.
- 2026-10-27: Sign in with The IDEA Pass is built now, piloted with
  auibsal.org only. Partners may ask for name and email and yes/no
  answers (verified student with university and end date, 18 or over,
  The IDEA Plus member), with consent each time. It runs on our own
  OpenID Connect provider in apps/api: Supabase Auth's OAuth server
  (beta) was tested and rejected, because its tokens let a partner change
  the person's password. Partners also check Pass card QR codes from
  their own apps (showing the card is the consent; every check is listed
  for the holder) and may show the person's card, without its code.

- 2026-10-27: Program revision v1, step 5f (surveys): three kinds, free
  give-to-get, Bulbs-rewarded and cash-rewarded; any verified student
  can create surveys; only flagged (sensitive topics) and reported
  surveys are reviewed, the rest open straight away; major, year of study
  and governorate are asked once, optionally, and kept on the student
  badge.

- 2026-10-27: Program revision v1, step 5e (students and perks): partners
  check cards from their Business dashboard and record each use; a
  verified Student badge is the "verified Pass" that skips the rent and
  kit deposits; AUIB plus Baghdad's main universities are listed at
  launch; one use per perk per person per day.

- 2026-10-27: Program revision v1, step 5d (boxes): a box is built from
  parts (fixed products plus slots staff fill), in stock while its parts
  are, and priced 10–15% below them; the customer picks a theme at
  checkout and staff pack to at least the stated value; launch boxes are
  Vinyl starter, Mystery vinyl and Reading, with seasonal Eid, Ramadan
  nights and Back to university boxes created switched off.

- 2026-10-26: Program revision v1, step 5c (kits): a 100,000 IQD deposit
  at checkout that staff can waive after checking ID (verified Passes skip
  it once student verification lands); each physical kit is a unit in the
  back office and the PS5 kit's games are held from the rental copies;
  bookings up to 8 weekends ahead.

- 2026-10-26: Program revision v1, step 5b (Plus launch): waitlist places
  go to the next person automatically (72-hour invites; staff can also
  invite); swaps are booked by the member (what goes back, what comes next
  from the queue); joining asks for the area in Baghdad, other governorates
  wait; annual plans, pause, cancel at period end and plan change at
  renewal are in. Paying Plus with Bulbs and the 20% student price come
  later (the student price with student verification, step 5e).

- 2026-10-26: Program revision v1, step 5a: the single-rent deposit is
  charged at checkout (an order line) and refunded by staff after return,
  less late fees; late fees are worked out by the database and settled at
  return, not charged automatically. Step 5 ships as one PR per feature.

- 2026-10-26: Program revision v1, step 4: guardians confirm signed in with
  The IDEA Pass of their own (not a phone code: no SMS provider, and an adult Pass is harder
  to fake); the 14 policies are published as final, not marked as drafts.

- 2026-10-26: Program revision v1, step 3 (catalogue): six categories;
  prices set from the bands directly (no review list), accepting that
  edition, language and release dates are partly guessed; only drafts with
  a photo and a copy published, the others kept; the 250 IQD placeholders
  priced (A4000 224,750; the Orange CD 19,750 by the CD band, not the
  79,750 first suggested for vinyl); one of each Switch game's three
  copies moved to rent; conditions as four plain labels without the bulb.

- 2026-10-26: Program revision v1, step 2 (money rules): Bulbs are a flat
  rate (3%; Plus Glow 4%, Shine 5%, Blaze 6%), half on consoles, laptops
  and anything over 500,000 IQD; spend tiers and the Plus +1% bonus are
  gone. Free delivery is per zone (Baghdad over 150,000 IQD; Plus Shine
  and Blaze on any Baghdad order); other governorates keep their fees.
  The return window is 14 days. At most 20% of an order is given away;
  orders over 500,000 IQD are paid online or at pickup. Prices must keep
  a 20% margin after the payment fee, delivery and the largest discount.

- 2026-10-25: Catalogue reshape (variants, part 3; migration
  `20261216000000`): 604 products became 542 titles, with formats,
  platforms and colours as variants and open-box and used items as copies.
  The 7 open-box copies priced at or above new now cost 75% of new, down to
  the next …4,750 / …9,750 step. The 16 titles sold and rented are one
  shop product each with copies for rent; Vinyl and CDs became Music and
  the rental categories folded into Games, Books and Films. Old `-cd`,
  `-vinyl`, `-open-box` and `-rental` addresses stop working (no
  redirects). The first-catalog import statements and workflow were
  removed, since re-running them would undo this.

- 2026-10-25: Purchases are delivered by Boxy, sent by staff from the order
  page (size, fragile) and collected by Boxy's pick-up; customers keep
  paying The IDEA's zone fees and store pickup stays. Rental deliveries are
  undecided.
- 2026-10-25: Variants instead of "(CD)" / "(Vinyl)" products. One product
  per work with a variant per version (format, platform, colour, edition);
  condition stays on each copy; titles sold and rented become one product;
  "CDs and cassettes" and "Vinyl" merge into Music with a Format filter; the
  old `-cd` / `-vinyl` / `-open-box` addresses are not redirected.
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
  Condition bulbs mapped stored conditions to three bulbs (replaced on
  2026-10-26 by four plain labels).
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
- 2026-10-25: **Bulbs (earning).** Cashback in Bulbs on delivered orders by
  tier (Glow 3%, Shine 4% from 250,000 IQD, Beam 5% from 750,000 IQD,
  Blaze 7% from 2,000,000 IQD in 12 months; Plus +1%; laptops half),
  pending for 7 days; a 20-Bulb first-order bonus; trade-ins paid in Bulbs
  at +20% plus a 10-Bulb bonus; expiry after 12 months without activity.
  The Pass card changes colour with the tier. My Pass → Bulbs; support
  adjusts on the customer page; finance edits rates in Finance → Bulbs.
  Not yet:
  the birthday gift (no birthday on profiles), the photo-review and event
  check-in bonuses (no photos or check-ins yet), Telegram's bonus (with
  Telegram sign-in). Migration `20261128000000_bulbs.sql`.
- 2026-10-25: **Bulbs (spending).** Bulbs pay up to the whole order at
  checkout, delivery included (100 IQD each); an order paid in full with
  Bulbs needs no payment page, and a cancelled order gives them back.
  Shine delivers free from 50,000 IQD, Beam and Blaze always (Finance →
  Bulbs). Not yet: Bulbs for Plus payments. Migration
  `20261129000000_bulbs_checkout.sql`.
- 2026-10-25: **Invite friends.** Each member's link
  (`theideaiq.com/i/<code>`, on My Pass → Bulbs) gives a new member 10% off
  their first order (up to 15,000 IQD); the inviter earns 50 Bulbs once it
  is delivered, up to 20 a month, never for orders sharing their phone or
  address. Migration `20261130000000_referrals.sql`. Next: affiliates.
- 2026-10-25: **Affiliates.** Members apply on My Pass → Affiliate;
  marketing approves them with a code (Back office → Affiliates). Their
  link (`theideaiq.com/a/<code>`) or code at checkout gives followers 5%
  off for 30 days (the last one used counts; a typed code beats a link;
  the larger of an invite and the affiliate discount applies). They earn
  8% on vinyl, CDs and books and 3% on the rest (finance sets the rate per
  category) once an order is delivered and its 7-day return window has
  passed, plus 20% of a new Plus member's first 3 months; refunds are
  voided or clawed back. Finance pays monthly from 25,000 IQD by ZainCash,
  FIB, Qi or bank transfer, or as Bulbs worth 20% more. Migration
  `20261201000000_affiliates.sql`. Next: Telegram sign-in and a slimmer
  Droid.
- 2026-10-25: **Telegram sign-in.** "Continue with Telegram" on The IDEA
  Pass sign-in pages (Telegram's OpenID Connect, run by the API). A linked
  account signs straight in; a new one signs in once with an email code
  (receipts and recovery) and is linked. My Pass → Settings connects or
  disconnects Telegram; connecting the first time earns 10 Bulbs. Hidden
  until `TELEGRAM_LOGIN_CLIENT_ID`/`SECRET` are set. Migration
  `20261202000000_telegram_login.sql`. Next: the slimmer Droid and Club
  join approvals.
- 2026-10-25: **A slimmer Droid.** The menu now has Track my order, My
  Bulbs and Talk to us (a support ticket) for members who linked Telegram,
  plus store search, FAQ, The IDEA Plus, links and the newsletter; inline
  search shares products in any chat. Removed: the word filter and spam
  engine, flood muting, `/ban` across groups, unban requests, welcomes and
  the AI assistant (and `packages/ai` with its `AI_*` keys); Telegram's own
  tools moderate The Club. Legal pages updated to match. Owner steps:
  @BotFather → /setinline for the bot, then `bun run --cwd apps/api
  telegram:setup`. Next: Club join approvals by tier and order updates on
  Telegram.
- 2026-10-25: **The Club's join rules and order updates on Telegram.**
  Each chat Droid runs has a join rule (anyone, The IDEA Pass members who
  linked Telegram, or a Bulbs tier and up; Back office → Telegram → Chats);
  Droid approves join requests that pass and tells the others how to
  qualify. Notifications (order updates, support replies…) also reach
  members who linked Telegram as a Droid message with a button to the page.
  Owner steps: in each Club room, make Droid an admin that can add
  members and turn on "Approve new members" for its invite link; set the
  rule in the back office; re-run `bun run --cwd apps/api telegram:setup`.
  Migration `20261203000000_telegram_club.sql`. Next: the Mini App and
  automatic topic posts, then The IDEA Suite workspace.
- 2026-10-25: **The Mini App.** The Droid's menu has "Shop the store" and
  the chat's menu button opens the website inside Telegram (`/tg`): a
  linked Telegram account signs straight in to The IDEA Pass, a new one is
  linked to the member signed in (or offered to connect, or to browse as a
  guest), then on to the store, in Arabic for Arabic Telegram apps. Owner
  steps: re-run `bun run --cwd apps/api telegram:setup` (with
  `NEXT_PUBLIC_WEB_URL` set) to add the menu button; optionally register it
  in @BotFather → Bot Settings → Configure Mini App with
  `https://theideaiq.com/tg`. No new secrets: it uses the bot's token.
  Next: automatic topic posts.
- 2026-10-25: **The website as an app, part 1: the storefront.** Home is
  now the shop: a Buy | Rent switch, search, category chips, the member's
  Bulbs and orders on the way (or a nudge to get The IDEA Pass), featured
  and new products, a way into rentals, events and The IDEA Post. `/rent`
  is the rental storefront (with the plan each item needs and "plans from
  … a month"); `/discover` gathers The IDEA Club, events and The IDEA Post.
  The company's pages moved under `/about` (careers, FAQ, contact; old
  links redirect); `/suite` stays where it is. Next: the app layout (bottom
  tabs on phones, slim header, home-screen install, no accidental zoom).
- 2026-10-25: **The website as an app, part 2: the layout.** On phones,
  tabs along the bottom (Shop, Rent, Discover, Cart with its count, My
  Pass; hidden during sign-in, checkout and onboarding) replace the
  footer's links; added to the home screen, the site opens full screen
  (web app manifest, Apple web-app tags) and fits around the notch and
  home bar. Pinch zoom stays (iOS ignores a lock and it fails
  accessibility), but nothing zooms by itself: form fields are 16px on
  touch screens and double-tap zoom is off. No tap flash, no rubber-band
  bounce when installed, sideways rows without scrollbars, and a loading
  placeholder instead of a blank page.
- 2026-10-25: **Automatic posts to the Club's topics.** Droid posts The
  IDEA Post's news, upcoming events and new arrivals (several at once as one
  list) to the forum topics set per chat in Back office → Telegram → Chats,
  in Arabic or English. Owner steps: in Supabase → Database → Webhooks, add
  a webhook on INSERT into `public.telegram_posts` that POSTs to
  `https://api.theideaiq.com/webhooks/telegram-posts` with the header
  `Authorization: Bearer <PUSH_WEBHOOK_SECRET>` (like the notifications
  webhook); Droid must be an admin that can post in those topics; fill in
  the topic IDs in the back office. Migration
  `20261204000000_telegram_posts.sql`. Next: The IDEA Suite workspace.
- 2026-10-25: **Fixes: sign-in codes, pictures, rentals.** Production emails
  8-digit codes but the website's code box took 6, so every code failed;
  it now takes 8 (local config too). Sign-up still emails a link instead of
  a code until `confirmation.html` is pasted as the "Confirm signup"
  template, and links land on Spark until the Site URL is
  `https://theideaiq.com` (launch checklist). "Find missing pictures"
  found nothing (its empty-array filter never matched); fixed. Product
  pictures now show whole in a square tile (no cropping), so covers,
  posters, box art and photos line up. Rentals no longer show a condition.
- 2026-10-25: **More ways to earn Bulbs.** The IDEA Plus payments earn
  cashback at the member's rate, usable at once (refunds void it); 25 Bulbs
  on the member's birthday (set once in My Pass → Settings; support
  corrects it), with a notification; 5 Bulbs for a published photo review of
  something the member bought or rented (hiding it voids them); 10 Bulbs
  when an editor checks a member in at an event (Back office → Editorial →
  the event's RSVP list). Reviews take up to 4 photos (public `reviews`
  bucket). Migration `20261205000000_bulbs_extras.sql`. Apple Wallet is
  dropped for now (it isn't free). Next: The IDEA Suite workspace.
- 2026-10-25: **The IDEA Suite: procurement.** Companies send procurement
  requests from The IDEA Spark (Business → Procurement); support quotes them
  in Back office → The IDEA Suite; the company accepts a quote (it becomes a
  purchase order, with their own PO reference) or declines; support marks
  it delivered; finance issues the invoice and marks it paid (Business →
  Invoices). Owners and admins are notified of quotes and invoices. Also,
  hiding a photo review now voids the bonus from an earlier, deleted review
  of the same product. Migrations `20261205100000_photo_review_void.sql`
  and `20261206000000_suite_procurement.sql`. Next: Suite hiring (job
  requests, candidates, shortlists).
- 2026-10-25: **The website, reorganised around the tabs.** Shop (Home,
  the catalog, Sell to us), Rent (`/plus`: the rental catalog with
  categories, then plans and tiers; `/rent` is gone), Discover (The IDEA
  Post with News, Stories, Learn and Events at `/post/events`, plus the
  Club; `/discover` and `/events` are gone), Cart and My Pass. Members'
  work is part of Stories. The header menu matches the tabs (plus For
  companies and About & info); the footer is one slim line on wider
  screens; About & info (`/about`) has the company's pages, language and
  theme, contact, legal pages and the version. My Pass's menu: card,
  Bulbs, orders, Plus, wishlist, Sell to us, Invite & earn (invite
  friends and the affiliate program), support, settings, About & info.
  Migration `20261207000000_post_restructure.sql`.
- 2026-10-25: **The IDEA Suite: Overview, printable documents, Plus for
  teams.** Business opens on an Overview (quotes to answer, open requests,
  unpaid invoices, Plus members, plan) instead of the template's Projects.
  Quotes, purchase orders and invoices open as printable pages (print or
  save as PDF). Companies can give members The IDEA Plus: owners and
  admins ask, finance approves, the company is invoiced monthly
  (`/cron/plus-seats`). Migration `20261208000000_team_plus.sql`. Next:
  Suite hiring.
- 2026-10-25: **The IDEA Suite: hiring.** Companies post job requests
  (Business → Hiring); support proposes vetted candidates with a CV
  (Back office → The IDEA Suite → Hiring); the company shortlists, rejects
  or hires, and hiring as many as asked fills the job. Migration
  `20261209000000_suite_hiring.sql`. Next: the back office (inbox, grouped
  menu, search, counter mode).
- 2026-10-25: **Back office: inbox, grouped menu, search, counter.** The
  dashboard starts with what's waiting on the signed-in role; the menu is
  grouped (Today, Sales, Catalog, Community, Companies, Money, Help, Team)
  with a search box; the counter checks a The IDEA Pass by camera, scanner
  or typing and shows Bulbs, Plus, rentals and today's events with
  check-in. Migration `20261210000000_counter.sql`.
- 2026-10-25: **The IDEA Post content.** The Telegram channel's guides,
  rewritten and updated (digital SAT, UCAS's three-question personal
  statement, current USMLE rules; closed opportunities dropped, overlapping
  posts merged), as one file per post in
  `packages/database/supabase/content/posts` (a news post, a story and the
  Learn guides). **Owner step:** run Actions → "Import The IDEA Post
  content" once; it doesn't post them to The IDEA Club. Edit them in
  Back office → Editorial afterwards (re-running the import overwrites
  posts with the same slug).
- 2026-10-25: **Cloudflare blocks server calls to `api.theideaiq.com`.**
  Requests from Vercel (Spark's back office, e.g. Staff → Find) get
  Cloudflare's bot challenge (403, `cf-mitigated: challenge`) and never reach
  apps/api; Telegram, Wayl and Supabase webhooks would hit the same wall.
  **Owner step:** in Cloudflare (theideaiq.com zone) either set the `api`
  DNS record to DNS only (grey cloud; Vercel serves it with its own TLS and
  firewall), or turn off Bot Fight Mode and add a WAF custom rule that skips
  bot protection and challenges for `api.theideaiq.com`. The back office now
  says "the server couldn't be reached" instead of "your role can't do
  this" when that happens.
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
