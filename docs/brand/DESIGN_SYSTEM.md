# The IDEA — Design System v1.0 (implementation spec)

Version 1.0 · updated 28 October 2026. This update: one palette (the product accents `plus`, `business`/`partners` and `club` are gone); Alexandria replaces Readex Pro as the text font; condition bulbs retired; new commerce components (offers, auctions, Make an offer, Saved, Bulbs, verification); SouqPrice, box and counter UI removed; header, tabs and the phone footer; short names (Partners, Droid) and no "membership" in copy; no mascot.

The engineering companion to `BRAND_GUIDELINES.md`: tokens, how they map onto `theideaiq/monorepo`, the components to build or restyle, and the checks every screen must pass. `tokens.json` is the source of truth; `tokens.css` holds the same values as CSS variables.

## 1. Principles

1. **Pink means "do it".** The primary action is The IDEA Pink with white text on every line; on pink panels it is yellow with dark text.
2. **Paper or Dark first.** Screens are mostly `surface`; pink and yellow stay special.
3. **No black in the brand.** Logos, tiles, bands and brand blocks use pink, yellow and white only. Ink (`ink`) is for text.
4. **One palette.** Every product uses the same pink, yellow, paper and ink; products are told apart by name, never by color. Status colors are only for states.
5. **Arabic first.** RTL is the default; Alexandria for both scripts (it has گ چ پ ژ ڤ); Latin digits.
6. **Accessible by default.** WCAG 2.2 AA in both themes; visible focus everywhere.
7. **One source.** Components use tokens, never raw hex.

## 2. Tokens

### 2.1 Color

| Token | Paper | Dark | Use |
| --- | --- | --- | --- |
| `idea-pink` | `#D81B60` | `#D81B60` | Primary buttons, Pink Band, avatars, app icon, active states |
| `idea-pink-hover` | `#B5134E` | `#B5134E` | Hover / pressed |
| `on-pink` | `#FFFFFF` | `#FFFFFF` | Text on pink (4.95:1) |
| `pink-text` | `#D81B60` | `#F06292` | Pink as text: links, wordmark on paper, prices (4.7:1 / 6.2:1) |
| `bulb-yellow` | `#F4CF08` | `#F4CF08` | Bulb, Highlights, buttons on pink, Staff tile |
| `bulb-yellow-hover` | `#E2BD00` | `#FFDC33` | Hover of yellow fills |
| `on-yellow` | `#0F1014` | `#0F1014` | Text on yellow (12.5:1) |
| `ink` | `#0F1014` | `#F6F3EA` | Body and heading text only |
| `ink-muted` | `#5B5D66` | `#A6A8B2` | Secondary text |
| `surface` | `#FBF8EF` | `#121318` | Page background |
| `surface-raised` | `#FFFFFF` | `#1A1B21` | Cards, sheets, popovers |
| `surface-sunken` | `#F2EEE2` | `#22232A` | Inputs, wells, image grounds |
| `border` | `#E4DFD0` | `#2C2D35` | Decorative dividers |
| `border-strong` | `#8A8C95` | `#6B6D78` | Control borders (3:1+) |
| `focus-ring` | `#0F1014` | `#F4CF08` | Focus outline |
| `bulb-empty` | `#D9DCE6` | `#3A3C46` | Unlit part of a bulb (Bulbs progress only) |
| `success` | `#127A4B` | `#4ADE9A` | With icon and word |
| `warning` | `#865A00` | `#F5B83D` | With icon and word |
| `danger` | `#B3261E` | `#FFB4A9` | With alert icon and word (similar lightness to pink) |
| `on-status` | `#FFFFFF` | `#0F1014` | Text on success / danger |

Hard rules: yellow never as text on paper; small text on pink is white; logos on paper and yellow are pink; no black in logos, tiles or brand blocks.

### 2.2 Typography

`--font-sans: "Alexandria", system-ui, sans-serif` · `--font-mono: "Geist Mono", ui-monospace, monospace`.

| Style | Size / line | Weight |
| --- | --- | --- |
| `display-xl` | 72 / 76, −2% | 700 |
| `display` | 56 / 62, −2% | 700 |
| `display-ar` | 64 / 84 | 700 |
| `h1` / `h2` / `h3` | 40/48 −1% · 30/38 · 22/30 | 700 · 600 · 600 |
| `body-lg` / `body` / `body-ar` | 18/30 · 16/26 · 17/30 | 400 |
| `label` | 14 / 20 | 600 |
| `small` | 14 / 22 | 400 |
| `caption` | 12 / 16, +2% | 500 |
| `price` | 20 / 28 | 500 mono |

