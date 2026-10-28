# Owner decisions, 28 October 2026

The owner's decisions on Program Revision v2, item 11 (selling in
Partners) and related points, as given. They replace earlier answers and,
where they differ, the v2 brief (for example Bulbs: 1 Bulb = 1 IQD
replaces the brief's 1 Bulb = 10 IQD). The order of work is in
`PROGRESS.md` (Decisions, 2026-10-28).

The IDEA Space is left out entirely for now: build nothing for it and
remove any mention of it from copy.

## 1. Listings: automated, Amazon-style

- The shop scans or types the ISBN or barcode, or searches by title.
- **If the product exists,** the shop must pick it. It adds only its
  offer: condition, price, stock and its own SKU. The SKU is the shop's
  private code; ISBNs and barcodes identify the product for everyone.
- **If it doesn't exist,** the shop creates it and it goes live at once.
  Details fill in automatically (section 14).
- **Automatic checks on every new product:** required fields, a photo,
  banned items and likely duplicates. Flagged products go to Staff → Inbox
  to merge or fix.
- **Wrong details:** shops can flag them but never edit products directly.
- **Spreadsheet upload,** free for every shop: ISBN or barcode, condition,
  price, stock, SKU. Each row matches an existing product or creates a new
  one.
- **Visibility:** products show in the Store only when they have at least
  one offer. Searching for a title with no offers shows "Notify me".
- **Bundles:** a shop can list several of its own items as one offer, for
  example a turntable plus 3 records.

## 2. Shop orders, pickups, labels and calls

- **What shops see in Partners:**
  - the order number, item, condition and quantity;
  - their price and the payout after commission;
  - the customer's **first name and area** ("Ali · Karrada");
  - the ready-by time.
- **What Partners screens never show:** the phone, full address or email,
  and there's no customer list or export. The label is the only place a
  shop sees these details (see "The label" below). Questions go through
  messages on The IDEA.
- **Pickup locations:**
  - When a shop joins, Partners creates its Boxy pickup location through
    `POST` Create Pick-up Location, with type `WAREHOUSE`. Fields:
    - `full_name` and `phone`: the shop's pickup contact, entered in
      Partners → Settings → Pickup;
    - `address_text`, `lat` and `lng`.
  - Store the returned `uid` on the shop. Every order for that shop sends
    it as `saved_pick_up_address_uid`, so the courier calls the shop's own
    contact, never The IDEA.
  - Edits in Partners call Update Pick-up Location.
  - A shop with several branches gets one location per branch.
- **"Ready for pickup":**
  - creates the Boxy order (bulk when several are ready);
  - shows **Print label** using Boxy's label endpoints (single or bulk PDF,
    4×6 thermal or A4);
  - requests the pickup (bulk when there are several parcels).
- **No "Scan label":** Boxy's API can't attach ready-printed labels. The
  courier scans the pickup barcode on the label.
- **Who calls whom:**
  - **At pickup:** the courier calls the shop's pickup contact.
  - **At delivery:** the courier calls the customer on the phone given at
    checkout, the `contact.phone` sent to Boxy.
  - **Delivery problems** (no answer, wrong address, refused): Boxy's
    status webhook opens a case. The IDEA's support contacts the customer;
    the shop isn't involved.
  - **Wrong numbers cause failed deliveries,** so phone verification
    becomes required for every delivery order, not only cash on delivery.
- **The label:**
  - Boxy's label shows what the courier needs: the customer's name, phone
    and address. Print a sandbox label to confirm the fields.
  - The shop sees these details for one parcel, at the moment it packs it.
    That's normal; Amazon and Noon sellers who ship their own orders see
    the same.
  - Partners terms forbid shops from contacting customers or keeping their
    details off-platform.
  - The privacy policy says plainly that the customer's name, phone and
    address go to the shop and the courier for delivery.
  - Labels can be reprinted only until pickup.
- **Out of stock:** an "Out of stock" action cancels and refunds that line,
  and counts against the shop.
