# Brief for Claude Code: implement The IDEA brand v1.0 across the platform

Implement The IDEA brand across the whole monorepo, following `docs/brand/DESIGN_SYSTEM.md` (spec) and `docs/brand/BRAND_GUIDELINES.md` (rules). `docs/brand/tokens.json` is the source of truth for every value. Read `AGENTS.md` and `PROGRESS.md` first and follow all repository rules (logical RTL utilities, every string in the messages files, Biome, tests).

**What changes:** The IDEA Pink (`#D81B60`) stays the primary colour and the yellow bulb (`#F4CF08`) is the second brand colour; the page ground becomes warm Paper (`#FBF8EF`) with a softer dark mode; the font becomes **Readex Pro** for Arabic and Latin; logos, tiles and brand blocks never use black; new brand components (PinkBand, Highlight, BulbKicker, NameTile, SouqPrice, ConditionBulb); community names become The IDEA Club, The IDEA Droid and The IDEA Staff; the brand line is "اعلگها" / "Switch on."

Work in this order, one commit per step, and open one pull request at the end:

1. **Tokens.** Update `packages/design-system/styles/globals.css` with the mapping in DESIGN_SYSTEM.md section 3 for `:root` and `.dark`; add every token from `docs/brand/tokens.css`; expose them in `@theme inline` as `--color-*`.
2. **Fonts.** In `packages/design-system/lib/fonts.ts`, load Readex Pro (latin + arabic, 400–700) as the first sans family; keep Cairo as fallback; keep Geist Mono; add the type styles from section 2.2.
3. **Logo.** Rework `BrandLogo` with the `variant` and `line` props from section 4 (pink on light and yellow, yellow bulb + white on pink and dark, never black). Copy `docs/brand/logos/*.svg` to each app's static assets.
4. **Components.** Restyle `Button` (add `brand` and `plus` variants) and `Badge`; add `Highlight`, `BulbKicker`, `PinkBand`, `NameTile`, `SouqPrice` and `ConditionBulb`; update `PlanCard` and `ProductCard`. Add Storybook stories for each, both themes and both directions.
5. **Apply.** Replace hard-coded colours in `apps/web` (the website and The IDEA Pass), `apps/business` (The IDEA Business and the back office) and `packages/email` with tokens. Use `PinkBand` for the main call to action on the home page and each line page. Show `ConditionBulb` wherever a rental or used item's grade exists (letter grades stay in the back office only) and `SouqPrice` only where a checked market price exists in the data.
6. **Names and copy.** In the messages files, rename community references to The IDEA Club, The IDEA Droid and The IDEA Staff, and add the brand line (ar "اعلگها", en "Switch on."). Do not change any other copy's meaning.
7. **Icons and metadata.** Replace favicons, app icons, the Capacitor splash and asset sources, the Open Graph image and `theme-color` (`#D81B60`) per section 5.
8. **Emails.** Update `packages/email` templates and the Supabase auth templates in `packages/database/supabase/templates` (pink header with `lockup-on-pink.svg`, pink button).
9. **Checks.** Run `bun run check`, `typecheck`, `test`, `check:rtl`, `check:i18n`, `build` and the Playwright + axe journeys; fix every failure against DESIGN_SYSTEM.md section 6.

Constraints:

- Visual, token and naming change only: no business logic or schema changes.
- No raw hex in components afterwards; no black in logos, tiles or brand blocks.
- Yellow is never text on light backgrounds; small text on pink is white.
- Keep `radius-md` at 10px so layouts don't shift.
- Keep the brand-name rule in `AGENTS.md` ("The IDEA" in Latin letters, also inside Arabic copy).
- In the PR description include before/after screenshots of the home page, the Plus page, a product page, checkout, The IDEA Pass sign-in and one back-office screen, in Arabic and English, light and dark.