On phones scale `display-xl` to 44/48 and `display` to 36/42. Arabic never below 14px.

### 2.3 Space, radius, elevation, motion, layout

- Spacing: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-6` 24 · `space-8` 32 · `space-12` 48 · `space-16` 64 · `space-24` 96.
- Radius: `radius-sm` 6 · `radius-md` 10 (unchanged) · `radius-lg` 16 · `radius-xl` 28 · `radius-pill` 999; icon squares 22%.
- Shadow: `shadow-1` resting cards; `shadow-2` floating layers; no gradients or glows.
- Motion: `cubic-bezier(0.2, 0, 0, 1)`; 120 / 240 / 360ms; "switch on" = opacity 0→1, scale 0.96→1; reduced motion → opacity only.
- Layout: 1200px max, 12 columns on desktop, 4 on phones, 16px phone gutters.

## 3. Mapping onto the existing code

`packages/design-system/styles/globals.css` (shadcn/ui + Tailwind v4). The current primary is already `#d81b60`, so the main change is the page ground, fonts, focus, dark palette and new brand tokens.

| shadcn variable | Paper (`:root`) | Dark (`.dark`) | Was |
| --- | --- | --- | --- |
| `--background` | `#FBF8EF` | `#121318` | white / `#0f1014` |
| `--foreground` | `#0F1014` | `#F6F3EA` | near-black / near-white |
| `--card`, `--popover` | `#FFFFFF` | `#1A1B21` | white / `#17181d` |
| `--primary` | `#D81B60` | `#D81B60` | `#d81b60` / `#ec407a` |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | white |
| `--secondary`, `--muted`, `--accent` | `#F2EEE2` | `#22232A` | grey / `#1f2027` |
| `--secondary-foreground`, `--accent-foreground` | `#0F1014` | `#F6F3EA` | — |
| `--muted-foreground` | `#5B5D66` | `#A6A8B2` | grey |
| `--border` | `#E4DFD0` | `#2C2D35` | grey / `#26272f` |
| `--input` | `#8A8C95` | `#6B6D78` | grey |
| `--ring` | `#0F1014` | `#F4CF08` | `#e91e63` / `#ec407a` |
| `--destructive` | `#B3261E` | `#FFB4A9` | red |
| `--success` | `#127A4B` | `#4ADE9A` | green |
| `--brand` / `--brand-foreground` | `#F4CF08` / `#0F1014` | same | unchanged |
| `--sidebar-primary` / `-foreground` | `#D81B60` / `#FFFFFF` | same | pink |
| `--chart-1…5` | pink, yellow, pink deep, ink-muted, success | dark-theme equivalents | various |

Add every other token from `tokens.css` and expose them in `@theme inline` as `--color-*` (`bg-idea-pink`, `text-pink-text`, `bg-surface-sunken` …). Remove `--plus`, `--business`/`--partners`, `--club`, `--on-accent` and `--on-accent-warm` and every use of them (the classes become pink, yellow or neutral as section 4 says).

Fonts (`packages/design-system/lib/fonts.ts`): load **Alexandria** with `next/font/google` (subsets `latin` and `arabic`, weights 400, 500, 600, 700) as the only `--font-sans` family; drop Readex Pro and Cairo (Readex Pro has no گ, چ, پ or ژ, so Iraqi words fell back to Cairo mid-word); keep Geist Mono. The logo's wordmark stays outlined Readex Pro Bold in the SVGs and is never set as live text. Email templates and the Supabase auth templates use Alexandria with a system fallback.

## 4. Components

