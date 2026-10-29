-- Auctions, part 1 (28 October brief, section 14; step 14 of the order of
-- work): listing a copy for auction, bidding, settling and strikes. Part 2
-- puts a won auction in the winner's cart and checkout.
--
-- * Which copies: products Staff flag `collectible`, used copies of products
--   in a category Staff enable for auctions (`product_categories.auctions`,
--   or its parent's), and any copy the seller marks signed, limited or rare.
--   A new copy needs the flag or a mark: new in-print items stay at their
--   price. Rentals (and kits, tickets, programs and codes, which aren't
--   catalogue copies) never.
-- * Who: approved shops (owners and admins) and Staff (editors) for The
--   IDEA's own copies, as for offers. The copy is held ('reserved') while the
--   auction runs; normal selling never picks it.
-- * Every auction has at least 3 of the seller's own photos (the public
--   `auction-photos` bucket, "<seller id>/…") and a condition description.
--   It starts at `store_settings.auction_min_start` (25,000 IQD) or more,
--   may have a hidden reserve, and runs 3, 5, 7 or 10 days.
-- * Proxy bidding: a bidder sets a maximum and the price moves in set
--   increments (`private.bid_increment`); ties go to the earlier maximum. A
--   bid in the last 2 minutes adds 2 minutes. Bidders are adults with a
--   verified phone (while `require_verified_phone` is on), and verify their
--   identity to bid above `store_settings.auction_identity_above`. Bids show
--   publicly by alias ("Bidder 3", `bid_events`); who bid is the bidder's and
--   staff's business only.
-- * Settling (`settle_auctions`, run by the API's cron and when auction pages
--   load): a winner has 48 hours to pay. An unpaid win is a strike; 2 in 12
--   months block bidding for 90 days and 3 for good. The seller can then
--   offer the copy to the next highest bidder at that bidder's last bid
--   ("second chance", once), or close it; after 7 days it closes itself.
-- * Staff review the marks; a wrong one counts against the shop's score.

create type public.auction_status as enum (
  'live',
  -- Ended above the reserve (or offered as a second chance): waiting for payment.
  'won',
  'paid',
  -- Ended without a bid at the reserve, closed after a non-payment, or cancelled before any bid.
  'unsold',
  -- The winner didn't pay in time: the seller can offer a second chance.
  'unpaid',
  'cancelled'
);

create type public.auction_mark as enum ('signed', 'limited', 'rare');

alter table public.store_settings
  add column auction_min_start bigint not null default 25000 check (auction_min_start > 0),
  add column auction_identity_above bigint not null default 500000 check (auction_identity_above > 0);

comment on column public.store_settings.auction_min_start is
  'The lowest start price for an auction (IQD).';
comment on column public.store_settings.auction_identity_above is
  'Bidding a maximum above this (IQD) needs a verified identity.';

grant update (auction_min_start, auction_identity_above) on public.store_settings to authenticated;

alter table public.products add column collectible boolean not null default false;
comment on column public.products.collectible is
  'Collectible: any copy can be auctioned. Set by Staff.';

alter table public.product_categories add column auctions boolean not null default false;
comment on column public.product_categories.auctions is
  'Used copies of products in this category (or its subcategories) can be auctioned.';

-- ── Auctions ───────────────────────────────────────────────────────────────

create table public.auctions (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  -- The copy on auction, held while it runs.
  stock_item_id uuid not null references public.stock_items (id) on delete restrict,
  -- Paths in `auction-photos`.
  photos text[] not null check (cardinality(photos) between 3 and 12),
  condition_note text not null check (char_length(trim(condition_note)) between 10 and 2000),
  mark public.auction_mark,
  mark_review text check (mark_review in ('confirmed', 'wrong')),
  mark_reviewed_by uuid references auth.users (id) on delete set null,
  mark_reviewed_at timestamptz,
  start_price bigint not null check (start_price > 0),
  -- Whether there's a reserve (its amount is in `auction_reserves`), and
  -- whether the leading maximum has reached it.
  has_reserve boolean not null default false,
  reserve_met boolean not null default true,
  days smallint not null check (days in (3, 5, 7, 10)),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status public.auction_status not null default 'live',
  -- The price showing now; null before the first bid.
  current_price bigint check (current_price > 0),
  bid_count integer not null default 0 check (bid_count >= 0),
  -- What the winner (or the second-chance bidder) pays, and by when.
  final_price bigint check (final_price > 0),
  pay_by timestamptz,
  second_chance boolean not null default false,
  ended_at timestamptz,
  order_item_id uuid references public.order_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (mark_review is null or mark is not null),
  check (status not in ('won', 'paid', 'unpaid') or (final_price is not null and pay_by is not null)),
  check (ends_at > starts_at)
);

