# Owner decisions, 28 October 2026

The owner's decisions on Program Revision v2, item 11 (selling in
Partners) and related points, as given. They replace earlier answers and,
where they differ, the v2 brief (for example Bulbs: 1 Bulb = 1 IQD
replaces the brief's 1 Bulb = 10 IQD). The order of work is in
`PROGRESS.md` (Decisions, 2026-10-28). Further decisions given the same
day ("part 2", at the end of this file) win where they differ. The brand
update of the same day (`docs/brand/`) makes Partners, Droid and Staff
always short: read any "The IDEA Partners" here as "Partners".

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

---

# Further owner decisions, 28 October 2026 (part 2)

Given the same day, after the decisions above (sections 1–15, "part 1").
Where they differ, these win. Section numbers below are part 2's own;
"section N of the earlier decisions" means part 1. Nothing in the plan is
dropped or postponed. The order of work is in `PROGRESS.md` (Decisions,
2026-10-28).

## 1. Order of work
- **Unchanged:** every item stays in the recorded order of work. Fold the changes below into the step each belongs to:
  - the Bulbs rate (section 2) into the Bulbs step;
  - Make an offer (section 6) into selling;
  - the cleanups (sections 4, 5, 8 and 9) into step 1.
- **After it,** build the remaining items in this order (replacing "digital codes: stage 6, after Opportunities"):
  1. Opportunities;
  2. auctions (section 6);
  3. Get offers from shops;
  4. people selling;
  5. textbooks;
  6. the new Plus features (section 3), then Plus Duo;
  7. digital codes;
  8. Apple Wallet.

## 2. Bulbs: one universal earn rate (replaces section 12's earn rates and its survey line)
- **Rates:** 2% for everyone, and 3% / 4% / 5% for Plus Glow / Shine / Blaze.
- **The same rate applies to everything:** The IDEA's own sales, shop items, rentals, kits, tickets and programs. No exceptions by category or price. Earnings are rounded to whole Bulbs.
- **Still earns nothing:** digital codes and Plus fees.
- **Gear's commission** rises to 9% standard / 7% Pro (section 4 of the earlier decisions), so the top rate stays inside the commission. Books, Music, Films and Games stay as they are.
- **Showing the reward:** product pages show the number, not the rate: "Earn 340 Bulbs". Plus plan cards show the plan's rate.
- **Spending:** Bulbs are spent on purchases and on Plus (section 3). Still no cash-out and no transfers.
- **Bulbs are never sold.** Replace "Survey rewards: paid in Bulbs. Creators buy them at 1 Bulb = 1 IQD" with "Survey respondents earn Bulbs from The IDEA; creators pay for Boosted responses in IQD" (section 7).
- **Policy:** update the rewards policy to match.

## 3. Plus: new features
**Where things live:**
- Plus is the only name; there's no "membership" anywhere (section 9).
- Everything about Plus stays in **Your Plus** on the Plus tab. The Pass home only previews it.
- The queue stays in Saved → Queue (section 10 of the earlier decisions, unchanged). Your Plus shows "Next up" with the first 3 items, linking there.

**The features:**
- **Pay with Bulbs:**
  - Bulbs can cover up to 50% of a month's price, in steps of 250, applied to the next renewal or to prepaid months.
  - Your Plus has "Use Bulbs on my next renewal".
  - If Plus renews through Wayl subscriptions at a fixed amount, Bulbs apply only to manual renewals and prepaid months. Record which in PROGRESS.md.
- **Survey credits:** free response credits on the 1st of every month (10 for Glow, 25 for Shine, 50 for Blaze). They don't carry over, and the amounts are settings.
- **Early access to campaigns:** 24 hours early, or 48 hours for Blaze.
- **Plus price:** a shop can set a Plus price on an offer, shown to Plus members, the same way as the student price. The shop pays for it.
- **Club:**
  - Plus members RSVP 48 hours before everyone else;
  - each event can hold reserved seats for Blaze members, a number set per event;
  - organizers can set a Plus price on paid tickets and programs.
- **Kits:** Shine gets 10% off (Blaze keeps 25%).
- **Swaps:** home swaps only (section 4). When booking one, the next items in the queue are picked by default.
- **Plan cards and the Plus policy:** list all of this per tier.

**Plus Duo:**
- **Who:** a plan holder invites one more Pass.
- **Prices a month:** Glow Duo 20,750 · Shine Duo 31,750 · Blaze Duo 55,750 IQD. Annual plans follow the same 10-months-for-12 rule.
- **The second person gets, on their own:**
  - the plan's Bulbs rate and survey credits;
  - early access, Plus prices and partner perks for Plus;
  - the Plus badge on their Pass card.
- **Shared:** the plan's rental slots and home swaps.
  - Each person keeps their own queue in Saved.
  - Home swaps go to one shared address in a Plus area.
  - Swaps alternate between the two queues by default, and the plan holder can change that.
- **Billing:** the plan holder pays. The student price applies when the plan holder is a verified student.
- **Ages:** a 13–17-year-old can be the second person with their guardian's approval.
- **Ending it:** the second person can leave at any time. The plan holder can remove them from the next renewal; their rentals must be returned first.
- **Gifts:** a Duo can be given through Send as a gift.
- **Data:** `plus_members` (plan subscription, Pass, role holder or partner, invited and joined dates), with RLS policies and pgTAP tests.

**Partner perks** (extend what exists):
- **Audiences:** everyone / students / Plus stay. Add an option to aim a Plus perk at specific tiers.
- **Paired perks:** a partner can link two perks ("10% for everyone", "20% for Plus").
  - The Pass card shows each person the best perk they qualify for.
  - A better perk they don't get yet shows as "With Plus: 20%".
- **Use:** unchanged, checked in Partners once a day per person.

## 4. Remove the counter entirely
- **The counter was part of The IDEA Space.** Remove:
  - Staff → Counter;
  - counter swaps in Plus (copy, the swap booking option, the "unlimited counter swaps" line, plan cards and the Plus policy);
  - any counter sale or pickup code, its messages and its data. Migrations drop what only the counter uses.
- **Plus swaps** are home swaps only: 1/2/4 a month, and 3,000 IQD for an extra one.

## 5. Partners: merge Bulk buying and Plus seats into "Team"
- **One feature, Team (`/team`):** bulk orders for the organization, and Plus for its people (today's seats).
- The feature flag, menu item, Staff pages (Partners → Team) and copy change to match.

## 6. Make an offer and auctions
**Both work inside normal selling,** on copies of products in the catalog. For each copy, the seller chooses **Sell at a price** (optionally with "Accept offers") or **Auction**.
- **Existing products:** an auction sits on that product's page next to the normal offers.
- **New products:** a seller creates the product the normal way (ISBN, barcode or title; pick or create), then picks the format.
- **No Buy now:** a fixed price is normal selling.

**Make an offer** (a switch on a listing: "Accept offers")
- **Allowed on every listing except:**
  - digital codes;
  - rentals and Plus;
  - kits, tickets and programs;
  - items in a sale or campaign (discounts don't stack).
- **Who decides:** the seller turns it on or off per listing. For The IDEA's own stock, Staff turn it on, and offers below the margin floor (Finance → Prices) are declined automatically.
- **How it works:**
  - Offers below 60% of the price are blocked (a setting).
  - The seller accepts, declines or counters, once each way.
  - An offer expires after 48 hours.
  - Optionally, the seller can set an amount above which offers are accepted automatically, and one below which they're declined.
  - An accepted offer goes to the buyer's cart at that price for 24 hours.
- **Limits:** one open offer per buyer per listing, and at most 3 open offers per buyer with the same seller.

**Auctions**
- **Which copies:**
  - copies of products in categories Staff enable for auctions (trading cards, rare and limited vinyl, signed items, first editions, retro games and consoles), or of products flagged Collectible;
  - any copy the seller marks as signed, limited or rare. Staff can review these marks, and a wrong mark counts against the seller's score.
  - Never for new in-print items at their band price, rentals, kits, tickets, programs or digital codes.
- **Photos:** every auction needs the seller's own photos of that exact copy (at least 3) and a condition description.
- **Minimum start price:** 25,000 IQD (a setting).
- **Who can auction:** approved shops, The IDEA (its own collectible copies) and, once people selling is built, people (identity verification required).
- **Where they show:** on the product page next to the normal offers ("Auction · ends in 2 days · current bid 85,000 IQD"), and on Store → Auctions, which lists every live auction.
- **Format:**
  - a start price and an optional hidden reserve;
  - it runs 3, 5, 7 or 10 days;
  - **proxy bidding:** the bidder sets a maximum and the system bids for them, in set increments;
  - **anti-sniping:** a bid in the last 2 minutes extends the auction by 2 minutes.
- **To bid:** phone verification, plus identity verification above a set amount (the existing setting).
- **Paying:**
  - The winner gets 48 hours to pay through checkout, notified by the bell, push and email.
  - If they don't pay, the seller can offer the item to the next highest bidder at that bidder's last bid ("second chance").
- **Non-payment strikes:** each unpaid win is a strike. 2 strikes in 12 months blocks bidding for 90 days; 3 blocks it permanently.

**Both features:**
- **Fees:** commission on the final price, at the category's rate. No listing fees.
- **Where people find them:**
  - bids and offers in Saved;
  - outbid, won, offer received and offer answered notifications in the bell;
  - a seller's auctions and offers in Partners → Selling, and in Staff for The IDEA's stock.
- **Data:** a `collectible` flag on products; `auctions`, `bids` and `offers`, with RLS policies and pgTAP tests. Placing bids and answering offers are SECURITY DEFINER functions in `private`.

## 7. Surveys: Free and Boosted only
**Bulbs are never sold or transferred:**
- Remove the `bulbs` kind (creators paying from their own balance) and the `cash` kind. The kinds become `free` (unchanged) and `boosted`.
- Existing open Bulbs surveys run to completion under the old rules, with held Bulbs returned on close.

**Boosted:**
- The creator pays The IDEA in IQD through a normal order: no Bulbs, no coupons.
- The price is the reward × 1.1 per counted response.
- The IDEA rewards each counted response with Bulbs.
- The survey opens when paid and stays open until it reaches its target or 60 days pass. Unused responses are then refunded through Wayl when the amount is at least 1,000 IQD.

**Rewards by time, not by number of questions:**
- **Rate:** 100 Bulbs per minute of median completion time, from 200 to 2,000. This replaces the length-based `private.survey_reward`.
- **Before opening:** the builder estimates the time from the questions (choice questions, scales and text answers count differently).
- **After the first 10 counted responses:** the reward resets to the real median.
  - If it goes down, the unused amount is refunded at close.
  - If it goes up, collection pauses until the creator confirms and pays the difference.
- **Payment never depends on the answers given.**
- **Withdrawal:**
  - Anyone can quit before submitting.
  - After submitting, a respondent can delete their response until the survey closes. They keep the reward, and the response stops counting toward the target.
- **Closed early:** if the creator closes a survey or it breaks, people who started in the last 60 minutes are still paid in full, at the creator's cost.

**Counting rules (shown before starting):**
- **The start screen shows:** the reward, the estimated time, that there are attention checks, and these rules.
- **A response doesn't count if it:**
  - fails 2 or more attention checks, or
  - finishes in under a third of the median time (or under `min_seconds` before there's a median).
  - One failed check still counts.
- **Explanation and appeal:** the respondent sees why a response didn't count and can appeal once. Appeals go to Staff → Inbox.
- **Creators can't reject responses.** Only these rules decide.

**Bias controls:**
- **Trusted respondents:** after 20 counted answers with no failed attention checks in the last 10, a respondent sees Boosted surveys 24 hours early. During that window they can fill at most 50% of the target. Thresholds are settings.
- **Rotation:** who sees a new survey first rotates among eligible respondents.
- **Daily limit:** each person can answer at most 5 Boosted surveys a day (a setting).
- **Phone verification is required to answer Boosted surveys:** one Pass per person.
- **Quotas:** a creator can cap the share of responses from any value of an existing targeting field (university, major, year, governorate). No quotas on sensitive attributes.
- **"Who answered" box** on the results page and in the export:
  - the breakdown by targeting fields against the target;
  - how many started, finished and were excluded;
  - the median time;
  - the fixed note: "Respondents are The IDEA Pass users who chose to answer, some for a reward. They are not a random sample of Iraq."

**Perks for respondents:**
- **Results summary:** when a survey closes, respondents see a summary. The creator can turn it off for academic surveys that need it.
- **Contributor badge** on the Pass card, with levels at 10, 50 and 200 counted answers.
- **Participation certificate:** a PDF from Club → Yours → Surveys listing the surveys answered (titles, dates and counts, never answers).
  - Its terms say universities giving course credit must offer students another way to earn it.
- **Not offered:** raffles, prize draws or cash.

**Privacy:**
- **Small groups stay hidden:** no breakdown or filter shows a group smaller than 5 people, in results, exports or the respondents' summary.
- **Free text:** the builder warns that free-text answers can identify people.
- **Retention:** raw answers are deleted 24 months after the survey closes, unless the ethics reference states longer. The creator is warned 30 days before.
- **Use of the export:** for the stated purpose only.

**Rules for creators:**
- **Always shown on the survey:** who runs it and its purpose ("Thesis research, AUIB" / "Market research by <organization>").
- **Not allowed:** advertising or sales, asking for contact details, or hiding who runs the survey.
- **Academic surveys on sensitive topics** require the ethics reference as well as staff review.
- **Deception studies** require the ethics reference and a debrief screen after submitting.
- **Policy and builder:** update the surveys policy (`content/legal/surveys.*.md`) and the builder copy to match.

**Unchanged:** targeting, the question checker, attention checks and anonymous results.

## 8. Sign-in methods
- **Remove Microsoft (azure), Facebook and LinkedIn sign-in:** the code, env lists, docs, PROGRESS.md and settings copy.
- **Keep:** email + password, email code, Google, Apple (required in the iOS app) and Telegram.

## 9. Wording: no "membership"
- **Replace "membership" everywhere:** copy in both languages, code names, Staff labels and AGENTS.md.
  - The Pass is "your Pass" / "The IDEA Pass"; Plus is "Plus" / "your plan".
  - Examples: "One membership." gets a new headline; "Your membership" → "Your plan"; "{plan} membership" → "Plus {plan}"; Staff's "Memberships" → "Plus seats".
- **AGENTS.md:**
  - replace "A person's membership *is* The IDEA Pass" with "A person's Pass is The IDEA Pass; never say 'account' or 'membership'";
  - the phone tabs are Store · Plus · Club · Pass, with the cart in the top bar;
  - remove the retired names from the repository map (Spark, Suite, Storybook, design.theideaiq.com, `/post`, Discover tabs).

## 10. Additions
- **Review request:** 3 days after delivery, by push and email, linking to the product's review form.
- **Cart reminder:** one push and email 24 hours after a cart is left with items, for signed-in Passes that allow marketing messages.
- **Empty searches:** Staff → Catalog shows searches with no results (term, count, last seen).
- **WhatsApp order updates:** order placed, out for delivery and delivered, once Meta Business verification is done. Telegram keeps working through the Droid.
- **Key metrics on Staff's home page:** orders per week, new Passes, Plus sign-ups and cancellations, and conversion from cart to paid order.
- **Referrals:** check that referral rewards were converted to 1 Bulb = 1 IQD.

## 11. Other cleanups
- **PROGRESS.md:** remove the "have them reviewed under Iraqi law" and "(legal review)" items. No legal review is planned.
- **Sign in with The IDEA Pass for other sites:** offered only to SAL until the outside security review is done.
- **Finance (ledger, journal):** no new features. It stays as built.
- **Native apps:** before store submission, make sure push notifications, Google Wallet and the share sheet work. Apple's minimum-functionality review (guideline 4.2) looks for them.

# Master brief

The owner's master brief of the same day brings every decision into one
place. Where it differs from anything above, it wins. What it adds:

## Open questions answered

1. **Store pickup at checkout: removed.** Pickup belonged to The IDEA
   Space and the counter, which are gone. Remove the delivery/pickup
   choice at checkout, `PickupDetails` and `PickupLocation` in
   `@repo/commerce/catalog`, their messages, and the pickup locations data
   and its Staff settings (by a migration). Every order is delivered by
   Boxy: The IDEA's own stock from The IDEA's Boxy pickup location, shop
   items from each shop's own; single rentals, kits and Plus swaps are
   delivered too. Past orders keep showing "Picked up".
2. **The `membership` sign-in scope becomes `pass`.** Its claims
   `member_number` and `member_since` become `pass_number` and
   `pass_since`. Change the allowed lists in `pass_partners` and
   `private.pass_claims` (a migration), `apps/api/lib/oidc/protocol.ts`,
   the consent screen ("Your Pass number and since when you've had your
   Pass."), Partners → Developers and `docs/platform/pass-sign-in.md`. No
   alias: SAL (auibsal.org), the only partner using it, has its
   registration updated in the same change, and its developer gets the new
   names.
3. **`public.memberships` becomes `public.organization_members`,** with
   its indexes and policies, the functions that name it (recreated in a
   new migration), generated types, code and pgTAP tests.
   `organization_members` is for Partners, `plus_members` for Plus Duo,
   and "membership" appears nowhere.

## Brand

- The brand files in `docs/brand/` are the master brief's copy: the
  wordmark is now set in Alexandria Bold and the logo files are redrawn
  with it (lock-ups and name tiles, including `tile-partners.svg` and
  `tile-droid.svg`). The tiles' titles stay short (Partners, Droid, Staff).
- **The wordmark is live text:** `BrandLogo` renders the bulb SVG beside
  "The IDEA" in Alexandria 700 with −1% tracking, never an image of text.
  The apps' copies of the logo files, the email headers and the Open
  Graph image are replaced with the redrawn files.

## Order of work

Skip what's done; one pull request per item, schema first, every item
green before the next.

1. Clean-ups: The IDEA Space out of copy; store pickup removed; the
   counter removed; the souq price removed (code, then the migration);
   boxes removed; Audio + Tech → Gear; the brand tokens, Alexandria and the
   live-text wordmark; names and "membership" wording; the header with
   the Saved heart, no footer on phones, About & help in the Pass and the
   version on /about.
2. Renames: the `pass` scope and `organization_members`.
3. Phone verification, required for every delivery order.
4. The student check: the standalone verify page, the yes/no request for
   partners and the in-person code.
5. Selling: listings, shop orders with Boxy pickup locations and labels,
   returns, commission and the Free/Pro plans, and Make an offer.
6. Payouts.
7. Prices.
8. Saved, lists and the Plus queue.
9. Bulbs at 1 Bulb = 1 IQD with the universal rate.
10. Surveys.
11. Catalog: rent up to 3 for one delivery fee, textbooks, new
    categories, Send as a gift, one cart.
12. Plus features, partner perks and Team.
13. Supply and verification: supplier shops for Plus and kits; identity,
    shop and organization verification; educators.
14. Then, in order: Opportunities, auctions, Get offers from shops, people
    selling, textbook resale, Plus Duo, digital codes and Apple Wallet.

## Part 3: student verification for partners, delivery fees on refunds

Given after part 2 and restated in the master brief; these win where they
differ from earlier parts.

- **Student verification for partners** is a separate service. The IDEA's
  own student badge (Settings, `/verify`) stays as built.
  - A partner starts a verification from its backend with its Sign in with
    The IDEA Pass app credentials and sends the student to
    `theideaiq.com/verify/<id>` (redirect, or a popup on desktop; an
    embedded mode is optional and has no one-tap path). The student goes
    back to the partner's return URL afterwards.
  - A Pass holder with a valid badge shares it in one tap ("Share your
    student status with <partner>?"). Otherwise: sign in (no sign-up
    prompt), the university email with an 8-digit code (verified at once,
    at most 5 codes per address a day), or a document (a student card or
    enrollment proof within 3 months) reviewed in Staff → Inbox, usually
    within 1 working day. No Pass is needed.
  - One verification per partner per person, valid until 30 June. No
    record shared across partners.
  - Partners receive only the status, the university and valid_until,
    through the API and a webhook. The confirmation email has "Delete this
    verification", which notifies the partner. The document is deleted
    after review.
  - Removed: the shared cross-partner record, one-time tickets, rotating
    in-person codes and public check pages. Pass card checks and the card
    embed are unchanged.
- **Remove student status** in Pass → Settings (the student card): removes
  the badge and withdraws a card waiting for review. Partners' own
  verifications stay until deleted from their emails.
- **Delivery fee on refunds:** faulty, wrong or not-as-described returns
  get the original delivery fee back. The shop pays it from its pending
  payout for its items; The IDEA pays for its own stock and its own
  mistakes. Change-of-mind returns don't get it back.
- **Offers on The IDEA's own stock:** no change.

## Part 4: send as a gift

- **One checkout:** "Send as a gift" is a switch on the cart's checkout.
  The buyer picks the area (which prices delivery), adds a message, and
  the price is hidden unless they untick it. Gifts are paid online or with
  Bulbs; never cash, since the recipient shouldn't pay.
- **The link:** shared from the order's page; anyone with it can see the
  gift and accept it once. A new link replaces the old one. The recipient
  needs a Pass to accept, and gives their own name, phone (verified when
  the store requires it) and address in the chosen area.
- **Nothing ships before that:** the database refuses processing,
  shipped or delivered, and shops can't ready the lines, until the gift is
  accepted. Unclaimed gifts aren't expired automatically; staff cancel and
  refund them on request.
- **Privacy:** the buyer's order page shows only the area. The address
  sits on the buyer's order row, so a determined buyer could read it
  through the API; hiding it fully would need a separate address store for
  Boxy and Staff, which isn't worth it yet.
- **Bulbs** for the purchase go to the buyer, as for any order.
- **Not yet:** gifting Plus months and other things added to the
  recipient's Pass; tickets and programs don't exist yet.

## Part 5: one cart

- **Rentals go in the cart.** "Rent it" adds a single rental beside
  what's bought, and everything is one order with one delivery fee. Up to
  3 rentals; several only when they're films, books or games.
- **Money rules for a mixed cart:**
  - deposits are refundable, so they don't count towards free delivery,
    the giveaway cap or cashback, and Bulbs can't pay them;
  - the rent counts towards free delivery and earns cashback, as before;
  - invite and coupon discounts apply only to what's bought (rentals keep
    their rates).
- **Gifts:** a cart with a rental can't be sent as a gift for now, since
  the rental comes back to whoever rented it.
- **Kits** join the cart too: one kit booking per cart (choosing another
  replaces it). Its price counts like rent; its deposit like the others.
  Kits are delivered in Baghdad only, so a cart with a kit checks out to
  a Baghdad address; a kit on its own is still delivered free. Kits
  can't be sent as gifts.
- **Next:** tickets, programs and digital codes join the cart when they
  exist. Subscriptions (Plus, Pro) keep their own checkout.

## Part 6: Plus months as a gift

- **What's given:** 1 to 12 prepaid months of a monthly Plus plan (Glow,
  Shine or Blaze), at its monthly price for each month. Never a student
  price, since the recipient may not be a student; never a yearly plan.
- **Only as a gift.** Plus months go in the cart (one Plus gift per cart)
  and check out with Send as a gift, alone or with other things. Starting
  Plus for yourself stays on the plan page's own checkout.
- **Money rules:** gifted months don't count towards free delivery,
  discounts, the giveaway cap or cashback (nothing is earned on Plus
  fees). Bulbs pay up to half of one month. Months on their own have
  nothing to deliver, so the buyer chooses no area and pays no delivery.
- **Claiming:** the recipient opens the link and claims it; no address is
  asked when nothing is delivered, and the order counts as delivered.
  - **Without Plus:** they need what joining needs (a home in Baghdad and
    a free place, or a waitlist invite; a guardian's permission under 18).
    Plus starts at once on the gifted plan and ends when the gifted
    months are used, unless they choose to keep it.
  - **With Plus:** the months wait. Each renewal uses a gifted month
    instead of an invoice, on the gifted plan; once they're used, the
    member's own plan comes back. A member whose Plus is overdue uses the
    first gifted month at once.
  - **Plus paid by an organization** can't take gifted months, so they
    don't sit unused.

## Part 7: Plus features (step 12)

Step 12 ships in four parts, each schema first: prices; Bulbs on renewal
and survey credits; the Club; partner perks. Team was merged in step 1, and
Plus Duo waits for step 14.

- **Plus prices** work like student prices: a shop (or editors for The
  IDEA's own stock, above the margin floor) sets one below the listing's
  price and pays for it; only Plus members see and pay it; it stays out of
  price history and "was" prices. When a member is both a student and on
  Plus, the lower price wins.
- **Early access to campaigns:** a campaign's discount reaches Plus
  members 24 hours before it opens (48 for Blaze), as their Plus price;
  everyone else gets it when it opens.
- **Kits:** Shine 10% off, Blaze 25%, on the weekend price and extra days.
- **Tickets and programs** have no price yet, so their Plus price comes
  when paid tickets and programs are built.
- **Bulbs on renewals:** Plus renews by invoice (Wayl subscriptions are
  still to be checked), so "Use Bulbs on my next renewal" applies to every
  renewal: the member picks an amount in steps of 250, up to half of the
  next month's price; the invoice takes what they still have then (in
  steps of 250) and the choice resets once paid. If they spend Bulbs
  elsewhere before paying, the renewal spends only what's left. Prepaid
  months (gifts) take Bulbs at checkout, also up to half a month.
- **Survey credits** (10 / 25 / 50 a month, a Staff setting) arrive on the
  1st for every Plus member, company seats included. They don't carry
  over: on the 1st, what's left of last month's grant expires before the
  new one, counting Plus credits as used before credits earned by
  answering.
- **Club:** RSVPs open to everyone at an event's opening time and to Plus
  members 48 hours before. Staff can set the opening; when they publish
  without one it is 48 hours after publishing (at the latest the start), so
  Plus always comes first. Events published before this keep RSVPs open.
  Blaze seats: an event holds a set number of seats for Blaze members;
  others can take only what's left beside the unclaimed Blaze seats, which
  open to everyone 24 hours before the start.
- **Partner perks:** a Plus perk can be aimed at some tiers. Two of a
  partner's perks can be paired; each person sees the better one they get
  (Plus beats students, students beat everyone), and when the better one
  isn't theirs yet, it shows beside theirs ("With Plus: 20%"). Of a pair
  neither person gets, both show, as before. Partners' card check follows
  the same rules.

## Part 8: verification (step 13)

- **Identity:** the member uploads both sides of the National Card and a
  selfie; support reads them in Staff → Inbox, types the name on the card
  and approves or rejects. Only the name and the date are kept; the photos
  are deleted after review. It is ready for the stages that require it
  (people selling, payouts to people, bids above the set amount, renting
  without a deposit); those flows check it when they are built.
- **Educator badge:** a staff email at a listed university (an emailed
  8-digit code, like students) or, for schools and everyone else, a staff
  card or employer letter reviewed by support. It lasts until 30 June like
  the student badge. Educators get every student perk (student prices,
  Plus at 20% off, partner perks for students, creating surveys); the Pass
  card says "Educator", and partners' student checks still answer for
  students only.
- **Shops:** a shop is a registered business (commercial registration and
  the owner's ID: no limits) or an individual trader (the owner's ID only).
  An individual trader may sell up to 5,000,000 IQD in a Baghdad calendar
  month by default (Staff → Settings changes it); cancelled orders and
  refunded lines don't count, and a checkout that would pass the limit is
  refused. New applications are individual traders unless they say
  otherwise; shops approved before this were reviewed with their documents
  and are registered. Staff can change a shop's kind.
- **Organizations:** a company is verified at once by a domain it already
  proved in Partners → Developers, or reviewed by support from an official
  letter. Student societies also upload their university's approval, so
  they are always reviewed. Letters and approvals are kept (they are not
  personal ID); the owners and admins are told the outcome.

## Part 9: supply (step 13)

- **Supplier shops** are approved shops that lend things The IDEA rents
  out: copies join the Plus pool (and single rentals), kit units join game
  nights. The IDEA runs every rental and booking; the member never deals
  with the supplier.
- **Fees:** each supplier has its own fee per rental of one of its copies
  and per booking of one of its kit units, set in Staff. A fee is earned
  when the rental starts or the kit goes out (a rental cancelled before it
  starts earns nothing), once per rental or booking, at the fee in force
  then. Fees are paid with the shop's weekly payout as one Supply line and
  listed one by one in Partners → Supply.
- **Hand-over:** staff record the copies and units a supplier hands over
  (marked as the supplier's) and return them when asked; Partners → Supply
  shows each copy and unit, where it is and what it earned. A monthly fee
  per copy, and shops offering their own single rentals with their own
  deposit and ID check, come later if suppliers ask for them.


## Part 10: opportunities (step 14.1)

- **What they are:** jobs, internships, scholarships, competitions and
  programs, listed in Club → Join with the organization running each one
  (or The IDEA, for its own). `/careers` stays for The IDEA's own jobs.
- **Organizations** add an Opportunities section from Partners → Home and
  post from there. Every listing is reviewed by The IDEA's editors in
  Staff → Club before it appears: approved, sent back with what to change,
  or refused. Changing a listed opportunity sends it back for review; the
  organization can close it early. Owners and admins hear each decision.
- **Applying** happens on the organization's side for now (its link), with
  any fee to applicants shown on the listing. Featuring is a paid extra
  staff switch on until a date, and featured listings are labelled.
- **Notify me:** members follow an opportunity, listed or closed. They
  hear when it opens (again, for yearly programs such as IYLEP or UWC) and
  three days before its deadline. Past its deadline a listing closes and
  stays visible so people can follow it for next time. Organizations see
  how many follow each listing, never who.
- **The IDEA's paid programs** (whole packages with travel insurance, a
  chaperone for under-18 groups, installments, guardian approval, a refund
  schedule, application details from the Pass, passport scans kept per
  application and deleted after) come in their own part.


## Part 11: The IDEA's paid programs (step 14.1)

- **What's sold:** a program The IDEA runs, as one package: its price
  covers everything listed under "What's included". Travelling programs
  always include travel insurance; any program open to under-18s has a
  chaperone from The IDEA. Plus members pay the Plus price when there is
  one (fixed when they're accepted).
- **Applying:** from the program's page, while it's open, for the ages it
  sets (on the day it starts). Name, date of birth, phone, area and
  university are copied from the Pass; the applicant adds an emergency
  contact, a few lines on why and, when asked, passport scans. One live
  application per program.
- **Under 18:** the guardian linked to their Pass approves the
  application before review; declining cancels it. The installments that
  follow need no second approval.
- **Review:** editors accept (within the seats), waitlist or refuse, with
  a note. Accepting fixes the price and splits it into the program's
  installments (each rounded down to 250 IQD, the last takes the rest);
  the first is due within the program's payment window (7 days by
  default), the others on their dates.
- **Paying:** through the one cart, online only: the next installment or
  everything left, never as a gift and with no delivery. Paying the
  first confirms the place. Program payments earn Bulbs like everything
  else, and Bulbs can pay them.
- **Refunds:**
  - withdrawing before the start refunds what was paid by the program's
    schedule (for example 100% from 30 days before, 50% from 7 days);
  - a refused visa refunds the program's visa share (100% by default);
  - a place not paid by its date can be released, refunding by the
    schedule;
  - a program The IDEA calls off refunds everything.
  Finance pays the refund (Wayl or cash) and records it; automatic Wayl
  refunds can follow, as for returns. The refund schedule and visa share
  are fixed on the application when the place is accepted (the programs
  policy), so changing a program later never changes them; any
  installment past its date can release a place.
- **Passport scans** stay private (the applicant and editors) and are
  deleted 30 days after the application ends or the program does.
- **Not yet:** sending a program as a gift, and a Plus price per tier.


## Part 12: auctions (step 14)

- **Which copies:**
  - any copy of a product Staff flag **Collectible**;
  - used, refurbished or open-box copies of products in a category
    Staff open for auctions (a subcategory follows its parent);
  - any copy the seller marks **signed**, **limited** or **rare**.

  A new copy needs the flag or a mark, so new in-print items stay at
  their band price. Rentals are never auctioned. Kits, tickets, programs
  and codes aren't catalogue copies, so they can't be auctioned either.
- **Who lists:** an approved shop's owners and admins, and Staff
  (editors) for The IDEA's own copies, as for offers. People selling
  joins later, with identity verification.
- **Listing:**
  - 3 to 12 of the seller's own photos of that copy (a public bucket,
    under the shop's folder) and a condition description;
  - a start price of at least 25,000 IQD (a setting);
  - optionally a hidden reserve above the start price;
  - 3, 5, 7 or 10 days.

  The copy is held while the auction runs. If the listing has no copy
  for sale, one is added. A seller can cancel an auction until its first
  bid.
- **Bidding:**
  - Proxy bidding: the bidder sets a maximum and the price moves in steps
    of 1,000 IQD below 50,000, then 2,500, 5,000 (from 100,000), 10,000
    (from 250,000), 25,000 (from 500,000) and 50,000 (from 1,000,000).
  - When two maximums are equal, the earlier one leads. Once the leading
    maximum reaches a reserve, the price jumps to the reserve.
  - A bid in the last 2 minutes adds 2 minutes.
  - The history shows each price by alias ("Bidder 3"). Only the bidder
    and staff know who bid. The seller never sees bidders or their
    maximums.
- **Who bids:**
  - adults (a win is a purchase that can't wait for a guardian);
  - a verified phone number, enforced with the same switch as deliveries
    (`require_verified_phone`, on once Twilio is configured);
  - identity verification for a maximum above 500,000 IQD (a new setting:
    none existed yet);
  - nobody at the selling shop.
- **Ending:**
  - **Above the reserve:** the leader wins at the price showing and has
    48 hours to pay, counted from when the win is recorded.
  - **Unpaid:** an unpaid win is a strike. 2 strikes within 12 months
    block bidding for 90 days; 3 block it for good. Support can lift a
    strike given in error.
  - **Second chance:** the seller can offer the copy once to the next
    highest bidder, at that bidder's last bid, for 48 hours. Letting a
    second chance pass isn't a strike.
  - **Closing:** an unpaid auction the seller doesn't act on closes after
    7 days, and its copy goes back on sale.
- **Settling:** deadlines are applied by a function anyone may call. The
  API's daily cron runs it, and auction pages call it when they load, so
  winners hear without waiting for the cron.
- **Marks:** Staff (editors) confirm a mark or find it wrong. A wrong
  mark counts against the shop's score as heavily as a return (×2),
  over the last 90 days.
- **Paying (part 2):**
  - A win, or a second chance, goes to the winner's cart. It leaves the
    cart when it can no longer be paid.
  - It is one line at the final price, for the copy held. It is paid
    online only, never on delivery: a win can't wait for a courier.
  - It counts as goods for free delivery, discounts, Bulbs and cashback.
  - Commission is charged at the category's rate, as for any line.
  - Paying sells that copy and marks the auction paid.
  - While an order for it waits for payment (up to 24 hours), the win
    isn't settled as unpaid. A cancelled order puts the win back in the
    cart while there's still time to pay.
  - A payment that arrives after the win was settled as unpaid still
    sells the copy and lifts the strike. If the copy has gone to a second
    chance, the late payment takes nothing and the line is refunded as
    out of stock.

## Part 13: Get offers from shops (step 14)

The brief names it; the selling policy (section 14) sets the rules. Where
it leaves room:

- **Who asks:** a member aged 18 or over, with a verified phone number
  once `require_verified_phone` is on. At most 5 open requests.
- **The request:** one item, either a catalog product or a title, with its
  condition, a description, 3 to 8 photos and the area it's in (one of
  the delivery zones). Photos are private: the member, support, and shops
  while the request is open (and the shop whose offer was accepted).
  A request is open for 7 days.
- **Who offers:** approved shops (owners and admins), never The IDEA
  itself and never on an item belonging to one of the shop's own people.
  Shops see the item, its photos and area and the member's first name,
  never who the member is.
- **The offer:** an amount, how the shop checks the item (it collects it,
  or the member brings it to a branch), how it pays (cash or transfer)
  and a note. One live offer per shop per request. An offer stands for 72
  hours or until the request closes, and the shop can withdraw it while it
  waits.
- **Choosing:** the member accepts one (the others are declined) or none
  (closing the request).
- **After acceptance:** the shop marks the sale done, or either side
  calls it off. Contact details are never passed on: the two sides arrange
  the hand-over in the messages, which The IDEA passes on and keeps (the
  author's identity stays private).
- **Money:** The IDEA doesn't buy, price or guarantee, and takes no fee;
  the shop pays the member as its offer says.
- Requests and offers past their time expire in the API's daily cron.

## Part 14: people selling (step 14), cancelled

> Cancelled by the owner on 30 October 2026 (see "Amendment, 30 October
> 2026: people selling, verification and Pass settings" below). Kept for
> the record.

The selling policy (sections 10 to 13) sets the rules: adults with a
verified Pass, their own things, photos of the actual item, a fixed price
or offers, cash to the seller on delivery, money never through The IDEA,
messages with phone numbers hidden. Where it leaves room:

- **Verified Pass** means a verified identity (step 13), as the brief
  requires for people who sell. Sellers are 18 or over.
- **Buyers** are 18 or over too, with a verified phone while phone checks
  are on: the sale ends with two strangers meeting and cash changing hands.
- **Listing:** a product from the catalog or a title, the condition, a
  description, 3 to 8 of the seller's photos (private bucket, shown to
  anyone while the listing is live), the area, a price of at least 1,000
  IQD and whether offers are allowed. A listing runs 30 days and can be
  renewed; at most 20 live per seller. Visitors see the first name and
  area only. 18-rated products are hidden from minors, as in the Store.
- **Buying:** buying at the price reserves the listing at once; an offer
  below it waits up to 72 hours for the seller. Accepting one reserves the
  listing and declines the others. A buyer has at most 10 offers waiting.
- **Hand-over:** the two agree a time and place in the messages; there is
  no Boxy delivery, so no money passes through The IDEA or its courier.
  The seller marks it sold; either side can call it off, and the listing
  is live again.
- **No fee, no Bulbs.** Support can take down a listing that breaks the
  policy, saying why; the seller is told.
- **Auctions by people** stay with shops and The IDEA for now: an auction
  is paid online through The IDEA, which the policy rules out for people's
  sales. That needs the owner's call before it's built.
## Amendment, 30 October 2026: Arabic names

The owner's amendment changes section 23 and replaces the line in section
16 that kept "Bulbs" in Latin letters in Arabic copy.

- **Arabic copy uses the official Arabic names** (`docs/brand/BRAND_GUIDELINES.md`
  section 2): The IDEA ايديا (everywhere); Store السوگ / سوگ ايديا; Plus
  الپلص / ايديا پلص; Pass الپاس / ايديا پاس; Club النادي / نادي ايديا;
  Partners الشركاء / شركاء ايديا; Bulbs الگلوبات (one گلوب; "340 گلوب");
  Staff الستاف; Droid الدرويد. Short forms inside the website, apps and
  emails; full forms in titles and first mentions. Possessives: پاسك،
  پلصي، گلوباتك. Always پ (U+067E) and گ (U+06AF).
- **Latin letters stay** for the plans (Glow, Shine, Blaze, Duo) and for
  product and model names: "ايديا پلص Shine".
- **Rewritten:** `ar.json`, the Arabic email templates (including the
  sign-in emails in `packages/database/supabase/templates` and their
  subjects), the Arabic legal pages, Droid's Arabic, the plans' Arabic
  names and features in the database, AGENTS.md and the brand guidelines.
- **Search** folds ب/پ, ك/ق/گ/ک, ا/أ/إ/آ and ي/ی/ى in
  `private.normalize_search`, the one function used for both the products'
  index and the query (`20270312000000_arabic_names.sql`).
- **A test** (`packages/internationalization/messages.test.ts`) fails when
  `ar.json` holds The IDEA, Store, Plus, Pass, Club, Partners, Bulbs, Staff
  or Droid in Latin letters.
- **Where it leaves room:**
  - "The IDEA IQ Inc.", the registered company, keeps its legal name.
  - "The IDEA Design" (Staff's design site) becomes "ايديا Design".
  - Partners as the place one goes ("in Partners → Selling") is شركاء ايديا,
    so it doesn't read as ordinary partners; menu labels are الشركاء.
  - "المتجر" stays where it means a shop, a seller or a pickup counter; it
    becomes السوگ where it names The IDEA Store.
- **Not yet:** the WhatsApp templates are registered with Meta and change
  only when they are submitted again; the published posts (Club → Read)
  are editorial content that editors update in Staff; the title search of
  posts, events and opportunities doesn't fold these letters yet (it
  filters with PostgREST, not `normalize_search`) and follows in its own
  schema-then-code pair.

## Amendment, 30 October 2026: people selling, verification and Pass settings

The owner's message of 30 October 2026:

- **People selling is cancelled.** A person who wants to sell signs up in
  Partners as an individual trader shop (the owner's ID only, a monthly
  sales limit; Part 8), and sells like any shop: paid through The IDEA,
  delivered by Boxy, returns under the Returns policy. Step 14's "people
  selling" item is dropped, and so is "auctions by people" (individual
  traders can auction as shops do). The schema merged as
  `20270311000000_member_listings.sql` is removed by
  `20270313000000_cancel_people_selling.sql`; no code used it. The
  selling, returns and privacy policies lose their sections on sales
  between people.
- **All verification goes in `/verify`.** The standalone student page
  becomes the one place to verify: student (university email or card),
  educator, identity (National Card and selfie) and organizations
  reached from Partners. Pass → Settings links there instead of holding
  its own Verification card. (Planned as its own pull request.)
- **Pass → Settings is grouped:** one **Connections** section for
  everything linked to the Pass (sign-in accounts such as Google and
  Apple, Telegram, connected sites); a **Phone** section (the number, its
  verification and WhatsApp updates together); an **Email** section.
  (Planned as its own pull request.)

## Textbook resale (step 14, decided 30 October 2026)

The brief's "resale between students each term" would be people selling,
which the owner cancelled the same day. The owner's choice: **students
resell as individual traders.** A student who wants to sell last term's
textbooks opens a shop in Partners as an individual trader (their ID only,
the monthly sales limit of Part 8) and lists them like any shop: paid
through The IDEA, collected by Boxy, paid out weekly, returns under the
Returns policy. Nothing new in the schema; the website points the way:

- Store → Books → Textbooks says "Done with last term's textbooks? Sell
  them…" with a link to Partners;
- Pass → Selling has "Sell it yourself", next to Get offers from shops;
- Partners `/new?for=selling` makes the organization with Selling on and
  opens the shop's application (individual trader is the default kind).

## Part 15: Plus Duo (step 14)

Section 17's Plus Duo, schema first (`20270314000000_plus_duo.sql`), then
the code.

- **Plans:** Glow Duo 20,750 · Shine Duo 31,750 · Blaze Duo 55,750 IQD a
  month (`plus-<tier>-duo`), yearly at 10 months for 12 (`-duo-year`), and
  for a verified student holder 20% off on a …750 ending (`-duo-student`:
  15,750 · 24,750 · 43,750). `plans.duo` marks them; each has its tier's
  slots, home swaps, Bulbs rate and features. They're added switched off
  (in production and in the local seed) and the code that invites the
  second person turns them on, so the current plan cards don't offer a
  Duo before it can be shared.
- **`plus_members`:** the holder and the partner of a Duo subscription:
  the Pass, the role, the invite code (7 days, a new one replaces an
  unaccepted one), invited and joined dates, a removal's end date, when
  and why the place ended, the guardian and their decision, and on the
  holder's row how swaps share the queues. Members, their guardians and
  staff read it; only functions write it.
- **The partner has no subscription.** `plus_tier`, `member_plan` and
  `plus_rental_slots` count the live Duo a person is the partner on
  (joined, approved by their guardian when 13–17, before a removal's end),
  so the Bulbs rate, survey credits, early access, Plus prices, partner
  perks and the Pass card badge are theirs. They don't take one of the
  Plus places, and can't join with Plus of their own.
- **Shared:** rental slots and home swaps are counted across the holder
  and the partner; one booked swap at a time for the two; home swaps go to
  the holder's Plus address; the holder's subscription decides pause and
  cancel. Each keeps their own queue; `household_queue` orders both for
  the next swap: alternating by default (whoever has fewer items at home
  first, the holder on a tie), or one person's queue first as the holder
  sets (`set_duo_swap_order`). A wanted item becomes a rental of whoever
  queued it.
- **Ages:** 13 and over. A 13–17-year-old partner needs a linked guardian,
  who approves the place (`decide_duo_guardian`); a guardian who already
  allows Plus has approved it.
- **Ending:** the partner leaves at any time (`leave_duo`); the holder
  removes them from the next renewal (`remove_duo_partner`, `keep` takes it
  back) once their rentals are back. What a departing partner still has at
  the shared address, and a swap they booked, pass to the holder. The
  API's cron (`end_duo_partners`) ends places past a removal's renewal or
  on a Duo that ended or changed to another plan, and clears expired
  invites.
- **Gifts:** the monthly Duo plans pass the gift check like the other
  monthly plans; the recipient becomes the holder. A partner who receives
  a gift leaves the Duo before redeeming it.
- **Website (part 2):** Plans in Your Plus switch between "Just me" and
  "Duo"; the public Plus page lists the plans for one person and a line on
  Duo with its lowest price. Your Plus → Plus Duo holds the invite link
  (copy or share), the second person's state, the swap order and removing
  or keeping them; the second person sees whose Plus it is and can leave.
  Their swaps use both queues (`household_queue`), the shared slots and
  the holder's address; a swap either of them booked shows as booked.
  `/plus/duo/<code>` shows who invited you to which plan and joins.
  Guardians approve in Pass → Settings → Guardian. The API's
  `/cron/plus-duo` runs `end_duo_partners` daily at 06:25 UTC.
  `20270315000000_plus_duo_on.sql` switches the Duo plans on.
- **Notifications:** `plus_duo_joined`, `plus_duo_guardian`,
  `plus_duo_approved`, `plus_duo_declined`, `plus_duo_left`,
  `plus_duo_removed` and `plus_duo_ended`; a booked swap notifies both.

## Part 16: digital codes (section 15)

Schema first (`20270316000000_digital_codes.sql`), then the API's supplier
job (Reloadly), the website and Staff.

- **Brands and denominations:** a brand is one store in one region
  ("PlayStation · US store"), with how to redeem it in English and
  Arabic; each denomination names its supplier, the supplier's product,
  its face value and currency, and its USD cost. The price in IQD is the
  cost at The IDEA's rate (`store_settings.digital_iqd_per_usd`, 1,310 to
  start) plus the margin (`digital_margin_rate`, 8% to start, or the
  denomination's own), rounded up to 250; a new rate or margin reprices
  everything. Members see brands, denominations and prices, never costs
  or supplier ids (column grants; Staff read the full rows through
  `staff_digital_products`). Editors and finance manage brands (names, regions, on or off); finance sets margins
  and switches denominations on or off; the supplier sync writes costs.
- **Regions:** every line names its store region; the region a member's
  account is on is remembered per platform (`digital_store_regions`,
  `set_digital_store_region`), asked at checkout the first time.
- **Checkout:** codes sit in their own cart table (`cart_digital`, up to 5
  of a denomination). They're paid online only, need a verified phone,
  and earn and take no Bulbs, coupons or invite discount (they're outside
  the giveaway cap and cashback). A Pass younger than
  `digital_new_pass_days` (30) buys up to `digital_new_pass_limit`
  (50,000 IQD) in codes. They can't be sent as gifts.
- **After payment:** each code is to buy, or held for Staff when it is the
  member's first order of codes and above `digital_hold_above` (100,000
  IQD); `release_digital_codes` lets it go. The API's job takes codes to
  buy (`take_digital_codes`), buys each from the supplier and stores it
  (`deliver_digital_code`) or marks it failed (`fail_digital_code`, which
  Staff retry). The member is told it's ready (`digital_code_ready`, in the
  app and by email with a link to Pass → Orders); the email carries no
  code.
- **Revealing:** the code and PIN are never readable from the table; the
  member's deliberate tap (`reveal_digital_code`) returns them and marks
  the code revealed. A revealed code can't be returned (a guard on
  `returns`). A code the supplier marks invalid is replaced by a new one to
  buy (`replace_digital_code`, by the API or finance and support).
- **Logged:** every step of every code is in `digital_code_events`, for
  Staff.
- **Website only:** the code PR hides codes in the iOS and Android apps.
- **Suppliers:** Reloadly first; LikeCard and Golden Codes take the same
  shape (`supplier`). The discount comparison on the top 10 brands needs
  quotes from each supplier's account and is open in PROGRESS.md.
- **Code (part 2):** Store → Gift cards and codes (`/store/codes`) lists
  brands by platform, asks "Which store is your account on?" when a
  platform has several regions and remembers it; codes go in the cart and
  check out like program installments (online, no address, never a gift),
  and checkout is closed to them in the apps. Pass → Orders shows each
  code's state and reveals a delivered one with a tap. `apps/api` buys
  codes after the payment webhook, daily and from Staff, one Reloadly order
  each; an order Reloadly leaves pending is recorded as failed for Staff to
  check and retry. Finance → Codes syncs the Reloadly catalog (new brands
  start off, with Arabic names to fill in), edits brands and margins, and
  releases held and retries failed codes. The returns policy has a section
  on codes.
