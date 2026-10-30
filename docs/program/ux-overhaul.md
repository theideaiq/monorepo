# The UX overhaul (owner's decisions, 30 October 2026)

The plan the owner approved on 30 October 2026, as built in one pull
request. The illustrated proposal is the artifact "The IDEA UX Overhaul";
this file is the spec the code follows. Where they differ, this file wins.

Decisions taken (the proposal's recommendations, with three changes):

- **Four phone tabs, as today: Store · Plus · Club · Pass.** There is no
  Library tab. The Library (what you bought, borrow, queued, saved and
  booked) is the top of the Pass, and its pages live under `/pass/…`.
- **No redirects.** Moved pages simply move. Old notification links keep
  working through `currentAppPath` in
  `packages/internationalization/app-paths.ts`, which maps them to the new
  addresses.
- **One pull request** for all of it: schema, website, Partners, Staff.
- Plus has its own shelves over the same products (D2). Family is today's
  Duo price; kids' profiles are free and share the plan's items (D4, D5).
  Kids under 13 are profiles inside the parent's Pass with no sign-in of
  their own (D6). Our brand everywhere, Plus screens darker and
  cover-led (D7). Partners: `/selling/*` → `/sell/*`, `/organization/*` →
  `/settings/*` (D8). Staff: one Inbox for every decision (D9).

## Principles

1. **One catalogue, many doors.** A product exists once; the Store, Plus,
   search, campaigns and shop shelves all open the same product page.
2. **Browse and Yours are separate.** Store, Plus and Club are for
   finding; the Pass holds what's yours.
3. **A page is an address.** No page behind `#hash` or a `?tab=` that
   changes what the page is. Tabs inside a page are fine.
4. **What needs you comes first** on every home screen.
5. **One primary (pink) action per screen,** in the phone's bottom dock or
   at the end of the page header / sticky side panel on wide screens.
6. **State in words** with an icon: "Arrives Tuesday", "Short wait".
7. **Arabic first,** mirrored completely (logical CSS only).
8. **Same pattern, same meaning** across the three apps (shared
   components in `@repo/design-system`).
9. **Pictures carry the page.** No product without a picture; cards are
   mostly cover art.
10. **Ask once.** Inline confirmations that state the consequence; no
    stacked modals.

## Button placement

| Situation | Phone | Wide screen | Style |
| --- | --- | --- | --- |
| Main action | Bottom dock (full width, or at the end of two) | Page header at the end, or the sticky side panel | Pink, says the result ("Pay 100,250 IQD") |
| Second action | Dock, at the start | Before the primary | Outline |
| Other actions | ⋯ in the top bar | ⋯ at the end of the header | Menu |
| Destructive | Inside ⋯ or bottom of settings | Inside ⋯ or the settings' danger area | Red text, inline confirm with the consequence |
| Row action | ⋯ on the row | One quiet button at the row's end | Grey |
| Bulk | Bar above the tabs | Bar replaces the list header | Count + actions |
| Forms | Sticky Save when something changed | Sticky Discard · Save bar | Disabled with the reason |
| On a pink panel | Yellow button, dark text | Same | One per page |

Tap targets ≥ 44px; labels are verbs ("Add to queue"); loading keeps the
label and width.

## Website (`apps/app`)

### Navigation

- Phone tabs: Store · Plus · Club · Pass (unchanged). Top bar: logo ·
  search · Saved (heart) · bell · cart (unchanged rules).
- Wide screens: logo · Store · Plus · Club · search · Saved · bell · cart ·
  Pass avatar (unchanged).

### Addresses

| Page | Address | Was |
| --- | --- | --- |
| Store home (For you shelf) | `/` | same |
| Category shelf | `/store/<category>` (top-level category slugs; a product slug never equals one) | `/store?category=` |
| Deals | `/store/deals` | new |
| Product | `/store/<slug>` | same |
| Auctions | `/store/auctions`, `/store/auctions/<number>` | same |
| Campaign | `/store/campaigns/<slug>` | same |
| Gift cards and codes (website only) | `/store/codes` | same |
| A shop's shelf | `/store/shops/<shop>` | new |
| Game night kit | `/store/kits/<kit>` | `/kits/<kit>` |
| One-off rent | — | `/rent/<slug>` (removed) |
| Plus home | `/plus` | same |
| Plus shelf | `/plus/<category>` | new |
| Plans and joining | `/plus/plans` | `/plus#join` |
| Your plan (change, pause, cancel, Family) | `/plus/plan` | `/plus#yours` |
| Family invite | `/family/<code>` | `/plus/duo/<code>` |
| Club home | `/club` | same |
| Events | `/club/events`, `/club/events/<slug>` | `/club?show=events`, `/club/<slug>` |
| Opportunities | `/club/opportunities`, `/club/opportunities/<slug>` | list new |
| Surveys | `/club/surveys`, `/club/surveys/new`, `/club/surveys/<id>`, `…/results`, `…/certificate` | list new |
| Read (posts) | `/club/read`, `/club/read/<slug>` | `/club#read`, `/club/<slug>` |
| Pass (card + Library overview) | `/pass` | same |
| Orders | `/pass/orders`, `/pass/orders/<id>` | same |
| At home (Plus rentals) | `/pass/at-home` | `/plus#yours` |
| Queue | `/pass/queue` | `/pass/saved?tab=queue` |
| Past rentals | `/pass/history` | new |
| Saved, Lists | `/pass/saved`, `/pass/lists` | `/pass/saved?tab=` |
| Tickets, Applications | `/pass/tickets`, `/pass/applications` | `/club#yours` |
| Codes you bought | `/pass/codes` | inside orders |
| Bulbs | `/pass/bulbs` | same |
| Family | `/pass/family` | Settings → guardian, `/plus#yours` Duo |
| Settings | `/pass/settings` (list), `/pass/settings/<section>`: `profile`, `sign-in`, `phone`, `connections`, `addresses`, `notifications`, `privacy`, `appearance` | `/pass/settings#…` |
| Cart, checkout | `/cart`, `/checkout` | same |
| The rest | `/search`, `/help`, `/about`, `/careers`, `/partners`, `/legal/<policy>`, `/verify`, sign-in and shared links | same |

### Store

- Shelf tabs: For you (`/`), each top-level category, Deals.
- `/`: campaign hero · your Bulbs (signed in) · New this week · Live
  auctions · Because you saved … (signed in) · Back in stock · In Plus ·
  the Pink Band (join Plus).
- Category: subcategory chips, rows (New, Bestsellers, In Plus, Used
  deals), "See all" grid with filters (side panel on wide screens, a
  "Filter (n)" sheet on phones; active filters as removable chips; sort at
  the header's end).
- Cover cards: cover art first, title, price in Geist Mono, a small
  Plus mark (yellow on pink) when the product is in Plus. Products without
  a picture are never listed.

### Product page

- Pictures at the start, the story in the middle, the **Get it** panel at
  the end (sticky on wide screens; inline above the tabs on phones).
- Get it lists every way, in this order: Buy new · Buy used/open box (from
  us and shops, "from" price, number of offers) · Plus · Auction · Make an
  offer. Choosing one sets the primary button: "Add to cart · 69,750",
  "Choose a copy", "Add to queue", "Join Plus to play", "Bid 125,000".
- Phone dock: Save (outline) at the start, the primary at the end. Share
  and Gift in the top bar's ⋯.
- The Plus row: not a member → "In Plus · from 14,750/month" + Join Plus
  to play; member covered → availability + Add to queue (then "In your
  queue · #3"); tier too low → "In Plus with Blaze" + Upgrade; at home →
  "At home since …" + Keep it / Send it back; kid's profile and an 18+
  game → not shown.
- Availability, in words: Available now · Short wait · Long wait · Coming
  to Plus (`public.plus_availability`).
- Under the price: "Lowest in 30 days" and the Bulbs earned.
- No one-off rent anywhere.

### Plus

- `/plus` for a member opens on the household's slots ("At home 2 of 2",
  what's next, Send one back), then category chips and rows (New to
  Plus, Your queue, Most queued, per category) with availability on every
  cover. Darker, cover-led look (Plus surfaces use the dark palette).
- `/plus` for a visitor: the pitch (Pink Band), how it works in three
  steps, the catalogue rows (visitors browse it), the three plan cards.
- `/plus/<category>`: a grid of the category's products in Plus, filters,
  availability.
- `/plus/plans`: the plan sheet: Monthly / Yearly switch; Glow · Shine ·
  Blaze; a Family switch (adds the Duo price difference); the student
  price applied automatically when verified (link to verify otherwise);
  the delivery area check before paying; one button "Join Shine · 22,750
  a month". Waitlist when the area isn't served or Plus is full.
- `/plus/plan`: your plan, change plan, pause, cancel, and a link to
  Family.

### Pass (with the Library)

- `/pass`: the live card (code, Wallet buttons) · Today (only when
  something is due: a delivery today, a rental due back, an event, a
  Family request) · shelves: At home, Up next in your queue, Bought,
  Tickets · Bulbs · Family · Settings list · About and help.
- Each shelf links to its page (`/pass/at-home`, `/pass/queue`, …).
- `/pass/queue`: ordered list with drag (and Move up / Move down buttons
  for keyboards), availability per item, skipped items explained ("Needs
  Blaze"), ⋯ for Move to top, Remove, Buy instead.
- `/pass/orders/<id>`: state in words and a progress line at the top, one
  line per item, quiet links (Return, Help, Receipt), dock action by state
  (Track, Return, Review, Buy again).

### Family

- `/pass/family`: the plan's shared slots, the people (You · manager;
  partner; kids), requests to approve, "Add someone".
- Partner = today's Duo partner (an adult with their own Pass, own
  queue, shares the slots). Invite link `/family/<code>`.
- Kid's profile (under 13): a name and birth date inside the manager's
  Pass, no sign-in. Teens (13–17): their own Pass linked through today's
  guardian link (their orders still wait for the guardian's approval).
- A kid asks for an item (manager picks "Ask to play" on the kid's
  behalf for profiles; teens tap it themselves) → a request
  (`family_requests`) → the manager approves → the item joins the
  manager's queue marked for that kid. 18+ items are never offered.
- Family plans are the Duo plans (`plans.duo`), named "Family" on screen;
  kids' profiles are free.

### Club

- `/club`: this week, featured events and opportunities, the latest
  reads, the Telegram rooms card.
- `/club/events/<slug>`: date, place, RSVP / Get a ticket in the dock.
- `/club/read/<slug>`: headline, reading time, the post.
- Your tickets, applications and the surveys you made are in the Pass.

### Cart and checkout

- The cart holds: products, auction wins, tickets, program installments,
  gift cards (website only) and game night kits. No rent lines.
- Checkout: Cart → Delivery and payment (one page, prefilled; edits in a
  sheet) → Done. Delivery date before paying. Bulbs as a switch with the
  amount. The pay button states the amount. Done shows the order, the
  Bulbs earned and one next step.

## Partners (`apps/partners`)

| Group | Page | Address | Was |
| --- | --- | --- | --- |
| | Today | `/` | Home |
| Sell | Listings | `/sell/listings` | `/selling/listings` |
| | Orders | `/sell/orders` | `/selling/orders` |
| | Offers | `/sell/offers` | `/selling/offers` |
| | Returns | `/sell/returns` | `/selling/returns` |
| | Auctions | `/sell/auctions` | `/selling/auctions` |
| | Promotions | `/sell/promotions` | `/selling/sales` |
| | Payouts | `/sell/payouts` | `/selling/payouts` |
| | Shop settings (application, documents, payout details, pickup branches) | `/sell/settings` | `/selling`, `/selling/pickup` |
| Grow | Supply, Opportunities, Perks, Affiliate | `/supply`, `/opportunities`, `/perks`, `/affiliate` | same |
| Organization | Team | `/team`, `/team/<id>`, `/team/plus` | same |
| | Developers | `/developers` | same |
| | Settings, Members, Billing, Invoices | `/settings`, `/settings/members`, `/settings/billing`, `/settings/invoices` | `/organization/…` |

- **Today** (`/`): key numbers (sales this week, next payout, live
  listings, rating), then every task with its deadline, in deadline
  order, with the action in the row: answer an offer, pack an order,
  check a return, an unpaid auction win, listings hidden for want of a
  photo. Primary "List an item", secondary "Upload a sheet".
- The menu keeps its shape: features not switched on show "Add" instead
  of disappearing; Sell shows "Apply to sell" until approved. Counts only
  where something needs action.
- **List an item:** find first (barcode, ISBN or title), then photos (at
  least one; the button says "Add a photo" until there is one), then
  condition, price and copies.
- A command bar (Ctrl/⌘K) jumps to pages, orders and listings.

## Staff (`apps/staff`)

- **Inbox** (`/`): every decision in one list, filtered by kind (Support,
  Verifications, Product checks, Returns and disputes, Shops to approve,
  Applications, Submissions), with time waiting and owner. "Mine" shows
  what's assigned to you. The item opens in a side drawer with its
  actions; the full record is one click away. Keyboard: J/K to move.
- **Record pages** share one header: breadcrumb · title · status chips ·
  actions at the end (primary last) · key numbers · tabs · activity.
- **Plus** (`/plus`): To ship · Coming back · Swaps · Kits · Members ·
  **Demand** (most-queued products: queued, copies, available, out,
  suggested copies to buy) · Plans. Replaces `/rentals/*`,
  `/finance/rentals` and `/catalog/plans`.
- Menu: Inbox · Orders · Plus · Catalog · Customers · Club · Partners ·
  Finance · Settings, and a command bar (Ctrl/⌘K).
- The product editor leads with pictures; publishing without one shows
  "Add a picture before publishing".

## Database

- `public.plus_availability(product uuid)` → `now` · `short` · `long` ·
  `coming`.
- `public.staff_plus_demand()` for the Demand view (staff only).
- Family: `family_profiles` (kids under 13 in a manager's Pass) and
  `family_requests` (a kid's or teen's request, approved into the
  manager's queue with `rental_queue_items.for_profile` / `for_user`).
- One-off rentals removed: `create_rental_order`, `create_rentals_order`,
  rent lines in the cart, textbook terms and `rental_rates`.
