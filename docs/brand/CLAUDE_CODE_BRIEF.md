# Brief for Claude Code: The IDEA v1.1 — brand updates and the program revision

Brand v1.0 is already in the code (tokens, Readex Pro, Paper ground, the brand components). This brief brings the platform to v1.1: the new product structure, names, menus, addresses, Bulbs, Plus plans, condition labels and age rules.

Read first: `AGENTS.md`, `PROGRESS.md`, `docs/brand/BRAND_GUIDELINES.md` (rules), `docs/brand/DESIGN_SYSTEM.md` (spec) and `docs/brand/tokens.json` (values). Follow every repository rule (logical RTL utilities, every string in the messages files, migrations with RLS and pgTAP tests, Biome, tests).

**There are no customers yet** (one test order, three users), so renames are straight renames: **no redirects, no compatibility aliases**. Delete old routes, names and code paths outright.

Work through the phases in order, **one pull request per phase**, each green on CI before the next starts. Record each phase as a dated decision in `PROGRESS.md`, and update `AGENTS.md` wherever it names a route, app or product that changes.

## Phase 1 — Names, structure and addresses

1. **Products and names.** In code, messages (ar and en), emails, legal Markdown, the Droid's texts and docs:
   - The IDEA Suite → **The IDEA Business**; Megastore → **The IDEA Store**; The IDEA Post and Discover → **The IDEA Club**; The IDEA Spark → gone (the app is "The IDEA Business"; staff see "Back office").
   - Remove every mention of Academy, Launcher and Journal.
   - Keep the brand-name rule in `AGENTS.md`; update its examples (The IDEA Pass, The IDEA Plus, The IDEA Business, The IDEA Design).
2. **The business app.**
   - Rename `apps/app` to `apps/business` (workspace name, Turborepo, Vercel ignore script, CI, Knip).
   - Production host `business.theideaiq.com` instead of `spark.theideaiq.com`: update `NEXT_PUBLIC_APP_URL` defaults, `isAllowedReturnTo`, docs and every `.env.example`.
   - Move the back office from `/[locale]/admin` to `/[locale]/staff` (`@/lib/admin/navigation`, links, tests). The company workspace stays at `/business`.
3. **Website routes (apps/web).** Exactly this set; delete the old ones:

   | Route | Replaces |
   | --- | --- |
   | `/`, `/store`, `/store/[slug]` | (same) |
   | `/plus` (plans when signed out; Your Plus for members: items at home, queue, swaps, change or pause) | `/plus` + `/pass/plus` |
   | `/club` (one feed, chips: Events, News, Stories, Guides, Surveys; a "Yours" view when signed in: tickets, surveys, submissions) | `/post`, `/post/events`, `/club`, `/pass/events`, `/pass/submissions` |
   | `/club/[slug]` (story, guide or event with RSVP) | `/post/[slug]` |
   | `/pass` (the card, Bulbs, things on the way), `/pass/orders` (purchases, rentals, tickets, Sell to us), `/pass/bulbs` (with invites and affiliates), `/pass/settings` | 12 My Pass items |
   | `/sign-in` (one page: the email code signs in or creates a Pass; Continue with Telegram) | `/sign-in` + `/sign-up` |
   | `/saved`, `/cart`, `/checkout` | `/pass/wishlist` |
   | `/business` (what The IDEA Business offers) | `/suite` |
   | `/about`, `/careers`, `/help` (FAQ, contact, Ask Droid, your tickets) | `/about/careers`, `/about/faq`, `/about/contact`, `/pass/support` |
   | `/legal/[slug]`, `/r/[code]` (invites and affiliates, resolved server-side) | `/i/[code]`, `/a/[code]` |

   Keep `/mfa` (staff), `/onboarding`, `/tg`, `/auth/callback`. Rename the Post's database section values only if needed (`news`, `stories`, `learn` → shown as News, Stories, Guides).
4. **Navigation.**
   - Phone tabs: **Store · Plus · Club · Pass**.
   - Top bar on every screen except sign-in and checkout: logo, search, **Saved** (heart, count), **Cart** (count), Pass on desktop.
   - Desktop header: Store · Plus · Club, then For business, Saved, Cart, Pass.
   - Footer: Store · Plus · Club · Pass · Business, then About · Careers · Help · Legal.
   - **Saved** is the old wishlist: one list, and for Plus members its "Rent next" items, in order, are the rental queue.
5. **Telegram texts.** The Droid and the website call the channel "The IDEA", the group "The IDEA Club" and the bot "The IDEA Droid"; the Club's rooms are The Stage, The Lounge, The Arcade, Vibe Check, The Library, The Studio and The Office (update `web.club.rooms`).

## Phase 2 — Brand v1.1 in components

1. **Tokens** (`packages/design-system/styles/globals.css`): rename `--suite` to `--business` and `--bulb-empty` to `--meter-empty`; delete `--academy` and `--launcher`; charts 1–5 = pink, yellow, violet, orange, cobalt. Match `docs/brand/tokens.css`.
2. **`ConditionLabel` replaces `ConditionBulb`** (DESIGN_SYSTEM.md section 4): the four-step meter plus the word, mapping `new`, `open_box`, `refurbished`, `used` one to one. Remove the merged "like new" mapping and `apps/web/components/product-condition-bulb.tsx`.
3. **New:** `BulbsAmount` (the only use of the bulb icon in the UI) and `PlanMark` ("Plus Shine · 2 items at a time").
4. **Update:** `Badge` tones (drop academy, suite, launcher; add business); `NameTile` (Club, Plus, Staff only); `PlanCard` (PlanMark title, Shine featured); `ProductCard` (ConditionLabel, age rating, Rent-only items show "worth …"); `PassCard` (pink for everyone, plan, Student and Staff badges; no tier colours).
5. **Assets:** copy `docs/brand/logos/condition-*.svg`, `droid-avatar.png` and `droid-hero.png` where used; remove `tile-post.svg`, `tile-droid.svg` and `condition-like-new.svg`. Use the Droid on empty states, 404 and error pages, and "Ask Droid" in Help (never in checkout, receipts, legal or Business).
6. Storybook stories for every changed component, both themes and both directions.