| Component | Spec |
| --- | --- |
| `BrandLogo` (exists) | Props `variant: 'on-light' \| 'on-pink' \| 'on-yellow' \| 'on-dark'` and `line?: Line` (Club, Design, Droid, Partners, Pass, Plus, Staff, Store). On light and yellow: pink bulb and pink wordmark; on pink and dark: yellow bulb and white wordmark. The wordmark is the outlined drawing (Readex Pro Bold, −1% tracking), never live text. Never black. English always `dir="ltr"`. |
| `Button` (exists) | `default` = pink / white; `brand` (new) = yellow / dark text, for use on pink grounds; `outline` = transparent + `border-strong`; `ghost`; `destructive` = danger. The `plus` variant is removed: the primary action is pink whatever it is (buy, rent, bid). Heights 36 / 44 / 52, `radius-md`, 2px focus ring offset 2px. |
| `Highlight` (new) | Yellow swipe with dark text on paper and dark; inside pink grounds the words turn yellow, no swipe. One per headline. |
| `BulbKicker` (new) | Small bulb (20–28px) centered above a headline: yellow on pink and dark, pink on paper and yellow. |
| `PinkBand` (new) | Full-width pink band, yellow bulb kicker, white headline with one yellow Highlight, yellow `brand` button. Once per page. |
| `NameTile` (exists) | Circle (or `shape="square"` at 22%) with one bold word (outlined in the SVG files; live text in Alexandria 700): `public` = white on pink (Club, Droid, Plus, Partners); `internal` = pink on yellow (Staff); no word = yellow bulb on pink. Sizes 32–128. |
| Condition label | Four plain labels: New, Open box, Refurbished, Used (جديد · علبة مفتوحة · مجدّد · مستعمل), `Badge` outline, shown when not new. The bulb belongs only to Bulbs; the condition bulbs and their files (`logos/condition-*.svg`) are retired. |
| `Badge` (exists) | Tones: neutral, brand (pink), highlight (yellow), success, warning, danger (status needs an icon). The `plus`, `business` and `club` tones are removed. |
| `PlanCard` | `radius-xl`; featured: 2px pink border, pink flag, pink primary button; others outline. Shows per tier: items at a time, home swaps, the Bulbs rate ("Earn 3% in Bulbs" is the one place a rate appears), perks. A Duo toggle switches every card to its Duo price. Student price shown to verified students. |
| `ProductCard` | Image on `surface-sunken`; badge top-start; 2-line name; price, or "from <price>" when several offers (rental-only items: "Rent" with "Worth …" in small print); the condition label when not new; an "Auction" badge with time left when the product has a live auction; the heart (save) top-end; full-width pink CTA ("Buy", or "Rent with Plus" for rentable items). |

### 4.1 Commerce and account components (new in this update)

