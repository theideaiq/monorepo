-- Selling: Make an offer (owner's master brief, 2026-10-28, section 14;
-- auctions come later, with step 14 of the order of work).
--
-- * A listing (a seller's variant in one condition) accepts offers when
--   its seller turns it on (`offer_settings`, `set_offer_settings`):
--   owners and admins of a shop, or Staff for The IDEA's own stock. A
--   seller may set an amount from which offers are accepted automatically
--   and one below which they're declined.
-- * Never on items on sale (a compare-at price: discounts don't stack),
--   rentals, kits, tickets or programs; offers are on sale copies only.
-- * `make_offer`: at least 60% of the price (`store_settings.offer_floor_rate`)
--   and below it; one open offer per buyer per listing and at most 3 with
--   the same seller. The IDEA's own stock declines offers below its margin
--   floor (cost, payment fee, a delivery, the largest giveaway and
--   `min_margin_rate`).
-- * `answer_offer`: the seller accepts, declines or counters, and the
--   buyer answers a counter the same way; each side counters once. Every
--   move gives the other side 48 hours (`sweep_offers` expires them).
-- * An accepted offer puts one copy in the buyer's cart at that price for
--   24 hours (`price_checkout`); ordering it marks the offer purchased.
--   Commission is on the price paid, as for any line.

create type public.offer_status as enum (
  -- Waiting for the seller.
  'open',
  -- The seller countered; waiting for the buyer.
  'countered',
  -- In the buyer's cart at the agreed price for 24 hours.
  'accepted',
  'declined',
  'expired',
  'withdrawn',
  'purchased'
);

alter table public.store_settings
  add column offer_floor_rate numeric(5, 2) not null default 60
    check (offer_floor_rate > 0 and offer_floor_rate <= 100);

comment on column public.store_settings.offer_floor_rate is
  'Offers below this percentage of a listing''s price are blocked.';

-- ── Settings per listing ───────────────────────────────────────────────────

create table public.offer_settings (
  seller_id uuid not null references public.sellers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  accept_offers boolean not null default false,
  -- Offers at or above this are accepted at once.
  auto_accept_at bigint check (auto_accept_at > 0),
  -- Offers below this are declined at once.
  auto_decline_below bigint check (auto_decline_below > 0),
  updated_at timestamptz not null default now(),
  primary key (seller_id, variant_id, condition),
  check (auto_accept_at is null or auto_decline_below is null or auto_decline_below <= auto_accept_at)
);

comment on table public.offer_settings is
  'Whether a listing (seller, variant, condition) accepts offers, with its automatic accept and decline amounts. Private to the seller.';

create index offer_settings_variant_idx on public.offer_settings (variant_id);

create trigger set_updated_at before update on public.offer_settings
  for each row execute function private.set_updated_at();

alter table public.offer_settings enable row level security;

-- The thresholds are the seller's business: its members and staff read
-- them; everyone else learns only which listings accept offers
-- (`offerable_listings`).
create policy "Shops and staff read offer settings" on public.offer_settings
  for select to authenticated
  using ((select private.can_see_seller(seller_id)));

revoke all on public.offer_settings from anon, authenticated;
grant select on public.offer_settings to authenticated;
grant all on public.offer_settings to service_role;

-- ── Offers ─────────────────────────────────────────────────────────────────

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  buyer_id uuid not null references auth.users (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  -- The listing's price when the offer was made.
  list_price bigint not null check (list_price > 0),
  -- What's on the table now: the buyer's offer or the latest counter.
  amount bigint not null check (amount > 0),
  buyer_amount bigint not null check (buyer_amount > 0),
  seller_counter bigint check (seller_counter > 0),
  buyer_counter bigint check (buyer_counter > 0),
  status public.offer_status not null default 'open',
  -- The other side answers by then.
  expires_at timestamptz not null default now() + interval '48 hours',
  answered_by uuid references auth.users (id) on delete set null,
  accepted_at timestamptz,
  -- An accepted offer holds its price in the cart until then.
  cart_until timestamptz,
  order_item_id uuid references public.order_items (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (amount < list_price),
  check (buyer_counter is null or seller_counter is not null),
  check (status <> 'accepted' or cart_until is not null)
);

comment on table public.offers is
  'Offers on listings: the buyer''s amount, one counter each way, and the outcome. Written only by functions.';

-- One open offer per buyer per listing.
create unique index offers_open_listing_idx on public.offers (buyer_id, seller_id, variant_id, condition)
  where status in ('open', 'countered', 'accepted');
create index offers_buyer_idx on public.offers (buyer_id, created_at desc);
create index offers_seller_idx on public.offers (seller_id, status, created_at desc);
create index offers_product_idx on public.offers (product_id);
create index offers_variant_idx on public.offers (variant_id);
create index offers_answered_by_idx on public.offers (answered_by);
create index offers_order_item_idx on public.offers (order_item_id);
create index offers_due_idx on public.offers (expires_at) where status in ('open', 'countered');

create trigger set_updated_at before update on public.offers
  for each row execute function private.set_updated_at();

alter table public.offers enable row level security;

create policy "Buyers, shops and staff see offers" on public.offers
  for select to authenticated
  using (
    buyer_id = (select auth.uid())
    or (select private.can_see_seller(seller_id))
  );

revoke all on public.offers from anon, authenticated;
grant select on public.offers to authenticated;
grant all on public.offers to service_role;

-- ── Helpers ────────────────────────────────────────────────────────────────

-- Who answers for a listing: a shop's owners and admins, or Staff
-- (editors) for The IDEA's own stock.
create function private.answers_offers(seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.can_list_for(seller)
    or (
      exists (select 1 from public.sellers s where s.id = seller and s.is_house)
      and private.has_staff_role('{editor}')
    );
$$;

revoke all on function private.answers_offers(uuid) from public, anon;
grant execute on function private.answers_offers(uuid) to authenticated;

-- A listing's price now: its cheapest copy for sale, or null if none.
create function private.listing_price(seller uuid, variant uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select min(f.price)
  from public.product_variants v
  cross join lateral private.copies_for_line(v.product_id, v.id, wanted, 1, seller) f
  where v.id = variant;
$$;

revoke all on function private.listing_price(uuid, uuid, public.product_condition) from public, anon, authenticated;

-- Whether The IDEA can take this much for its copy: what's left after the
-- copy's cost, the payment fee, a delivery and the largest giveaway must
-- be the margin floor. A copy without a cost never qualifies.
create function private.house_offer_ok(variant uuid, wanted public.product_condition, offered bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_or(
    offered - s.cost
      - ceil(offered * st.payment_fee_rate / 100)::bigint
      - st.delivery_cost
      - floor(offered * st.max_giveaway_rate / 100)::bigint
      >= ceil(offered * st.min_margin_rate / 100)::bigint
  ), false)
  from public.stock_items s
  cross join public.store_settings st
  where s.variant_id = variant and s.condition = wanted
    and s.seller_id = '00000000-0000-4000-8000-000000000001'
    and s.purpose = 'sale' and s.status = 'available' and s.cost is not null;
$$;

revoke all on function private.house_offer_ok(uuid, public.product_condition, bigint) from public, anon, authenticated;

-- Accepting puts one copy in the buyer's cart at the agreed price.
create function private.accept_offer(target uuid)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offers;
begin
  update public.offers set
    status = 'accepted',
    accepted_at = now(),
    cart_until = now() + interval '24 hours'
  where id = target
  returning * into o;

  insert into public.cart_items (user_id, product_id, variant_id, seller_id, condition, quantity)
  values (o.buyer_id, o.product_id, o.variant_id, o.seller_id, o.condition, 1)
  on conflict (user_id, product_id, variant_id, seller_id, condition) do update set quantity = 1;
  return o;
end;
$$;

revoke all on function private.accept_offer(uuid) from public, anon, authenticated;

-- A seller's automatic answers (and The IDEA's margin floor) on an offer
-- waiting for it.
create function private.auto_answer_offer(target uuid)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offers;
  rules public.offer_settings;
begin
  select * into o from public.offers where id = target;
  select * into rules from public.offer_settings r
  where r.seller_id = o.seller_id and r.variant_id = o.variant_id and r.condition = o.condition;

  if (
    exists (select 1 from public.sellers s where s.id = o.seller_id and s.is_house)
    and not private.house_offer_ok(o.variant_id, o.condition, o.amount)
  ) or o.amount < rules.auto_decline_below then
    update public.offers set status = 'declined' where id = target returning * into o;
  elsif o.amount >= rules.auto_accept_at then
    o := private.accept_offer(target);
  end if;
  return o;
end;
$$;

revoke all on function private.auto_answer_offer(uuid) from public, anon, authenticated;

-- ── Settings ───────────────────────────────────────────────────────────────

create function private.set_offer_settings(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  accept boolean,
  accept_at bigint default null,
  decline_below bigint default null
)
returns public.offer_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.offer_settings;
begin
  if not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  insert into public.offer_settings as s (seller_id, variant_id, condition, accept_offers, auto_accept_at, auto_decline_below)
  values (seller, variant, wanted, accept, accept_at, decline_below)
  on conflict (seller_id, variant_id, condition) do update set
    accept_offers = excluded.accept_offers,
    auto_accept_at = excluded.auto_accept_at,
    auto_decline_below = excluded.auto_decline_below
  returning * into saved;
  return saved;
end;
$$;

create function public.set_offer_settings(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  accept boolean,
  accept_at bigint default null,
  decline_below bigint default null
)
returns public.offer_settings
language sql
security invoker
set search_path = ''
as $$ select private.set_offer_settings(seller, variant, wanted, accept, accept_at, decline_below) $$;

-- Which of a product's listings take offers, and the lowest offer each
-- accepts; for the product page.
create function private.offerable_listings(item uuid)
returns table (seller_id uuid, variant_id uuid, condition public.product_condition, min_offer bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.seller_id, r.variant_id, r.condition,
    ceil(price.amount * st.offer_floor_rate / 100)::bigint
  from public.offer_settings r
  join public.product_variants v on v.id = r.variant_id
  join public.products p on p.id = v.product_id
  cross join public.store_settings st
  cross join lateral (select private.listing_price(r.seller_id, r.variant_id, r.condition) as amount) price
  where p.id = item and r.accept_offers and p.status = 'active' and p.kind = 'sale'
    and v.active and v.compare_at_price is null and price.amount is not null;
$$;

create function public.offerable_listings(item uuid)
returns table (seller_id uuid, variant_id uuid, condition public.product_condition, min_offer bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.offerable_listings(item) $$;

-- ── Making and answering offers ────────────────────────────────────────────

create function private.make_offer(seller uuid, variant uuid, wanted public.product_condition, offered bigint)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  version public.product_variants;
  rules public.offer_settings;
  price bigint;
  rate numeric;
  o public.offers;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into version from public.product_variants v where v.id = variant;
  select * into item from public.products p where p.id = version.product_id;
  select * into rules from public.offer_settings r
  where r.seller_id = seller and r.variant_id = variant and r.condition = wanted;
  price := private.listing_price(seller, variant, wanted);

  if not coalesce(rules.accept_offers, false) or item.status <> 'active' or item.kind <> 'sale'
    or not version.active or version.compare_at_price is not null or price is null
  then
    raise exception 'This listing doesn''t take offers' using errcode = 'check_violation';
  end if;
  if private.works_at_seller(seller) then
    raise exception 'You can''t make an offer to your own shop' using errcode = 'check_violation';
  end if;

  select st.offer_floor_rate into rate from public.store_settings st;
  if offered >= price then
    raise exception 'An offer is below the price' using errcode = 'check_violation';
  end if;
  if offered < ceil(price * rate / 100) then
    raise exception 'Offers start at % IQD', ceil(price * rate / 100)::bigint
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.offers x
    where x.buyer_id = caller and x.seller_id = seller and x.variant_id = variant
      and x.condition = wanted and x.status in ('open', 'countered', 'accepted')
  ) then
    raise exception 'You already have an offer on this' using errcode = 'unique_violation';
  end if;
  if (
    select count(*) from public.offers x
    where x.buyer_id = caller and x.seller_id = seller and x.status in ('open', 'countered')
  ) >= 3 then
    raise exception 'At most 3 open offers with one seller' using errcode = 'check_violation';
  end if;

  insert into public.offers (buyer_id, seller_id, product_id, variant_id, condition, list_price, amount, buyer_amount)
  values (caller, seller, item.id, variant, wanted, price, offered, offered)
  returning * into o;
  return private.auto_answer_offer(o.id);
end;
$$;

create function public.make_offer(seller uuid, variant uuid, wanted public.product_condition, offered bigint)
returns public.offers
language sql
security invoker
set search_path = ''
as $$ select private.make_offer(seller, variant, wanted, offered) $$;

-- Accept, decline or counter (once each way). The seller answers an open
-- offer; the buyer answers the seller's counter.
create function private.answer_offer(target uuid, answer text, counter bigint default null)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  o public.offers;
  floor_amount bigint;
  buyer boolean;
begin
  if answer not in ('accept', 'decline', 'counter') then
    raise exception 'Unknown answer' using errcode = 'check_violation';
  end if;
  select * into o from public.offers x where x.id = target for update;
  if o.id is null then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  buyer := o.buyer_id = caller;
  if not buyer and not private.answers_offers(o.seller_id) then
    raise exception 'Offer not found' using errcode = 'no_data_found';
  end if;
  if o.status <> (case when buyer then 'countered' else 'open' end)::public.offer_status
    or o.expires_at <= now()
  then
    raise exception 'This offer isn''t waiting for you' using errcode = 'check_violation';
  end if;

  if answer = 'accept' then
    update public.offers set answered_by = caller where id = target;
    return private.accept_offer(target);
  end if;
  if answer = 'decline' then
    update public.offers set status = 'declined', answered_by = caller
    where id = target returning * into o;
    return o;
  end if;

  -- A counter.
  select ceil(o.list_price * st.offer_floor_rate / 100)::bigint into floor_amount
  from public.store_settings st;
  if buyer then
    if o.buyer_counter is not null then
      raise exception 'You''ve already countered' using errcode = 'check_violation';
    end if;
    if counter is null or counter <= o.buyer_amount or counter >= o.amount or counter < floor_amount then
      raise exception 'Counter between your offer and theirs' using errcode = 'check_violation';
    end if;
    update public.offers set
      amount = counter, buyer_counter = counter, status = 'open',
      expires_at = now() + interval '48 hours'
    where id = target;
    return private.auto_answer_offer(target);
  end if;

  if o.seller_counter is not null then
    raise exception 'You''ve already countered' using errcode = 'check_violation';
  end if;
  if counter is null or counter <= o.amount or counter >= o.list_price then
    raise exception 'Counter between the offer and your price' using errcode = 'check_violation';
  end if;
  update public.offers set
    amount = counter, seller_counter = counter, status = 'countered', answered_by = caller,
    expires_at = now() + interval '48 hours'
  where id = target
  returning * into o;
  return o;
end;
$$;

create function public.answer_offer(target uuid, answer text, counter bigint default null)
returns public.offers
language sql
security invoker
set search_path = ''
as $$ select private.answer_offer(target, answer, counter) $$;

create function private.withdraw_offer(target uuid)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offers;
begin
  update public.offers set status = 'withdrawn'
  where id = target and buyer_id = (select auth.uid()) and status in ('open', 'countered')
  returning * into o;
  if o.id is null then
    raise exception 'This offer can''t be withdrawn' using errcode = 'check_violation';
  end if;
  return o;
end;
$$;

create function public.withdraw_offer(target uuid)
returns public.offers
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_offer(target) $$;

-- Deadlines (apps/api's cron): unanswered offers expire, and an accepted
-- offer not ordered in 24 hours lets go of its price and cart line.
create function public.sweep_offers()
returns setof public.offers
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with lapsed as (
    update public.offers set status = 'expired'
    where (status in ('open', 'countered') and expires_at <= now())
      or (status = 'accepted' and cart_until <= now())
    returning *
  ),
  uncarted as (
    delete from public.cart_items c
    using lapsed l
    where l.cart_until is not null and c.user_id = l.buyer_id and c.product_id = l.product_id
      and c.variant_id = l.variant_id and c.seller_id = l.seller_id and c.condition = l.condition
  )
  select * from lapsed;
end;
$$;

-- Ordering an accepted offer's copy closes it.
create function private.offer_purchased()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.offers o set status = 'purchased', order_item_id = new.id
  from public.orders ord
  where ord.id = new.order_id and o.buyer_id = ord.user_id and o.status = 'accepted'
    and o.seller_id = coalesce(new.seller_id, '00000000-0000-4000-8000-000000000001')
    and o.variant_id = new.variant_id and o.condition = new.condition
    and o.amount = new.unit_price;
  return null;
end;
$$;

create trigger offer_purchased after insert on public.order_items
  for each row execute function private.offer_purchased();

-- The buyer hears how the seller answered.
create function private.notify_offer_answer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the seller's moves: an open offer is the seller's to answer.
  if old.status = 'open' and new.status in ('accepted', 'declined', 'countered') then
    insert into public.notifications (user_id, kind, event, data, link)
    select new.buyer_id, 'order', 'offer_' || new.status::text,
      jsonb_build_object('offer_id', new.id, 'amount', new.amount, 'name_en', p.name_en, 'name_ar', p.name_ar),
      case when new.status = 'accepted' then '/cart' else '/pass/saved#offers' end
    from public.products p where p.id = new.product_id;
  end if;
  return null;
end;
$$;

create trigger notify_offer_answer after update of status on public.offers
  for each row execute function private.notify_offer_answer();

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.set_offer_settings(uuid, uuid, public.product_condition, boolean, bigint, bigint) from public, anon;
revoke all on function public.set_offer_settings(uuid, uuid, public.product_condition, boolean, bigint, bigint) from public, anon;
grant execute on function private.set_offer_settings(uuid, uuid, public.product_condition, boolean, bigint, bigint) to authenticated;
grant execute on function public.set_offer_settings(uuid, uuid, public.product_condition, boolean, bigint, bigint) to authenticated;

revoke all on function private.offerable_listings(uuid) from public;
revoke all on function public.offerable_listings(uuid) from public;
grant execute on function private.offerable_listings(uuid) to anon, authenticated;
grant execute on function public.offerable_listings(uuid) to anon, authenticated;

revoke all on function private.make_offer(uuid, uuid, public.product_condition, bigint) from public, anon;
revoke all on function public.make_offer(uuid, uuid, public.product_condition, bigint) from public, anon;
grant execute on function private.make_offer(uuid, uuid, public.product_condition, bigint) to authenticated;
grant execute on function public.make_offer(uuid, uuid, public.product_condition, bigint) to authenticated;

revoke all on function private.answer_offer(uuid, text, bigint) from public, anon;
revoke all on function public.answer_offer(uuid, text, bigint) from public, anon;
grant execute on function private.answer_offer(uuid, text, bigint) to authenticated;
grant execute on function public.answer_offer(uuid, text, bigint) to authenticated;

revoke all on function private.withdraw_offer(uuid) from public, anon;
revoke all on function public.withdraw_offer(uuid) from public, anon;
grant execute on function private.withdraw_offer(uuid) to authenticated;
grant execute on function public.withdraw_offer(uuid) to authenticated;

revoke all on function public.sweep_offers() from public, anon, authenticated;
grant execute on function public.sweep_offers() to service_role;

-- ── Checkout: an accepted offer's price ────────────────────────────────────

CREATE OR REPLACE FUNCTION private.price_checkout(member uuid, governorate text, fulfilment order_fulfilment, payment_method order_payment_method, delivery_zone uuid, use_bulbs integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  offer public.offers;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  promo bigint := 0;
  source text;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
begin
  select * into settings from public.store_settings;

  if price_checkout.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

  if delivery_zone is not null then
    select * into zone from public.delivery_zones z
    where z.id = delivery_zone and z.active;
  else
    select * into zone from public.delivery_zones z
    where z.active and (z.governorate = wanted or lower(z.name_en) = wanted)
    order by z.position
    limit 1;
  end if;
  if zone.id is null then
    raise exception 'Delivery zone not available' using errcode = 'check_violation';
  end if;

  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.cart_items where user_id = member) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  for line in
    select
      c.product_id,
      c.variant_id,
      c.seller_id,
      sl.name as seller_name,
      sl.status as seller_status,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    join public.sellers sl on sl.id = c.seller_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = member
    order by c.created_at, c.product_id
  loop
    if line.status <> 'active' or line.seller_status <> 'approved' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity, line.seller_id) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    -- An accepted offer prices one copy of its listing for 24 hours.
    select * into offer from public.offers o
    where o.buyer_id = member and o.status = 'accepted' and o.cart_until > now()
      and o.seller_id = line.seller_id and o.variant_id = line.variant_id
      and o.condition = line.condition;
    if offer.id is not null then
      if line.quantity > 1 then
        raise exception 'An accepted offer is for one copy' using errcode = 'check_violation';
      end if;
      line_price := least(line_price, offer.amount);
    end if;

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'offer_id', offer.id,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := zone.fee;
  if zone.free_from is not null and subtotal >= zone.free_from then
    free_reason := 'threshold';
  elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
    free_reason := 'plan';
  end if;
  if free_reason is not null then
    waived := fee;
    fee := 0;
  end if;

  -- A friend's invite takes 10% off the first order (at most 15,000 IQD).
  select * into invite from public.referrals r
  where r.invitee_id = member and r.status = 'pending';
  -- Once: not after a paid order, nor while another invite order is open.
  if invite.invitee_id is not null and not exists (
    select 1 from public.orders o
    where o.user_id = member
      and (
        o.status not in ('cancelled', 'pending')
        or (o.discount_source = 'invite' and o.status <> 'cancelled')
      )
  ) then
    promo := least(floor(subtotal * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor(subtotal * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs pay up to the whole order (100 IQD each), from what's usable now.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    bulbs := least(use_bulbs, ((subtotal + fee - promo) / 100)::integer);
  end if;

  total := subtotal + fee - promo - bulbs * 100;
  max_bulbs := (greatest(0, cap - waived - promo) / 100)::integer;
  -- Cashback on what's paid in money, at the member's rate (1 Bulb = 100 IQD).
  earn := least(
    floor(
      subtotal
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 10000
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', zone.free_from,
    'discount', promo,
    'discount_source', source,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs * 100,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$function$;