## Phase 3 — Money rules (migrations + tests)

1. **Bulbs become flat points.** Remove the spend tiers (Glow, Shine, Beam, Blaze as tiers), tier thresholds, tier card colours and tier-based Club join rules. Earn rates: **3%** for everyone; Plus Glow **4%**, Plus Shine **5%**, Plus Blaze **6%**; consoles, laptops and items over 500,000 IQD earn half. Keep every bonus (first order, trade-ins +20%, birthday, photo review, event check-in, Telegram link, invites) and spending as built. Add paying Plus with Bulbs. Nobody loses Bulbs. Finance → Bulbs edits the four rates.
2. **Club join rules:** anyone, Pass holders with Telegram linked, Plus members, or verified Students (replacing "a Bulbs tier and up").
3. **Plus plans:** names Plus Glow / Plus Shine / Plus Blaze (Arabic names the same, Latin letters), 1 / 2 / 4 items, 14,750 / 22,750 / 39,750 IQD a month; included home swaps 1 / 2 / 4 a month; Shine and Blaze get free Store delivery in Baghdad and new releases in their first 30 days (the existing tier gating); Blaze gets first access to Club events and 25% off game night kits. Annual = 10 months' price; verified students 20% off. Update `seed.sql`; production rows are created in the back office.
4. **Delivery:** free Baghdad delivery for everyone on orders over 150,000 IQD (a setting in Catalog → Settings) and for Plus Shine and Blaze on any order; remove free delivery by Bulbs tier.
5. **Returns window: 14 days** everywhere. Bulbs from an order unlock 14 days after delivery; affiliate commissions wait 14 days. Make it one setting, not scattered constants.
6. **Discount cap:** a setting for the maximum total given away on one order (invite discount + affiliate discount + Bulbs earned, default 20% of the order total); checkout and the earn logic enforce it.
7. **Over 500,000 IQD:** no cash on delivery; online or at pickup only.

## Phase 4 — Ages and guardians

1. Date of birth asked once at first sign-in (onboarding); the Pass is open from **13**.
2. **13–17:** a guardian link in Settings (guardian's phone confirmed by a one-time code). Purchases, single rentals and Plus need the guardian's confirmation once; cash orders are handed to an adult.
3. **18+ only:** games rated PEGI 18 (add `age_rating` to products and show it on game pages; hide 18-rated items from under-18 Passes), Sell to us, affiliates, surveys and survey rewards, booking game night kits.
4. Events: under-16s attend with an adult (shown on the event page).

## Phase 5 — New features (one pull request each, in this order)

1. **Single-item rent** from the product page (games 9,750 / 7 days, books 3,750 / 14 days, films 2,750 / 7 days; late fees 1,750 / 500 / 500 a day; after 14 late days the copy is sold at its used price); verified Pass or a deposit of half the item's value; pickup free, delivery as a normal order.
2. **Keep it:** Plus members and renters buy the copy they hold at its used price (Plus: minus one month's fee).
3. **Game night kits:** PS5 49,750, Switch 39,750, retro 24,750 for Thursday evening to Saturday evening, extra day 19,750 / 14,750 / 9,750; delivery included in Baghdad; verified Pass + ID or a 100,000 IQD deposit; adults only.
4. **Boxes:** a product kind that bundles products, priced in the back office.
5. **Student verification:** university email domains managed in the back office, student-card upload reviewed by staff as a fallback, badge valid to the end of the academic year, documents deleted after review.
6. **Partner perks:** partners (a Business organisation type) list perks for everyone, Students or Plus; redemption by scanning the Pass card from their Business dashboard; monthly redemption counts.
7. **Surveys in the Club:** free surveys (answer one, earn one response credit) and rewarded surveys (creator pays per response in Bulbs or cash; respondents earn 2–10 Bulbs by length; a small fee). Targeting (university, major, year, governorate), attention checks, minimum time, anonymous answers, consent text, Excel/SPSS/CSV export. 18+.

## Not code (owner tasks; list them in PROGRESS.md)

Enter cost prices for every copy; publish or delete the 169 draft products; fix the two 250 IQD prices; re-price books, CDs and games by the bands in the Program Revision; add Switch rental copies; create the three Plus plans in production; rename the Telegram chats and claim the usernames; draft the 14 policies (`/legal`: terms, privacy, delivery, returns, condition, plus, rewards, sell, club, surveys, business, accessibility, security, copyright) for legal review.

## Checks for every phase

`bun run check`, `typecheck`, `test`, `check:rtl`, `check:i18n`, `check:placeholders`, `check:unused`, `boundaries`, `db:test` for schema changes, every build, and the Playwright + axe journeys. Each pull request includes screenshots of the changed screens in Arabic and English, light and dark. No raw hex in components; no black in logos, tiles, the Droid or brand blocks; the bulb icon only for Bulbs.