- **Late lines:** lines not marked ready within 2 days go to Staff → Inbox.
- **Delivery cost:** store Boxy's actual fee from each order's response.

## 3. Returns

**Steps:**

1. **The customer requests it** within 14 days of delivery, with a reason
   (wrong item, faulty, not as described, changed mind) and photos.
2. **The shop accepts or disputes it** in Partners → Selling → Returns
   within 48 hours. Silence counts as accepting.
3. **Staff decide disputes** within 48 hours. Wrong-item and never-arrived
   cases are approved automatically.
4. **The return is collected.** Boxy's API has no return or reverse-pickup
   order: an order is always picked up from a saved merchant location
   (`PICK_UP`) or dropped at Boxy (`DROP_OFF`), and `contact` is always the
   receiver. So:
   - **Try a workaround in sandbox first:**
     - create a temporary pickup location at the customer's address, with
       the customer's name and phone;
     - create an order from that location with the shop's pickup contact as
       `contact`, `PREPAID`;
     - request the pickup;
     - delete the temporary location once the order is collected.
   - **If Boxy rejects or limits that:** Staff book the return in Boxy's
     dashboard from the Inbox case. Ask Boxy whether a reverse-pickup order
     type is planned.
   - Either way, store the fee from Boxy's response.
5. **The shop confirms the item's condition** within 48 hours.
6. **The refund goes out the same day:**
   - **paid online:** through Wayl's refunds API, with an automatic reason
     of at least 100 characters (order, item and return reason);
   - **cash orders:** a manual ZainCash, Qi or bank transfer that Staff mark
     as done;
   - **Bulbs spent on the order** come back as Bulbs.

**Delivery costs on returns:**

- **Refused or not received at the door:** costs nothing. The whole round
  trip is free, and Boxy brings the parcel back automatically
  (`returning-origin`, then `returned`; `partially-delivered` if the
  customer keeps only part).
  - On `returned`, the shop confirms the item came back, the line is
    cancelled and any online payment is refunded in full.
  - Because refusals still tie up a shop's stock, a Pass with 3 refused
    cash orders must pay online from then on (a setting).
- **Returned after delivery:** this is a new paid Boxy delivery. Record its
  actual fee. Who pays:
  - **shop at fault** (wrong, faulty, not as described): the shop, from its
    pending payout or deposit;
  - **changed mind:** the customer, deducted from the refund;
  - **The IDEA's mistake:** The IDEA.
- **Returns policy page:** "Refusing at the door costs nothing. After you
  accept, return delivery is free when the item is wrong or faulty; for
  change of mind, its cost comes out of your refund."

**Rules:**

- **Changed mind:** unopened items only. Opened games, films and music
  can't be returned for change of mind.
- **Digital codes:** can't be returned once revealed (section 13).
- **No store credit:** refunds always go back to the way the customer paid.
- **Shop score:** built from valid returns, cancellations and late pickups.
  It affects visibility.

## 4. Plans and commission

- **Default commission, editable in Staff (standard / Pro):**

  | Category | Standard | Pro |
  |---|---|---|
  | Books, Music and Films | 12% | 10% |
  | Games | 10% | 8% |
  | Gear | 7% | 5% |

- **Free plan:** up to 100 active listings, spreadsheet upload and basic
  insights.
- **Pro plan:** 49,750 IQD a month or 497,500 IQD a year, taken from
  payouts. It includes:
  - commission 2 points lower;
  - unlimited listings;
  - the seller API;
  - 20,000 IQD a month of promoted-listing credit (advertising credit in
    IQD, not Bulbs, with no carry-over);
  - full insights;
  - priority support.
- **Not in Pro:** no badge shown to buyers and no faster payouts.

## 5. Payouts and payments (Wayl)

- **Payouts:** Wayl has no payout API, so Staff run a weekly payout batch.
  - It lists what each shop is owed after the return window. Deducted:
    commission, refunds, the Bulbs credit and the Pro fee.
  - Export it, transfer by bank, ZainCash or Qi, then mark each shop paid.
  - Each shop gets a statement per line.