comment on table public.auctions is
  'A copy on auction: photos, condition, start price, how long, and the price and outcome. Public, without who bids; written only by functions.';

-- A copy is on one auction at a time.
create unique index auctions_open_copy_idx on public.auctions (stock_item_id)
  where status in ('live', 'won', 'unpaid');
create index auctions_live_idx on public.auctions (ends_at) where status = 'live';
create index auctions_due_idx on public.auctions (pay_by) where status in ('won', 'unpaid');
create index auctions_product_idx on public.auctions (product_id, status);
create index auctions_variant_idx on public.auctions (variant_id);
create index auctions_seller_idx on public.auctions (seller_id, status, created_at desc);
create index auctions_marks_idx on public.auctions (created_at) where mark is not null and mark_review is null;
create index auctions_mark_reviewed_by_idx on public.auctions (mark_reviewed_by);
create index auctions_order_item_idx on public.auctions (order_item_id);

create trigger set_updated_at before update on public.auctions
  for each row execute function private.set_updated_at();

alter table public.auctions enable row level security;

create policy "Auctions are public" on public.auctions
  for select to anon
  using (status <> 'cancelled');

create policy "Auctions are public; sellers see their cancelled ones" on public.auctions
  for select to authenticated
  using (status <> 'cancelled' or (select private.can_see_seller(seller_id)));

revoke all on public.auctions from anon, authenticated;
grant select on public.auctions to anon, authenticated;
grant all on public.auctions to service_role;

-- The hidden reserve: the seller's and staff's.
create table public.auction_reserves (
  auction_id uuid primary key references public.auctions (id) on delete cascade,
  reserve_price bigint not null check (reserve_price > 0)
);

comment on table public.auction_reserves is
  'An auction''s hidden reserve price. Seen by its seller and staff only.';

alter table public.auction_reserves enable row level security;

create policy "Sellers and staff see reserves" on public.auction_reserves
  for select to authenticated
  using (exists (
    select 1 from public.auctions a
    where a.id = auction_id and (select private.can_see_seller(a.seller_id))
  ));

revoke all on public.auction_reserves from anon, authenticated;
grant select on public.auction_reserves to authenticated;
grant all on public.auction_reserves to service_role;

-- ── Bids ───────────────────────────────────────────────────────────────────

