# The IDEA — Design System v1.1 (implementation spec)

v1.1 (26 October 2026): product names and accents follow the Program Revision (Store, Plus, Club, Pass, Business); condition meters replace condition bulbs; the bulb icon is reserved for Bulbs; Academy, Launcher and Suite accents are gone.

The engineering companion to `BRAND_GUIDELINES.md`: tokens, how they map onto `theideaiq/monorepo`, the components to build or restyle, and the checks every screen must pass. `tokens.json` is the source of truth; `tokens.css` holds the same values as CSS variables.

## 1. Principles

1. **Pink means "do it".** The primary action is The IDEA Pink with white text on every line; on pink panels it is yellow with dark text.
2. **Paper or Dark first.** Screens are mostly `surface`; pink and yellow stay special.
3. **No black in the brand.** Logos, tiles, bands and brand blocks use pink, yellow and white only. Ink (`ink`) is for text.
4. **One accent per surface.** Each product adds one secondary accent for tags, plan cards and bands.
5. **Arabic first.** RTL is the default; Readex Pro for both scripts; Latin digits.
6. **Accessible by default.** WCAG 2.2 AA in both themes; visible focus everywhere.
7. **One source.** Components use tokens, never raw hex.

## 2. Tokens

### 2.1 Colour

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
| `plus` / `business` | `#5B3BE8` / `#1F4FD6` | `#A99BFF` / `#7FA2FF` | The IDEA Plus and The IDEA Business accents (business is also the info colour); text `on-accent` |
| `club` | `#FF6A2B` | `#FF7A40` | The IDEA Club accent (fill only); text `on-accent-warm` |
| `on-accent` | `#FFFFFF` | `#0F1014` | Text on plus and business |
| `on-accent-warm` | `#0F1014` | `#0F1014` | Text on club |
| `meter-empty` | `#D9DCE6` | `#3A3C46` | Empty steps of the condition meter |
| `success` | `#127A4B` | `#4ADE9A` | With icon and word |
| `warning` | `#9A6700` | `#F5B83D` | With icon and word |
| `danger` | `#B3261E` | `#FFB4A9` | With alert icon and word (similar lightness to pink) |
| `on-status` | `#FFFFFF` | `#0F1014` | Text on success / danger |

Hard rules: yellow never as text on paper; small text on pink is white; logos on paper and yellow are pink; no black in logos, tiles or brand blocks.

### 2.2 Typography

`--font-sans: "Readex Pro", "Cairo", system-ui, sans-serif` · `--font-mono: "Geist Mono", ui-monospace, monospace`.

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
| `--chart-1…5` | pink, yellow, violet, orange, cobalt | dark-theme equivalents | various |

Add every other token from `tokens.css` and expose them in `@theme inline` as `--color-*` (`bg-idea-pink`, `text-pink-text`, `bg-surface-sunken`, `bg-plus`, `bg-business` …). Remove `--academy`, `--launcher` and `--suite` (renamed `--business`) and `--bulb-empty` (renamed `--meter-empty`).

Fonts (`packages/design-system/lib/fonts.ts`): load **Readex Pro** with `next/font/google` (subsets `latin` and `arabic`, weights 400, 500, 600, 700) as the first `--font-sans` family; keep Cairo as the Arabic fallback; keep Geist Mono. (Poppins, the previous Latin font, was removed on 2026-10-25.)

## 4. Components