- **Checkout:** Wayl has no saved cards. Remember each customer's preferred
  payment method and default address, so checkout is one tap away from
  Wayl's page.
- **Subscriptions:** check whether Plus and Pro can renew automatically
  through Wayl subscriptions. Record the answer in PROGRESS.md.
- **Partial refunds:** test one in Wayl's test mode before relying on them.
- **Not offered:** no IDEA wallet, no store credit, no IDEA gift cards.

## 6. Verification (build each part with the stage that needs it)

- **Phone:** a one-time code to an Iraqi number by SMS or WhatsApp.
  Required for every delivery order and for buying digital codes. Build it
  now.
- **Identity:** photos of both sides of the National Card plus a selfie,
  reviewed in Staff.
  - Required for people who sell, receive payouts, bid above a set amount,
    or rent without a deposit.
  - Keep only the result, name and date; delete the images after review.
  - Stage 4.
- **Shop** (stage 2):
  - **registered** (commercial registration plus the owner's ID): no
    limits;
  - **individual trader** (the owner's ID only): a monthly sales limit, set
    in Staff.
- **Organization:** domain verification or an official letter. Student
  societies also upload their university's approval. Stage 5.
- **Educator badge:** a staff email, staff card or employer letter. Same
  perks as students, including Plus at 20% off. Stage 5.
- **One Verification page** in Pass → Settings and in Partners →
  Organization. Every review goes to Staff → Inbox.

## 7. Prices and discounts

- **Remove the souq price entirely:**
  - the `SouqPrice` component;
  - the market price fields and their columns (via a migration);
  - its messages and its design site story.
- **Product pages:** offers sorted by price, with "Lowest price" marked.
  Every listing shows "Lowest in the last 30 days", taken from price
  history.
- **Struck-through "was" prices:** allowed only if that offer sold at that
  price for at least 15 of the last 30 days. Enforced automatically.
- **Shop sales:** a sale price with start and end dates, and quantity deals.
- **Campaigns:** Staff create seasonal campaigns. Shops opt in with their
  own discount and are featured on the campaign page.
- **Coupons:** paid by The IDEA, within the existing cap of 20% of an order
  given away in total.
- **Student price:** shown only to verified students and educators.

## 8. Boxes and kits

- **Remove boxes entirely:**
  - delete all current boxes, the 3 live and the 3 seasonal drafts;
  - remove the box product type, pages, components, messages and automatic
    archiving (via a migration).
  - Past orders keep their line names so order history still reads
    correctly.
  - Shop bundles (section 1) replace boxes.
- **Kits:**
  - Keep the booking system.
  - Kit units can belong to supplier shops: the shop lends the kit, The
    IDEA runs the booking, and the shop is paid a fee per booking in
    Partners → Supply.

## 9. Catalog changes

- **Gear:** merge Audio and Tech into one category, Gear (via a migration,
  with search and links updated).
- **Films:** keep everything: Plus, single rentals and sales.
  - **Improvement:** up to 3 films, books or games can be rented together
    for one delivery fee.
  - The normal free-delivery threshold applies.
- **Textbooks** in Books: semester rentals with term dates set in Staff,
  and resale between students each term.
- **New categories:**
  - board games and tabletop, also rentable in Plus;
  - comics and manga, under Books;
  - trading cards;
  - digital codes (section 13).
- **Send as a gift:** one checkout flow for everything (products, Plus
  plans, kits, event tickets, programs).
  - The buyer hides the price, adds a message and can pay with Bulbs.
  - The recipient gets a link. For a physical item, they enter their own
    address. For anything else, it's added to their Pass.
- **No pre-orders.** "Notify me on release" covers upcoming titles
  (section 10).

## 10. Saved and the Plus queue (rework)

**Today:** the heart fills one wishlist, and the Plus queue is the
rentable items in that same list, in order. Saving to remember something
and choosing what to rent next are mixed together.

**The rule:** Saved is what you're watching; the bell is what happened.
Nothing appears in both, and Saved has no tab of its own for alerts or
news.

**New structure,** with one place to find it: Pass → Saved, opened from
the heart in the header (section 11). Saved has three tabs:

- **Saved:** everything hearted.
  - Each item shows its current state: Price dropped · Back in stock · Out
    now · Rentable now · Coming soon · Unavailable.
  - Filter chips: All · On sale · In stock · Coming soon.
  - Sort by recently saved or price.
  - Each item has a small bell toggle, "Tell me", which is on by default.
    Items not yet in stock or released are what "Notify me" saves. An
    optional price target ("tell me under 25,000 IQD") sits on the same
    toggle.
  - When a watched change happens, it goes to the bell (and to push and
    email, following notification preferences), and the item's state
    updates here.
  - Actions: Add to cart, Add to queue (Plus members), Move to list,
    Remove.
- **Lists:** named lists such as "Birthday" or "Semester 2 textbooks".
  - Each list is private or shared by link.
  - A shared list works as a gift list: friends open it and use Send as a
    gift, and the item goes to the list owner's default address without
    showing it to the friend.
  - Imports (section 14) land in a list named after the source (for example
    "From Goodreads").
- **Queue** (Plus members only): what to rent next, in order.
  - It's separate from the heart: rentable product pages show **Add to
    queue** to Plus members.
  - Drag to reorder. Swaps take from the top.
  - Migration: copy each current Plus member's rentable wishlist items, in
    order, into their queue.

**Also:**

- **Cart → "Save for later":** moves an item to Saved.
- **Signed out:** hearting saves in the browser and merges into Saved at
  sign-in.
- **Badges:** the heart has no badge. Only the bell counts unread news, and
  the cart counts its items.
- **Data:**
  - `saved_lists`, plus a nullable `list_id` on `wishlist_items`;
  - `notify` (boolean, default true) and `price_target` (nullable) on
    `wishlist_items`;
  - `rental_queue_items`.
  - Each table has RLS policies and pgTAP tests.

## 11. Header, tabs and no footer on phones

**Header:**

- **Desktop:** logo · Store · Plus · Club · search · Saved (heart) · bell ·
  cart · Pass.
- **Phones (web and the apps):** logo · search · Saved (heart) · bell ·
  cart.
- **Bottom tabs on phones:** Store, Plus, Club and Pass, as today. The cart
  stays in the top bar only, so nothing repeats. Fix AGENTS.md, which
  wrongly lists Cart as a tab.

**One cart for everything bought once:**

- physical products, bundles, single rentals, kit bookings, paid event
  tickets, programs and digital codes;
- gifts of any of these, and Plus plans given as a gift (a set number of
  prepaid months).
- If the cart holds digital codes, the whole order must be paid online.
  Codes are delivered instantly; physical items ship as normal.
- Free RSVPs never touch the cart.

**Subscriptions skip the cart.** Starting or changing Plus, and the Pro
plan for shops, use their own Subscribe checkout from the plan page,
because they renew and have their own terms.

**No footer on phones or in the apps.** Hide it below the `md` breakpoint
and in the iOS and Android apps. Desktop keeps its one slim line.

**Where the footer's contents go on phones:**

- **My Pass → "About & help"**, at the bottom of My Pass for everyone
  (signed-out visitors see it under the sign-in card). It links to /about,
  which already holds About, Careers, FAQ/Help, Contact, For partners and
  Legal.
- **Language and theme:** Pass → Settings, and also on /about for
  signed-out visitors.
- **Social links:** on /about.
- **Version and build:** at the bottom of /about, for example "Version
  2.4.0 · build abc123". Tapping it copies both for support.

## 12. Bulbs: 1 Bulb = 1 IQD

- **Migration:** multiply existing balances and every bonus amount by 100,
  so nobody loses value.
- **Earning:**
  - 1% for everyone, and 2% / 3% / 4% for Plus Glow / Shine / Blaze;
  - earnings are rounded to whole Bulbs;
  - digital codes earn no Bulbs (section 13).
- **Spending:**
  - on purchases only, in steps of 250 Bulbs, with a minimum of 1,000 Bulbs
    per order;
  - no cash-out and no transfers between people. Gifting is through Send as
    a gift.
- **Survey rewards:** paid in Bulbs. Creators buy them at 1 Bulb = 1 IQD.
- **Expiry:** Bulbs expire after 12 months with no earning or spending,
  with a reminder 30 days before.
- **Display:** "2,340 Bulbs" with "= 2,340 IQD off" beside it.
- **One rule in all copy and code:** prices, payments, payouts, fees and
  deposits are in IQD; rewards, bonuses and anything The IDEA gives away are
  in Bulbs.
- **Shop items:** when Bulbs are spent on a shop's item, The IDEA credits
  the shop the discount against its commission.
- **Rewards policy:** update the page to match.

## 13. Digital codes (stage 6, after Opportunities)

**Suppliers:**

- **Start with Reloadly** for development and launch:
  - free developer account, sandbox and API;
  - pay as you go from a prepaid USD balance, with no monthly fee;
  - more than 300 gift card brands.
- **Add LikeCard** once their business terms are agreed. It's a regional
  distributor with an Iraq site and a B2B API, and it covers regional
  brands (Anghami, Shahid, PUBG UC, Saudi and UAE store cards).
- **Golden Codes**, which runs MyPinCard in Iraq, is the local fallback if
  a USD balance abroad is hard to fund.
- **Not used:** grey-market key sites.
- **Owner task:** compare each supplier's discount on the top 10 brands
  before choosing. Record the result in PROGRESS.md.

**Regions:**

- Iraq has no PlayStation, Xbox or Nintendo store region; people use US,
  UAE, Saudi or other accounts.
- Every code shows its region clearly ("PlayStation · US store · $20").
  Checkout asks "Which store is your account on?" the first time and
  remembers the answer.

**Delivery:**

- The code appears in Pass → Orders and by email once payment clears.
- Revealing it is a deliberate tap.
- It can't be returned once revealed. If the supplier marks a code invalid,
  The IDEA replaces it.

**Payment:**

- Online only.
- No Bulbs earned or spent, and no coupons: margins are too thin.

**Fraud controls:**

- phone verification;
- low limits for new Passes (a setting);
- a hold on large first orders;
- every purchase logged.

**Website only:** hidden in the iOS and Android apps, per the native
checkout rule in AGENTS.md.

**Price:** each brand's price is the supplier cost plus a margin set in
Staff. Prices are shown in IQD.

**Not offered:** no account rentals and no e-book or music files. Arabic
e-book and audiobook services are offered as codes where a supplier
carries them.

**Secrets:** the supplier API keys live only in `apps/api`.

## 14. Connections and standards (free; build each with the stage that needs it)

- **Product data, on listing and import.** Store the external ID on each
  product. Barcodes follow GTIN (EAN-13, UPC).
  - **Books:** Open Library and Google Books;
  - **Music:** MusicBrainz, the Cover Art Archive and Discogs;
  - **Games:** IGDB (age ratings stay PEGI);
  - **Films:** TMDB;
  - **Board games:** BoardGameGeek;
  - **Trading cards:** Scryfall and the Pokémon TCG API.
- **"Import your list"** in Pass → Saved → Lists:
  - Goodreads, StoryGraph and Letterboxd exports, matched by ISBN or title;
  - Discogs wantlist;
  - Steam wishlist.
  - Matched items join the list with price-drop alerts. The rest get Notify
    me.
- **"Vinyl from artists you listen to":** an optional Spotify or Last.fm
  connection.
- **Search and shopping:**
  - schema.org Product and Offer markup;
  - sitemaps with Arabic and English alternates;
  - a Google Merchant Center feed (check that Iraq is supported);
  - a Meta catalog.

## 15. Certifications and verifications (owner tasks; note them in PROGRESS.md)

- **Free, now:**
  - SPF, DKIM and DMARC;
  - Meta Business verification;
  - Google Search Console and Bing Webmaster Tools;
  - the PCI SAQ A self-assessment;
  - a WCAG 2.2 AA accessibility statement.
