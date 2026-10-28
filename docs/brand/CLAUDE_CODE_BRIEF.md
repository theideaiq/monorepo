# Brief for Claude Code: The IDEA brand v1.0, update of 28 October 2026

The brand stays version 1.0. This update brings the brand and the design system in line with Program Revision v2, the owner decisions of 28 October, and the founder's brand review.

**Before you start:**
- Follow `docs/brand/DESIGN_SYSTEM.md` (spec) and `docs/brand/BRAND_GUIDELINES.md` (rules). `docs/brand/tokens.json` is the source of truth.
- Read `AGENTS.md` and `PROGRESS.md` first, and follow every repository rule (logical RTL utilities, every string in the messages files, Biome, tests).

**What changes:**
- **One palette.** The product accents are gone: the tokens `plus`, `business`, `club`, `on-accent` and `on-accent-warm`, the `plus` button variant and the accent badge tones. Products are told apart by name.
- **Alexandria replaces Readex Pro and Cairo** as the text font for both scripts. Readex Pro has no گ, چ, پ or ژ, so Iraqi words switched fonts mid-word. The logo's wordmark stays an outlined drawing.
- **Names.** Partners, Droid and Staff are always short (never "The IDEA Partners", "The IDEA Droid", "The IDEA Business"). Full names (The IDEA Store, Plus, Club, Pass) are for titles and first mentions outside our surfaces; short names everywhere inside them. Always capitalized; "your Pass". No "membership", "account" or "users".
- **No mascot.** Droid's profile photo is `tile-droid.svg`. Remove any mascot artwork, stickers or empty-state art of the old character.
- **Removed:** the condition bulbs (condition is four plain labels), SouqPrice, the box UI and the counter UI.
- **New commerce components:** offers, auctions, Make an offer, Saved, Bulbs, verification, gifts, codes, survey screens.
- **Header and tabs** change, and phones have no footer.

**Do these with the work they belong to,** not as one big pull request. The cleanups go with step 1 of the order of work, and each new component lands with the feature that uses it.

1. **Tokens and font.**
   - In `packages/design-system/styles/globals.css`, remove `--plus`, `--business`, `--club`, `--on-accent` and `--on-accent-warm` from `:root`, `.dark` and `@theme inline`. Set `--chart-1…5` as section 3 says.
   - Replace every `bg-plus`, `text-plus`, `border-plus`, `bg-business`, `bg-club` and similar class with pink, yellow or neutral as section 4 says.
   - In `packages/design-system/lib/fonts.ts`, load Alexandria (latin + arabic, 400–700) as the only sans family, and drop Readex Pro and Cairo.
   - Update `packages/email` and the Supabase auth templates to Alexandria with a system fallback.
2. **Components.**
   - `Button`: remove the `plus` variant and use `default` (pink) for every primary action.
   - `Badge`: remove the `plus`, `business` and `club` tones.
   - `PlanCard` and plan marks are pink.
   - `BrandLogo` `line` values: Club, Design, Droid, Partners, Pass, Plus, Staff, Store.
3. **Names.**
   - Messages files in both languages:
     - The IDEA Partners → Partners, The IDEA Droid → Droid, The IDEA Business → Partners;
     - short names inside the site and apps;
     - no "membership".
   - Update the brand-name rule in `AGENTS.md` to match BRAND_GUIDELINES.md section 2.
4. **Assets.**
   - Copy `docs/brand/logos/tile-partners.svg` (attached) and serve `tile-droid.svg` as Droid's avatar wherever the bot or Droid appears.
   - Delete `docs/brand/logos/condition-*.svg`, any `ConditionBulb` code and any mascot images.
5. **Retire:** SouqPrice, the box product UI and the counter UI, with their stories and messages.
6. **New components** (DESIGN_SYSTEM.md section 4.1):
   - `OfferList`, `PriceBlock`, `BulbsAmount`, `AuctionPanel`, `OfferSheet`, `SavedItem`, `SavedTabs`, `VerificationBadge`, `GiftOption`, `CodeReveal`, `SurveyStart`, `WhoAnswered`;
   - updates to `PassCard`, `PlanCard`, `ProductCard`, `AppHeader`, `TabBar` and `Footer`.
   - Each one gets stories in The IDEA Design, in both themes and both directions.
7. **Docs:** `docs/brand/README.md` says brand v1.0, updated 28 October 2026. Refresh the screenshots in `docs/brand/screenshots/` once the header, Saved and offers ship.
8. **Checks:** `bun run check`, `typecheck`, `test`, `check:rtl`, `check:i18n`, `build` and the Playwright + axe journeys, against DESIGN_SYSTEM.md section 6.

**Constraints:**
- No raw hex in components.
- No black in logos, tiles or brand blocks.
- Yellow is never text on light backgrounds; small text on pink is white.
- Status chips always carry a word and an icon, never color alone.
- Prices, bids and Bulbs use `font-mono` with Latin digits, with IQD after the number.