| Component | Spec |
| --- | --- |
| `OfferList` | On the product page, every offer for the variant: seller name (The IDEA or the shop), condition label, price, copies left, "Add to cart". Sorted by price; the cheapest gets a "Lowest price" badge (highlight tone). A shop's row says "Sold by <shop> · delivered and paid through The IDEA". "Make an offer" appears on rows that accept offers. A live auction appears as its own row linking to the `AuctionPanel`. |
| `PriceBlock` | The price in `price` style. Optional: struck-through "was" price (only when the API says it's honest), sale end date ("Ends Thursday"), student price or Plus price (labeled, shown only to those who qualify), and "Lowest in 30 days: 54,750 IQD" in `caption`. Never a percentage-off badge without the "was" price. |
| `BulbsAmount` | Small yellow bulb + number in mono + the word Bulbs: "Earn 340 Bulbs" under prices; the Pass balance as "2,340 Bulbs" with "= 2,340 IQD off" in `ink-muted`. At checkout, a stepper in steps of 250 (minimum 1,000). Never a percentage. |
| `AuctionPanel` | Current bid (large, mono), number of bids, time left (a live countdown; under one hour it switches to the `warning` tone with a clock icon and the word "Ending soon"), "Reserve not met" when relevant, the bidder's status ("You're the highest bidder" in success, "You've been outbid" in warning). Input "Your maximum bid" with the minimum next bid shown; "Place bid" (pink). Note under it: "A bid in the last 2 minutes adds 2 minutes." The seller's photos in a gallery above. |
| `OfferSheet` | A bottom sheet (phones) or dialog: the listing price, "Your offer" input with the 60% minimum shown, "Send offer". The seller's side shows Accept (pink), Counter, Decline. Each offer shows its state chip (Waiting, Countered, Accepted, Declined, Expired) and "Expires in 48 hours". |
| `SavedItem` | Product image, name, current price, a state chip (Price dropped, Back in stock: success · Out now, Rentable now: pink · Coming soon, Unavailable: neutral), the "Tell me" bell toggle with an optional price target, and actions (Add to cart, Add to queue for Plus members, Move to list, Remove). |
| `SavedTabs` | Saved · Lists · Queue (Queue only for Plus members). The queue is drag-to-reorder with handles and keyboard moves; Your Plus shows its first 3 as "Next up". |
| `VerificationBadge` | Small badge with icon and word: Phone verified, Identity verified, Student, Educator, Registered shop, Individual trader, Verified organization. Neutral tone with a check icon; never color alone. Shown on the Pass card, in Settings → Verification, and next to a shop's name. |
| `PassCard` (exists) | Adds: the Plus tier and "Duo" when shared, verification badges, and the survey contributor badge (levels at 10, 50, 200 answers). Shows the best partner perk the person qualifies for, and "With Plus: …" for a better one they don't have yet. |
| `GiftOption` | At checkout: "This is a gift" switch; when on, "Hide the price" (on by default) and a message field (max 200 characters). The recipient's page: the message, the item, and "Enter your address" or "Add to your Pass". |
| `CodeReveal` | A digital code card in Orders: brand, store region ("PlayStation · US store · $20"), a blurred code with "Reveal code" (a deliberate tap, then Copy). After reveal: "Revealed codes can't be returned." |
| `SurveyStart` | Before a survey: who runs it and why, the reward ("Earn 600 Bulbs"), the estimated time, "There are attention checks", and the counting rules in plain words. After: "Counted" (success) or "Not counted" with the reason and "Appeal". |
| `WhoAnswered` | On survey results: breakdown bars by targeting field against the target (groups under 5 hidden as "Fewer than 5"), started / finished / excluded counts, median time, and the fixed note about who answers. |
| `AppHeader` (exists) | Desktop: logo · Store · Plus · Club · search · Saved · bell · cart · Pass. Phones: logo · search · Saved · bell · cart. Only the bell and the cart show counts. |
| `TabBar` (exists) | Store · Plus · Club · Pass. Hidden on checkout and sign-in. |
| `Footer` (exists) | Desktop only (hidden below `md` and in the apps). On phones, "About & help" is a row at the bottom of the Pass; the version and build sit at the bottom of /about. |

**Removed in this update:** `SouqPrice` (and its stories and messages), the box product UI, the counter UI, condition bulbs, the `plus` button variant, the accent badge tones, any mascot artwork.

## 5. Assets and naming

- Favicon, app icons, Capacitor splash: `logos/app-icon.svg` (yellow bulb on pink). Splash: pink background, yellow bulb centered.
- `theme-color`: `#D81B60`.
- Social avatar: `logos/avatar-the-idea.svg`. Name tiles: `logos/tile-*.svg`.
- Email templates (`packages/email`, Supabase auth templates): pink header with `lockup-on-pink.svg`, paper body, pink button.
- Open Graph template: pink ground, yellow bulb kicker, white title with one yellow word.
- Product names in copy and messages files: full names (The IDEA Store, The IDEA Plus, The IDEA Club, The IDEA Pass) in titles and first mentions outside our own surfaces; short names (Store, Plus, Club, Pass) inside the website, apps and emails; Partners, Droid and Staff are always short. Always capitalized; "your Pass", "your Plus". Never "account", "membership" or "users".
- Name tiles: `logos/tile-partners.svg` (white "Partners" on pink) is new; Droid's profile photo is `logos/tile-droid.svg`; `logos/condition-*.svg` are removed.
- Brand line in messages: "اعلگها" (ar) / "Switch on." (en).

## 6. Quality gates

- [ ] Arabic (RTL) and English (LTR), Paper and Dark themes all checked
- [ ] No raw hex in components; tokens only
- [ ] No black (`ink`) in any logo, tile, band or brand block
- [ ] Contrast: text 4.5:1 (3:1 at 24px+), controls and focus 3:1, both themes
- [ ] Yellow never as text on paper; small text on pink is white
- [ ] `bun run check:rtl` and `bun run check:i18n` pass
- [ ] Status colors always with an icon and a word
- [ ] The IDEA Design (Storybook at staff.theideaiq.com/design) stories for every changed component, both themes and directions
- [ ] Prices, bids and Bulbs in `font-mono` with Latin digits; IQD after the number
- [ ] Playwright + axe journeys pass