-- One row per bidder per auction: their maximum and the bid showing for them.
create table public.bids (
  auction_id uuid not null references public.auctions (id) on delete cascade,
  bidder_id uuid not null references auth.users (id) on delete cascade,
  -- "Bidder 3": the order they joined in.
  alias smallint not null check (alias > 0),
  max_amount bigint not null check (max_amount > 0),
  -- What the proxy has bid for them so far.
  amount bigint not null check (amount > 0),
  winning boolean not null default false,
  -- Once the auction ends: won, lost, unpaid (a strike) or second_chance.
  outcome text check (outcome in ('won', 'lost', 'unpaid', 'second_chance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (auction_id, bidder_id),
  unique (auction_id, alias),
  check (amount <= max_amount)
);

comment on table public.bids is
  'A bidder''s maximum on an auction and how it ended for them. Seen by the bidder and staff; written only by functions.';

create unique index bids_leader_idx on public.bids (auction_id) where winning;
create index bids_bidder_idx on public.bids (bidder_id, created_at desc);

create trigger set_updated_at before update on public.bids
  for each row execute function private.set_updated_at();

alter table public.bids enable row level security;

create policy "Bidders and staff see bids" on public.bids
  for select to authenticated
  using (bidder_id = (select auth.uid()) or (select private.is_staff()));

revoke all on public.bids from anon, authenticated;
grant select on public.bids to authenticated;
grant all on public.bids to service_role;

-- The public history: each price the proxy reached, by alias.
create table public.bid_events (
  id bigint generated always as identity primary key,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  alias smallint not null,
  amount bigint not null check (amount > 0),
  created_at timestamptz not null default clock_timestamp()
);

comment on table public.bid_events is
  'An auction''s bid history by alias ("Bidder 3"), for its page.';

create index bid_events_auction_idx on public.bid_events (auction_id, id desc);

alter table public.bid_events enable row level security;

create policy "Bid history is public" on public.bid_events
  for select to anon, authenticated
  using (exists (select 1 from public.auctions a where a.id = auction_id));

revoke all on public.bid_events from anon, authenticated;
grant select on public.bid_events to anon, authenticated;
grant all on public.bid_events to service_role;

-- An unpaid win.
create table public.bidding_strikes (
  user_id uuid not null references auth.users (id) on delete cascade,
  auction_id uuid not null references public.auctions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, auction_id)
);

comment on table public.bidding_strikes is
  'Unpaid auction wins: 2 in 12 months block bidding for 90 days, 3 for good.';

create index bidding_strikes_auction_idx on public.bidding_strikes (auction_id);

alter table public.bidding_strikes enable row level security;

create policy "Members and support see strikes" on public.bidding_strikes
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

-- Support lifts a strike given in error (a payment that failed on our side).
create policy "Support lifts strikes" on public.bidding_strikes
  for delete to authenticated
  using ((select private.has_staff_role('{support}')));

revoke all on public.bidding_strikes from anon, authenticated;
grant select, delete on public.bidding_strikes to authenticated;
grant all on public.bidding_strikes to service_role;

-- ── Photos ─────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('auction-photos', 'auction-photos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Whether the caller lists for the seller whose folder `path` is in.
create function private.can_upload_auction_photo(path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select split_part(path, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and private.answers_offers(split_part(path, '/', 1)::uuid);
$$;

revoke all on function private.can_upload_auction_photo(text) from public, anon;
grant execute on function private.can_upload_auction_photo(text) to authenticated;

create policy "Sellers upload auction photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'auction-photos' and (select private.can_upload_auction_photo(name)));

create policy "Sellers see their auction photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'auction-photos' and (select private.can_upload_auction_photo(name)));

create policy "Sellers delete their auction photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'auction-photos' and (select private.can_upload_auction_photo(name)));

-- ── Helpers ────────────────────────────────────────────────────────────────

-- The step from one bid to the next, by the price showing (IQD).
create function private.bid_increment(price bigint)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when price < 50000 then 1000
    when price < 100000 then 2500
    when price < 250000 then 5000
    when price < 500000 then 10000
    when price < 1000000 then 25000
    else 50000
  end::bigint;
$$;

-- When a member may bid again: never ('infinity') after 3 strikes within 12
-- months, 90 days after a strike that makes 2 within 12 months, else null.
create function private.bidding_blocked_until(member uuid)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when bool_or(w.strikes >= 3) then 'infinity'::timestamptz
    else max(w.created_at + interval '90 days') filter (where w.strikes >= 2)
  end
  from (
    select s.created_at, (
      select count(*) from public.bidding_strikes x
      where x.user_id = member
        and x.created_at > s.created_at - interval '12 months' and x.created_at <= s.created_at
    ) as strikes
    from public.bidding_strikes s
    where s.user_id = member
  ) w;
$$;

revoke all on function private.bidding_blocked_until(uuid) from public, anon;
grant execute on function private.bidding_blocked_until(uuid) to authenticated;

create function public.bidding_blocked_until()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select private.bidding_blocked_until((select auth.uid())) $$;

revoke all on function public.bidding_blocked_until() from public, anon;
grant execute on function public.bidding_blocked_until() to authenticated;

-- Whether a member has a verified phone number.
create function private.has_verified_phone(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.verified_phones v where v.user_id = member)
    or exists (
      select 1 from auth.users u
      where u.id = member and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> ''
    );
$$;

revoke all on function private.has_verified_phone(uuid) from public, anon, authenticated;

-- Why a copy of this listing can't be auctioned, or null when it can.
create function private.auction_problem(variant uuid, wanted public.product_condition, copy_mark public.auction_mark)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p.id is null or p.status <> 'active' or not v.active then 'Product not found'
    when p.kind <> 'sale' then 'Rentals can''t be auctioned'
    when p.collectible or copy_mark is not null then null
    when wanted = 'new' then 'New copies need to be collectible, or marked signed, limited or rare'
    when coalesce(c.auctions, false) or coalesce(parent.auctions, false) then null
    else 'This category isn''t open for auctions'
  end
  from (select 1) one
  left join public.product_variants v on v.id = variant
  left join public.products p on p.id = v.product_id
  left join public.product_categories c on c.id = p.category_id
  left join public.product_categories parent on parent.id = c.parent_id;
$$;

revoke all on function private.auction_problem(uuid, public.product_condition, public.auction_mark) from public, anon, authenticated;

-- A seller's photos for an auction: 3 to 12 distinct files in its folder.
create function private.auction_photos_ok(seller uuid, paths text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cardinality(paths) between 3 and 12
    and (select count(distinct f) from unnest(paths) f) = cardinality(paths)
    and not exists (
      select 1 from unnest(paths) f
      where split_part(f, '/', 1) <> seller::text
        or not exists (
          select 1 from storage.objects s where s.bucket_id = 'auction-photos' and s.name = f
        )
    );
$$;

revoke all on function private.auction_photos_ok(uuid, text[]) from public, anon, authenticated;

-- ── Listing ────────────────────────────────────────────────────────────────

create function private.start_auction(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  start_price bigint,
  days integer,
  photos text[],
  condition_note text,
  reserve bigint default null,
  copy_mark public.auction_mark default null,
  copy uuid default null
)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings public.store_settings;
  version public.product_variants;
  problem text;
  held public.stock_items;
  made public.auctions;
begin
  if not private.answers_offers(seller)
    or not exists (select 1 from public.sellers s where s.id = seller and s.status = 'approved')
  then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into settings from public.store_settings;
  select * into version from public.product_variants v where v.id = variant;

  problem := private.auction_problem(variant, wanted, copy_mark);
  if problem is not null then
    raise exception '%', problem using errcode = 'check_violation';
  end if;
  if start_price is null or start_price < settings.auction_min_start then
    raise exception 'Auctions start at % IQD or more', settings.auction_min_start
      using errcode = 'check_violation';
  end if;
  if reserve is not null and reserve <= start_price then
    raise exception 'A reserve is above the start price' using errcode = 'check_violation';
  end if;
  if days is null or days not in (3, 5, 7, 10) then
    raise exception 'Auctions run 3, 5, 7 or 10 days' using errcode = 'check_violation';
  end if;
  if not private.auction_photos_ok(seller, coalesce(photos, '{}')) then
    raise exception 'Add 3 to 12 photos of this copy' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(condition_note, ''))) < 10 then
    raise exception 'Describe the copy''s condition' using errcode = 'check_violation';
  end if;

  -- The copy: the one chosen, or one of the listing's copies for sale, or a
  -- new one when the listing has none.
  select * into held from public.stock_items s
  where s.seller_id = seller and s.variant_id = variant and s.condition = wanted
    and s.purpose = 'sale' and s.status = 'available'
    and (copy is null or s.id = copy)
  order by s.created_at
  limit 1
  for update skip locked;
  if held.id is null and copy is not null then
    raise exception 'That copy isn''t available' using errcode = 'check_violation';
  end if;
  if held.id is null then
    insert into public.stock_items (product_id, variant_id, condition, purpose, status, seller_id)
    values (version.product_id, variant, wanted, 'sale', 'reserved', seller)
    returning * into held;
  else
    update public.stock_items set status = 'reserved' where id = held.id;
  end if;

  insert into public.auctions (
    seller_id, product_id, variant_id, condition, stock_item_id, photos, condition_note, mark,
    start_price, has_reserve, reserve_met, days, ends_at
  )
  values (
    seller, version.product_id, variant, wanted, held.id, photos, trim(condition_note), copy_mark,
    start_price, reserve is not null, reserve is null, days, now() + make_interval(days => days)
  )
  returning * into made;

  if reserve is not null then
    insert into public.auction_reserves (auction_id, reserve_price) values (made.id, reserve);
  end if;
  return made;
end;
$$;

create function public.start_auction(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  start_price bigint,
  days integer,
  photos text[],
  condition_note text,
  reserve bigint default null,
  copy_mark public.auction_mark default null,
  copy uuid default null
)
returns public.auctions
language sql
security invoker
set search_path = ''
as $$
  select private.start_auction(seller, variant, wanted, start_price, days, photos, condition_note, reserve, copy_mark, copy)
$$;

-- Ends an auction without a sale and lets its copy go back on sale.
create function private.release_auction(target uuid, ending public.auction_status)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
begin
  update public.auctions set status = ending, ended_at = coalesce(ended_at, now())
  where id = target
  returning * into a;
  update public.stock_items set status = 'available'
  where id = a.stock_item_id and status = 'reserved';
  update public.bids set outcome = 'lost', winning = false
  where auction_id = target and outcome is null;
  return a;
end;
$$;

revoke all on function private.release_auction(uuid, public.auction_status) from public, anon, authenticated;

-- The seller cancels an auction nobody has bid on.
create function private.cancel_auction(target uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
begin
  select * into a from public.auctions x where x.id = target for update;
  if a.id is null or not private.answers_offers(a.seller_id) then
    raise exception 'Auction not found' using errcode = 'no_data_found';
  end if;
  if a.status <> 'live' or a.bid_count > 0 then
    raise exception 'Only an auction without bids can be cancelled' using errcode = 'check_violation';
  end if;
  return private.release_auction(target, 'cancelled');
end;
$$;

create function public.cancel_auction(target uuid)
returns public.auctions
language sql
security invoker
set search_path = ''
as $$ select private.cancel_auction(target) $$;

-- ── Bidding ────────────────────────────────────────────────────────────────

-- Sets the caller's maximum. Returns whether they lead, the price showing,
-- when the auction ends and whether the reserve is met.
create function private.place_bid(target uuid, maximum bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  settings public.store_settings;
  a public.auctions;
  reserve bigint;
  mine public.bids;
  leader public.bids;
  minimum bigint;
  price bigint;
  top bigint;
  new_leader uuid;
  blocked timestamptz;
  item public.products;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into a from public.auctions x where x.id = target for update;
  if a.id is null then
    raise exception 'Auction not found' using errcode = 'no_data_found';
  end if;
  if a.status <> 'live' or a.ends_at <= now() then
    raise exception 'This auction has ended' using errcode = 'check_violation';
  end if;
  if private.answers_offers(a.seller_id) or private.works_at_seller(a.seller_id) then
    raise exception 'You can''t bid on your own auction' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles p where p.id = caller and p.banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_adult(caller) then
    raise exception 'You need to be 18 or over to bid' using errcode = 'check_violation';
  end if;

  select * into settings from public.store_settings;
  if settings.require_verified_phone and not private.has_verified_phone(caller) then
    raise exception 'Verify your phone number to bid' using errcode = 'check_violation';
  end if;
  if maximum > settings.auction_identity_above and not private.identity_verified(caller) then
    raise exception 'Verify your identity to bid more than % IQD', settings.auction_identity_above
      using errcode = 'check_violation';
  end if;
  blocked := private.bidding_blocked_until(caller);
  if blocked > now() then
    raise exception 'Bidding is blocked after unpaid wins' using errcode = 'check_violation';
  end if;

  select r.reserve_price into reserve from public.auction_reserves r where r.auction_id = target;
  select * into mine from public.bids b where b.auction_id = target and b.bidder_id = caller;
  select * into leader from public.bids b where b.auction_id = target and b.winning;

  if leader.bidder_id = caller then
    -- The leader raises their maximum; the price stays unless it reaches
    -- the reserve now.
    if maximum is null or maximum <= leader.max_amount then
      raise exception 'Raise your maximum above % IQD', leader.max_amount using errcode = 'check_violation';
    end if;
    price := a.current_price;
    top := maximum;
    new_leader := caller;
  else
    minimum := case
      when a.bid_count = 0 then a.start_price
      else a.current_price + private.bid_increment(a.current_price)
    end;
    if maximum is null or maximum < minimum then
      raise exception 'Bid at least % IQD', minimum using errcode = 'check_violation';
    end if;

    if mine.bidder_id is null then
      insert into public.bids (auction_id, bidder_id, alias, max_amount, amount)
      values (
        target, caller,
        (select coalesce(max(b.alias), 0) + 1 from public.bids b where b.auction_id = target),
        maximum, least(maximum, minimum)
      )
      returning * into mine;
    end if;

    if leader.bidder_id is null then
      price := a.start_price;
      top := maximum;
      new_leader := caller;
    elsif maximum > leader.max_amount then
      price := least(maximum, leader.max_amount + private.bid_increment(leader.max_amount));
      top := maximum;
      new_leader := caller;
      -- The old leader's proxy went as far as their maximum.
      update public.bids set amount = max_amount, winning = false
      where auction_id = target and bidder_id = leader.bidder_id;
      if leader.amount < leader.max_amount then
        insert into public.bid_events (auction_id, alias, amount) values (target, leader.alias, leader.max_amount);
      end if;
    else
      -- The leader's proxy answers; an equal maximum loses to the earlier one.
      price := least(leader.max_amount, maximum + private.bid_increment(maximum));
      top := leader.max_amount;
      new_leader := leader.bidder_id;
      insert into public.bid_events (auction_id, alias, amount) values (target, mine.alias, maximum);
    end if;
  end if;

  -- With a reserve, the price jumps to it once the leading maximum reaches it.
  if reserve is not null and top >= reserve then
    price := greatest(price, reserve);
  end if;

  update public.bids set
    max_amount = case when bidder_id = caller then maximum else max_amount end,
    amount = case
      when bidder_id = new_leader then price
      when bidder_id = caller then maximum
      else amount
    end,
    winning = bidder_id = new_leader
  where auction_id = target and (bidder_id = caller or bidder_id = new_leader);

  if price is distinct from a.current_price then
    insert into public.bid_events (auction_id, alias, amount)
    select target, b.alias, price from public.bids b where b.auction_id = target and b.bidder_id = new_leader;
  end if;

  update public.auctions set
    current_price = price,
    bid_count = bid_count + 1,
    reserve_met = reserve is null or top >= reserve,
    -- A bid in the last 2 minutes adds 2 minutes.
    ends_at = case when ends_at - now() < interval '2 minutes' then ends_at + interval '2 minutes' else ends_at end
  where id = target
  returning * into a;

  -- Whoever led before hears they were outbid.
  if leader.bidder_id is not null and leader.bidder_id is distinct from new_leader then
    select * into item from public.products p where p.id = a.product_id;
    perform private.notify(
      leader.bidder_id, 'order', 'auction_outbid',
      jsonb_build_object('auction_id', a.id, 'amount', price, 'name_en', item.name_en, 'name_ar', item.name_ar),
      '/store/auctions/' || a.number
    );
  end if;

  return jsonb_build_object(
    'winning', new_leader = caller,
    'current_price', a.current_price,
    'max_amount', maximum,
    'ends_at', a.ends_at,
    'reserve_met', a.reserve_met
  );
end;
$$;

create function public.place_bid(target uuid, maximum bigint)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.place_bid(target, maximum) $$;

-- ── Settling ───────────────────────────────────────────────────────────────

-- Moves one auction along once a deadline has passed: an ended auction is
-- won (above the reserve) or unsold; an unpaid win is a strike and waits for
-- the seller; a lapsed second chance, or an unpaid one left 7 days, closes.
create function private.settle_auction(target uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
  item public.products;
  shop public.sellers;
  winner uuid;
  facts jsonb;
begin
  select * into a from public.auctions x where x.id = target for update skip locked;
  if a.id is null then
    return null;
  end if;
  select * into item from public.products p where p.id = a.product_id;
  select * into shop from public.sellers s where s.id = a.seller_id;
  facts := jsonb_build_object(
    'auction_id', a.id, 'number', a.number, 'name_en', item.name_en, 'name_ar', item.name_ar
  );

  if a.status = 'live' and a.ends_at <= now() then
    if a.bid_count > 0 and a.reserve_met then
      update public.auctions set
        status = 'won',
        final_price = current_price,
        pay_by = greatest(ends_at, now()) + interval '48 hours',
        ended_at = now()
      where id = target
      returning * into a;
      update public.bids set outcome = case when winning then 'won' else 'lost' end
      where auction_id = target;
      select b.bidder_id into winner from public.bids b where b.auction_id = target and b.winning;
      perform private.notify(
        winner, 'order', 'auction_won', facts || jsonb_build_object('amount', a.final_price, 'pay_by', a.pay_by),
        '/store/auctions/' || a.number
      );
      if shop.organization_id is not null then
        perform private.notify_org_admins(
          shop.organization_id, 'auction_sold', facts || jsonb_build_object('amount', a.final_price),
          '/selling/auctions'
        );
      end if;
    else
      a := private.release_auction(target, 'unsold');
      if shop.organization_id is not null then
        perform private.notify_org_admins(shop.organization_id, 'auction_unsold', facts, '/selling/auctions');
      end if;
    end if;
    return a;
  end if;

  if a.status = 'won' and a.pay_by <= now() then
    select b.bidder_id into winner from public.bids b
    where b.auction_id = target and b.outcome in ('won', 'second_chance');
    if a.second_chance then
      -- A second chance is an offer: letting it pass isn't a strike.
      return private.release_auction(target, 'unsold');
    end if;
    update public.auctions set status = 'unpaid' where id = target returning * into a;
    update public.bids set outcome = 'unpaid' where auction_id = target and bidder_id = winner;
    insert into public.bidding_strikes (user_id, auction_id) values (winner, target)
    on conflict do nothing;
    perform private.notify(winner, 'order', 'auction_unpaid', facts, '/store/auctions/' || a.number);
    if shop.organization_id is not null then
      perform private.notify_org_admins(shop.organization_id, 'auction_unpaid', facts, '/selling/auctions');
    end if;
    return a;
  end if;

  if a.status = 'unpaid' and a.pay_by + interval '7 days' <= now() then
    return private.release_auction(target, 'unsold');
  end if;
  return a;
end;
$$;

revoke all on function private.settle_auction(uuid) from public, anon, authenticated;

-- Settles what's due, at most 200 at a time. Anyone may call it (auction
-- pages do when they load, and the API's cron daily): it only applies
-- deadlines that have passed.
create function private.settle_auctions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid;
  settled integer := 0;
begin
  for due in
    select a.id from public.auctions a
    where (a.status = 'live' and a.ends_at <= now())
      or (a.status = 'won' and a.pay_by <= now())
      or (a.status = 'unpaid' and a.pay_by + interval '7 days' <= now())
    order by coalesce(a.pay_by, a.ends_at)
    limit 200
  loop
    perform private.settle_auction(due);
    settled := settled + 1;
  end loop;
  return settled;
end;
$$;

create function public.settle_auctions()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.settle_auctions() $$;

-- The seller offers an unpaid auction's copy to the next highest bidder at
-- their last bid, once, for 48 hours.
create function private.offer_second_chance(target uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
  item public.products;
  next_bid public.bids;
begin
  select * into a from public.auctions x where x.id = target for update;
  if a.id is null or not private.answers_offers(a.seller_id) then
    raise exception 'Auction not found' using errcode = 'no_data_found';
  end if;
  if a.status <> 'unpaid' or a.second_chance then
    raise exception 'A second chance is offered once, after an unpaid win' using errcode = 'check_violation';
  end if;
  select * into next_bid from public.bids b
  where b.auction_id = target and b.outcome = 'lost'
    and coalesce(private.bidding_blocked_until(b.bidder_id), '-infinity') <= now()
  order by b.amount desc, b.created_at
  limit 1;
  if next_bid.bidder_id is null then
    raise exception 'No other bidder to offer it to' using errcode = 'no_data_found';
  end if;

  update public.auctions set
    status = 'won',
    second_chance = true,
    final_price = next_bid.amount,
    pay_by = now() + interval '48 hours'
  where id = target
  returning * into a;
  update public.bids set outcome = 'second_chance'
  where auction_id = target and bidder_id = next_bid.bidder_id;

  select * into item from public.products p where p.id = a.product_id;
  perform private.notify(
    next_bid.bidder_id, 'order', 'auction_second_chance',
    jsonb_build_object(
      'auction_id', a.id, 'number', a.number, 'amount', a.final_price, 'pay_by', a.pay_by,
      'name_en', item.name_en, 'name_ar', item.name_ar
    ),
    '/store/auctions/' || a.number
  );
  return a;
end;
$$;

create function public.offer_second_chance(target uuid)
returns public.auctions
language sql
security invoker
set search_path = ''
as $$ select private.offer_second_chance(target) $$;

-- The seller closes an unpaid auction instead, and its copy goes back on sale.
create function private.close_auction(target uuid)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
begin
  select * into a from public.auctions x where x.id = target for update;
  if a.id is null or not private.answers_offers(a.seller_id) then
    raise exception 'Auction not found' using errcode = 'no_data_found';
  end if;
  if a.status <> 'unpaid' then
    raise exception 'Only an unpaid auction can be closed' using errcode = 'check_violation';
  end if;
  return private.release_auction(target, 'unsold');
end;
$$;

create function public.close_auction(target uuid)
returns public.auctions
language sql
security invoker
set search_path = ''
as $$ select private.close_auction(target) $$;

-- ── Marks ──────────────────────────────────────────────────────────────────

-- Staff (editors) confirm a signed, limited or rare mark or find it wrong;
-- a wrong mark counts against the shop's score.
create function private.review_auction_mark(target uuid, correct boolean)
returns public.auctions
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.auctions;
  item public.products;
  shop public.sellers;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.auctions set
    mark_review = case when correct then 'confirmed' else 'wrong' end,
    mark_reviewed_by = (select auth.uid()),
    mark_reviewed_at = now()
  where id = target and mark is not null
  returning * into a;
  if a.id is null then
    raise exception 'No mark to review' using errcode = 'no_data_found';
  end if;
  select * into shop from public.sellers s where s.id = a.seller_id;
  if not correct and shop.organization_id is not null then
    select * into item from public.products p where p.id = a.product_id;
    perform private.notify_org_admins(
      shop.organization_id, 'auction_mark_wrong',
      jsonb_build_object(
        'auction_id', a.id, 'number', a.number, 'mark', a.mark,
        'name_en', item.name_en, 'name_ar', item.name_ar
      ),
      '/selling/auctions'
    );
  end if;
  return a;
end;
$$;

create function public.review_auction_mark(target uuid, correct boolean)
returns public.auctions
language sql
security invoker
set search_path = ''
as $$ select private.review_auction_mark(target, correct) $$;

-- A shop's score now also counts wrong marks (×2), over its lines and
-- reviewed marks in the last 90 days.
create or replace function private.seller_score(shop uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with lines as (
    select i.id, i.seller_status, i.ready_by, i.ready_at
    from public.order_items i
    where i.seller_id = shop and i.ready_by > now() - interval '90 days'
  ),
  marks as (
    select
      count(*) as reviewed,
      count(*) filter (where a.mark_review = 'wrong') as wrong
    from public.auctions a
    where a.seller_id = shop and a.mark_review is not null
      and a.mark_reviewed_at > now() - interval '90 days'
  ),
  counts as (
    select
      count(*) as total,
      count(*) filter (where seller_status = 'out_of_stock') as missing,
      count(*) filter (
        where coalesce(ready_at, now()) > ready_by and seller_status <> 'out_of_stock'
      ) as late,
      (
        select count(*) from public.returns r
        where r.seller_id = shop and r.fault = 'shop'
          and r.status not in ('requested', 'disputed', 'rejected', 'cancelled')
          and r.created_at > now() - interval '90 days'
      ) as returned
    from lines
  )
  select case when c.total + m.reviewed = 0 then 100 else
    greatest(0, round(
      100 - 100 * (2 * c.returned + 2 * c.missing + c.late + 2 * m.wrong)::numeric / (c.total + m.reviewed),
      2
    ))
  end
  from counts c cross join marks m;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.start_auction(uuid, uuid, public.product_condition, bigint, integer, text[], text, bigint, public.auction_mark, uuid) from public, anon;
revoke all on function public.start_auction(uuid, uuid, public.product_condition, bigint, integer, text[], text, bigint, public.auction_mark, uuid) from public, anon;
grant execute on function private.start_auction(uuid, uuid, public.product_condition, bigint, integer, text[], text, bigint, public.auction_mark, uuid) to authenticated;
grant execute on function public.start_auction(uuid, uuid, public.product_condition, bigint, integer, text[], text, bigint, public.auction_mark, uuid) to authenticated;

revoke all on function private.cancel_auction(uuid) from public, anon;
revoke all on function public.cancel_auction(uuid) from public, anon;
grant execute on function private.cancel_auction(uuid) to authenticated;
grant execute on function public.cancel_auction(uuid) to authenticated;

revoke all on function private.place_bid(uuid, bigint) from public, anon;
revoke all on function public.place_bid(uuid, bigint) from public, anon;
grant execute on function private.place_bid(uuid, bigint) to authenticated;
grant execute on function public.place_bid(uuid, bigint) to authenticated;

revoke all on function private.settle_auctions() from public;
revoke all on function public.settle_auctions() from public;
grant execute on function private.settle_auctions() to anon, authenticated, service_role;
grant execute on function public.settle_auctions() to anon, authenticated, service_role;

revoke all on function private.offer_second_chance(uuid) from public, anon;
revoke all on function public.offer_second_chance(uuid) from public, anon;
grant execute on function private.offer_second_chance(uuid) to authenticated;
grant execute on function public.offer_second_chance(uuid) to authenticated;

revoke all on function private.close_auction(uuid) from public, anon;
revoke all on function public.close_auction(uuid) from public, anon;
grant execute on function private.close_auction(uuid) to authenticated;
grant execute on function public.close_auction(uuid) to authenticated;

revoke all on function private.review_auction_mark(uuid, boolean) from public, anon;
revoke all on function public.review_auction_mark(uuid, boolean) from public, anon;
grant execute on function private.review_auction_mark(uuid, boolean) to authenticated;
grant execute on function public.review_auction_mark(uuid, boolean) to authenticated;