| Component | Spec |
| --- | --- |
| `BrandLogo` (exists) | Props `variant: 'on-light' \| 'on-pink' \| 'on-yellow' \| 'on-dark'` and `line?: Line`. On light and yellow: pink bulb and pink wordmark; on pink and dark: yellow bulb and white wordmark. Readex Pro 700, −1% tracking. Never black. English always `dir="ltr"`. |
| `Button` (exists) | `default` = pink / white; `brand` (new) = yellow / dark text, for use on pink grounds; `outline` = transparent + `border-strong`; `ghost`; `plus` = violet / white (only "Rent with The IDEA Plus"); `destructive` = danger. Heights 36 / 44 / 52, `radius-md`, 2px focus ring offset 2px. |
| `Highlight` (new) | Yellow swipe with dark text on paper and dark; inside pink grounds the words turn yellow, no swipe. One per headline. |
| `BulbKicker` (new) | Small bulb (20–28px) centred above a headline: yellow on pink and dark, pink on paper and yellow. |
| `PinkBand` (new) | Full-width pink band, yellow bulb kicker, white headline with one yellow Highlight, yellow `brand` button. Once per page. |
| `NameTile` | Circle (or `shape="square"` at 22%) with one Readex Pro 700 word: `public` = white on pink (Club, Plus); `internal` = pink on yellow (Staff); no word = yellow bulb on pink. Sizes 32–128. The Droid uses his own face, not a tile. |
| `SouqPrice` (new) | Market line small and struck ("بالسوگ بـ 150,000" / "In the market"), then ours large and bold ("يمنا بـ 99,750 دينار عراقي" / "With us … IQD"); the number in `pink-text` on paper, yellow on pink at 24px+. Renders the market line only when `marketPrice` and a `checkedAt` within 7 days exist. |
| `ConditionLabel` (replaces `ConditionBulb`) | A four-step meter (`logos/condition-*.svg` shape: bars rising left to right, filled steps in `idea-pink`, empty in `meter-empty`) + the word, as a pill with `border-strong`: `new` 4/4 (جديد / New), `open_box` 3/4 (اخو الجديد / Open box), `refurbished` 2/4 (مجدّد / Refurbished), `used` 1/4 (مستعمل / Used). Maps the stored `stock_items.condition` one to one (open box and refurbished are no longer merged). Not shown on rentals; never a bulb icon. The meter does not mirror in RTL. |
| `BulbsAmount` (new) | The yellow bulb icon + a number + "Bulbs" (with the IQD value in `ink-muted` where useful: "120 Bulbs · 12,000 IQD"). The only place the bulb icon appears in the product UI. |
| `PlanMark` (new) | "Plus Glow", "Plus Shine" or "Plus Blaze" in `plus` with the item count after a middle dot ("Plus Shine · 2 items at a time"). Used on plan cards, the Pass card badge and product rental buttons. |
| `Badge` (exists) | Tones: neutral, brand (pink), highlight (yellow), plus, club, business, success, warning, danger (status needs an icon). Remove academy, suite and launcher. |
| `PlanCard` | `radius-xl`; `PlanMark` as the title, price per month, the plan's perks and Bulbs rate; Plus Shine is the featured plan (2px `plus` border, violet flag "Most chosen", pink primary button); others outline. |
| `ProductCard` | Image on `surface-sunken`; badge top-start; 2-line name; `SouqPrice` or price; `ConditionLabel` for copies for sale; age rating for games; full-width CTA: pink "Buy", or for rental-only items "Rent" with "worth …" in small print. |
| `PassCard` (exists) | Pink for everyone with the yellow bulb; badges for the Plus plan (`PlanMark`), Student and Staff; Bulbs balance via `BulbsAmount`. No tier colours. |
| `TopBar` and `TabBar` | Top bar: logo, search, Saved (heart, with count), Cart (with count), Pass on desktop; hidden on sign-in and checkout. Phone tabs: Store, Plus, Club, Pass. |

## 5. Assets and naming

- Favicon, app icons, Capacitor splash: `logos/app-icon.svg` (yellow bulb on pink). Splash: pink background, yellow bulb centred.
- `theme-color`: `#D81B60`.
- Social avatar and Telegram channel: `logos/avatar-the-idea.svg`. Name tiles: `logos/tile-club.svg`, `tile-plus.svg`, `tile-staff.svg`. The Droid: `logos/droid-avatar.png` (bot profile photo) and `droid-hero.png`.
- Email templates (`packages/email`, Supabase auth templates): pink header with `lockup-on-pink.svg`, paper body, pink button.
- Open Graph template: pink ground, yellow bulb kicker, white title with one yellow word.
- Names in copy and messages files: The IDEA Store, The IDEA Plus (Plus Glow, Plus Shine, Plus Blaze), The IDEA Club, The IDEA Pass, The IDEA Business, The IDEA Droid. Never Megastore, Suite, Spark, The IDEA Post, Discover, Academy, Launcher or Bulbs tier names.
- Brand line in messages: "اعلگها" (ar) / "Switch on." (en).

## 6. Quality gates

- [ ] Arabic (RTL) and English (LTR), Paper and Dark themes all checked
- [ ] No raw hex in components; tokens only
- [ ] No black (`ink`) in any logo, tile, band, brand block or the Droid
- [ ] The bulb icon appears only for Bulbs; condition always as `ConditionLabel`
- [ ] Contrast: text 4.5:1 (3:1 at 24px+), controls and focus 3:1, both themes
- [ ] Yellow never as text on paper; small text on pink is white
- [ ] `bun run check:rtl` and `bun run check:i18n` pass
- [ ] Status colours always with an icon and a word
- [ ] Storybook (The IDEA Design) stories for every changed component, both themes and directions
- [ ] Playwright + axe journeys pass
