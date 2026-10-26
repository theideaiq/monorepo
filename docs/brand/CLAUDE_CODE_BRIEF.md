# Brief for Claude Code: The IDEA v1.1 — what is left

Read first: `AGENTS.md`, `PROGRESS.md`, `docs/brand/BRAND_GUIDELINES.md` (rules), `docs/brand/DESIGN_SYSTEM.md` (spec) and `docs/brand/tokens.json` (values). Follow every repository rule (logical RTL utilities, every string in the messages files, migrations with RLS and pgTAP tests, Biome, tests). There are no customers yet: renames are straight renames, with no redirects or compatibility aliases.

## Already done on `main` (program revision v1, PRs #1002–#1008)

Names and structure (`apps/business` at business.theideaiq.com, the back office at `/staff`, the website routes, menus and footer, Telegram texts); money rules (flat Bulbs, Club join rules, Plus Glow / Shine / Blaze at 14,750 / 22,750 / 39,750, free delivery over 150,000, the 14-day window, the discount cap, no cash on delivery over 500,000); catalogue fixes; ages, guardians and the 14 policies; single-item rent and Keep it; The IDEA Plus launch; game night kits. Do not redo these; where this brief or the guidelines disagree with what shipped, the guidelines win for brand and visuals, and `PROGRESS.md` wins for business rules.

Work through the steps below in order, **one pull request per step**, each green on CI before the next starts. Record each as a dated decision in `PROGRESS.md`.

## Step A — Brand v1.1 in components (next)

1. **Tokens** (`packages/design-system/styles/globals.css`): rename `--bulb-empty` to `--meter-empty`; delete the spare `--teal` and `--lime` (and their `bg-*` uses); charts 1–5 = pink, yellow, violet (`plus`), orange (`club`), cobalt (`business`). Match `docs/brand/tokens.css`.
2. **`ConditionLabel` replaces `ConditionBulb`** (DESIGN_SYSTEM.md section 4): the four-step meter plus the word, mapping `new`, `open_box`, `refurbished`, `used` one to one. It replaces the four plain condition labels shipped in step 3 (catalogue); remove any leftover condition-bulb code.
3. **New:** `BulbsAmount` (the only use of the bulb as a meaning-carrying UI icon; the logo, `BulbKicker`, `PinkBand`, `PassCard` and the app icon keep the bulb as brand) and `PlanMark` ("Plus Shine · 2 items at a time").
4. **Update:** `Badge` tones (plus, club, business; no spare accents); `NameTile` (Club, Plus, Staff only); `PlanCard` (PlanMark title, Shine featured); `ProductCard` (ConditionLabel, the PEGI rating from `products.age_rating`; rent-only items keep "Worth …"); `PassCard` (pink for everyone, plan, Student and Staff badges; no tier colours).
5. **Assets:** copy `docs/brand/logos/condition-*.svg`, `droid-avatar.png` and `droid-hero.png` where used; remove `tile-droid.svg`, `tile-post.svg` and `condition-like-new.svg` from every app's `public/brand`. Use The IDEA Droid (replacing the generic "bulb character") on empty states, 404 and error pages, and "Ask Droid" in Help (never in checkout, receipts, legal or Business).
6. Storybook stories for every changed component, both themes and both directions.

## Steps B–E — The remaining new features (one pull request each, in this order)

B. **Boxes:** a product kind that bundles products, priced in the back office.
C. **Student verification:** university email domains managed in the back office, student-card upload reviewed by staff as a fallback, badge valid to the end of the academic year, documents deleted after review; then the 20% student price on Plus, Students as a Club join rule, and verified students for kits.
D. **Partner perks:** partners (a Business organisation type) list perks for everyone, Students or Plus; redemption by scanning the Pass card from their Business dashboard; monthly redemption counts.
E. **Surveys in the Club:** free surveys (answer one, earn one response credit) and rewarded surveys (creator pays per response in Bulbs or cash; respondents earn 2–10 Bulbs by length; a small fee). Targeting (university, major, year, governorate), attention checks, minimum time, anonymous answers, consent text, Excel/SPSS/CSV export. 18+.

## Not code (owner tasks; keep them in PROGRESS.md)

Check that the Vercel project for The IDEA Business points at `apps/business` with the `business.theideaiq.com` domain (the preview project still reported `apps/app`); enter cost prices for every copy; finish or delete the remaining drafts; add each game night kit and the Plus delivery days in the back office; rename the Telegram chats and claim the usernames; send the 14 policies for legal review.

## Checks for every phase

`bun run check`, `typecheck`, `test`, `check:rtl`, `check:i18n`, `check:placeholders`, `check:unused`, `boundaries`, `db:test` for schema changes, every build, and the Playwright + axe journeys. Each pull request includes screenshots of the changed screens in Arabic and English, light and dark. No raw hex in components; no black in logos, tiles, the Droid or brand blocks; the bulb as a UI icon only for Bulbs (logo and brand devices excepted).
