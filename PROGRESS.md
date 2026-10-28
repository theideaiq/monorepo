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
- The 13 public policies at `/legal/<policy>` (terms, privacy, delivery,
  returns, condition, plus, rewards, club, surveys, business,
  accessibility, security, copyright) replace the old five, with
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
      replaces community and conduct), 2026-10-26. Owner step: have them
      reviewed under Iraqi law, and confirm Wayl's refund window and fees.

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
      Partners, the Academy's programs) (legal review); store checked market prices
      (price, date, evidence) so SouqPrice can show. (Poppins removed
      2026-10-25.)

## Decisions

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
