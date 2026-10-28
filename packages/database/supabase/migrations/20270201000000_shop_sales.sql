-- Prices, part 2 (owner's master brief, step 7, section 9): shop sales and
-- quantity deals.
--
-- * A sale prices a listing (a seller's variant in one condition) below its
--   price from a start to an end date. While it runs, every copy of the
--   listing costs the sale price (`copies_for_line`), so checkout, offers
--   and price history see it; the price it held before can then be the
--   honest "was" price once it was held 15 of the last 30 days.
-- * A quantity deal takes a share off each copy when a cart line holds at
--   least that many (for example 10% off from 3). The best deal the line
--   qualifies for applies; not with an accepted offer.
-- * Shops set them in Partners; editors set The IDEA's own, which must stay
--   above the margin floor (`house_offer_ok`). Sales of one listing never
--   overlap, and a listing on sale takes no offers.

create table public.listing_sales (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  sale_price bigint not null check (sale_price > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at <= starts_at + interval '90 days')
);

comment on table public.listing_sales is
  'A listing''s sale price between two dates. Written only by functions.';

create index listing_sales_listing_idx on public.listing_sales (variant_id, seller_id, condition, starts_at);
create index listing_sales_seller_idx on public.listing_sales (seller_id);
create index listing_sales_created_by_idx on public.listing_sales (created_by);

create table public.quantity_deals (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  min_quantity integer not null check (min_quantity between 2 and 20),
  discount_rate integer not null check (discount_rate between 1 and 50),
  created_at timestamptz not null default now(),
  unique (variant_id, seller_id, condition, min_quantity)
);

comment on table public.quantity_deals is
  'A share off each copy from a quantity on, per listing. Written only by functions.';

create index quantity_deals_seller_idx on public.quantity_deals (seller_id);

alter table public.listing_sales enable row level security;
alter table public.quantity_deals enable row level security;

-- Customers see sales and deals through product_offers; the seller's team
-- and staff see the rows.
create policy "Sellers see their sales" on public.listing_sales
  for select to authenticated using (private.can_see_seller(seller_id));
create policy "Sellers see their deals" on public.quantity_deals
  for select to authenticated using (private.can_see_seller(seller_id));

grant select on public.listing_sales, public.quantity_deals to authenticated;

-- ── Prices ─────────────────────────────────────────────────────────────────

-- The listing's sale price now, or null.
create function private.sale_price(seller uuid, variant uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select min(x.sale_price) from public.listing_sales x
  where x.seller_id = seller and x.variant_id = variant and x.condition = wanted
    and x.starts_at <= now() and x.ends_at > now();
$$;

-- The listing's price without a sale: its cheapest copy for sale.
create function private.regular_price(seller uuid, variant uuid, wanted public.product_condition)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select min(coalesce(s.price, v.price))
  from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  join public.sellers sl on sl.id = s.seller_id
  where s.seller_id = seller and s.variant_id = variant and s.condition = wanted
    and s.purpose = 'sale' and s.status = 'available' and v.active and sl.status = 'approved';
$$;

revoke all on function private.sale_price(uuid, uuid, public.product_condition) from public, anon, authenticated;
revoke all on function private.regular_price(uuid, uuid, public.product_condition) from public, anon, authenticated;

create or replace function private.copies_for_line(line_product uuid, line_variant uuid, line_condition public.product_condition, wanted integer, line_seller uuid default null)
returns table(stock_item uuid, price bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select s.id, least(coalesce(s.price, v.price), private.sale_price(s.seller_id, s.variant_id, s.condition))
  from public.stock_items s
  join public.products p on p.id = s.product_id
  join public.product_variants v on v.id = s.variant_id
  join public.sellers sl on sl.id = s.seller_id
  where s.product_id = line_product
    and s.variant_id = line_variant
    and s.seller_id = coalesce(line_seller, '00000000-0000-4000-8000-000000000001')
    and sl.status = 'approved'
    and v.active
    and s.purpose = 'sale'
    and s.status = 'available'
    and s.condition = coalesce(line_condition, p.condition)
  order by 2, s.created_at
  limit wanted;
end;
$$;

-- ── Setting sales and deals ────────────────────────────────────────────────

create function private.set_listing_sale(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint,
  starts timestamptz,
  ends timestamptz
)
returns public.listing_sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  regular bigint := private.regular_price(seller, variant, wanted);
  saved public.listing_sales;
begin
  if not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if regular is null then
    raise exception 'Nothing of this listing is for sale' using errcode = 'check_violation';
  end if;
  if price is null or price <= 0 or price >= regular then
    raise exception 'A sale price is below the price' using errcode = 'check_violation';
  end if;
  if ends <= greatest(starts, now()) then
    raise exception 'A sale ends after it starts, in the future' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.sellers sl where sl.id = seller and sl.is_house)
    and not private.house_offer_ok(variant, wanted, price)
  then
    raise exception 'Below the margin floor' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.listing_sales x
    where x.seller_id = seller and x.variant_id = variant and x.condition = wanted
      and x.starts_at < ends and x.ends_at > starts
  ) then
    raise exception 'This listing already has a sale then' using errcode = 'unique_violation';
  end if;

  insert into public.listing_sales (seller_id, variant_id, condition, sale_price, starts_at, ends_at, created_by)
  values (seller, variant, wanted, price, starts, ends, (select auth.uid()))
  returning * into saved;
  perform private.record_listing_price(variant, seller, wanted);
  return saved;
end;
$$;

-- Ends a running sale now, or drops one that hasn't started.
create function private.end_listing_sale(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  sale public.listing_sales;
begin
  select * into sale from public.listing_sales x where x.id = target;
  if sale.id is null or not private.answers_offers(sale.seller_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if sale.starts_at > now() then
    delete from public.listing_sales x where x.id = target;
  elsif sale.ends_at > now() then
    update public.listing_sales x set ends_at = now() where x.id = target;
  end if;
  perform private.record_listing_price(sale.variant_id, sale.seller_id, sale.condition);
end;
$$;

create function private.set_quantity_deal(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  from_quantity integer,
  rate integer
)
returns public.quantity_deals
language plpgsql
security definer
set search_path = ''
as $$
declare
  regular bigint := private.regular_price(seller, variant, wanted);
  saved public.quantity_deals;
begin
  if not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if regular is null then
    raise exception 'Nothing of this listing is for sale' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.sellers sl where sl.id = seller and sl.is_house)
    and not private.house_offer_ok(variant, wanted, regular - floor(regular * rate / 100)::bigint)
  then
    raise exception 'Below the margin floor' using errcode = 'check_violation';
  end if;

  insert into public.quantity_deals as d (seller_id, variant_id, condition, min_quantity, discount_rate)
  values (seller, variant, wanted, from_quantity, rate)
  on conflict (variant_id, seller_id, condition, min_quantity) do update set discount_rate = excluded.discount_rate
  returning * into saved;
  return saved;
end;
$$;

create function private.delete_quantity_deal(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  deal public.quantity_deals;
begin
  select * into deal from public.quantity_deals d where d.id = target;
  if deal.id is null or not private.answers_offers(deal.seller_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.quantity_deals d where d.id = target;
end;
$$;

create function public.set_listing_sale(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint,
  starts timestamptz,
  ends timestamptz
)
returns public.listing_sales
language sql
security invoker
set search_path = ''
as $$ select private.set_listing_sale(seller, variant, wanted, price, starts, ends) $$;

create function public.end_listing_sale(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.end_listing_sale(target) $$;

create function public.set_quantity_deal(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  from_quantity integer,
  rate integer
)
returns public.quantity_deals
language sql
security invoker
set search_path = ''
as $$ select private.set_quantity_deal(seller, variant, wanted, from_quantity, rate) $$;

create function public.delete_quantity_deal(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.delete_quantity_deal(target) $$;

revoke all on function private.set_listing_sale(uuid, uuid, public.product_condition, bigint, timestamptz, timestamptz) from public, anon;
revoke all on function public.set_listing_sale(uuid, uuid, public.product_condition, bigint, timestamptz, timestamptz) from public, anon;
grant execute on function private.set_listing_sale(uuid, uuid, public.product_condition, bigint, timestamptz, timestamptz) to authenticated;
grant execute on function public.set_listing_sale(uuid, uuid, public.product_condition, bigint, timestamptz, timestamptz) to authenticated;
revoke all on function private.end_listing_sale(uuid) from public, anon;
revoke all on function public.end_listing_sale(uuid) from public, anon;
grant execute on function private.end_listing_sale(uuid) to authenticated;
grant execute on function public.end_listing_sale(uuid) to authenticated;
revoke all on function private.set_quantity_deal(uuid, uuid, public.product_condition, integer, integer) from public, anon;
revoke all on function public.set_quantity_deal(uuid, uuid, public.product_condition, integer, integer) from public, anon;
grant execute on function private.set_quantity_deal(uuid, uuid, public.product_condition, integer, integer) to authenticated;
grant execute on function public.set_quantity_deal(uuid, uuid, public.product_condition, integer, integer) to authenticated;
revoke all on function private.delete_quantity_deal(uuid) from public, anon;
revoke all on function public.delete_quantity_deal(uuid) from public, anon;
grant execute on function private.delete_quantity_deal(uuid) to authenticated;
grant execute on function public.delete_quantity_deal(uuid) to authenticated;

-- Sales start and end on their own: the daily selling sweep records the
-- prices of those that started or ended since.
create function public.sweep_listing_sales()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  listing record;
  changed integer := 0;
begin
  for listing in
    select distinct x.seller_id, x.variant_id, x.condition from public.listing_sales x
    where (x.starts_at between now() - interval '1 day' and now())
       or (x.ends_at between now() - interval '1 day' and now())
  loop
    perform private.record_listing_price(listing.variant_id, listing.seller_id, listing.condition);
    changed := changed + 1;
  end loop;
  return changed;
end;
$$;

revoke all on function public.sweep_listing_sales() from public, anon, authenticated;
grant execute on function public.sweep_listing_sales() to service_role;

-- ── Checkout: quantity deals ───────────────────────────────────────────────

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
  deal_rate integer;
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

    -- A quantity deal takes its share off each copy from its quantity on.
    select d.discount_rate into deal_rate from public.quantity_deals d
    where d.seller_id = line.seller_id and d.variant_id = line.variant_id
      and d.condition = line.condition and d.min_quantity <= line.quantity
    order by d.discount_rate desc
    limit 1;
    if deal_rate is not null and offer.id is null then
      line_price := line_price - floor(line_price * deal_rate / 100)::bigint;
    else
      deal_rate := null;
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
      'deal_rate', deal_rate,
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


-- ── Offers: a listing on sale takes none ──────────────────────────────────

create or replace function private.offerable_listings(item uuid)
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
    and v.active and price.amount is not null
    and private.was_price(r.variant_id, r.seller_id, r.condition) is null
    and private.sale_price(r.seller_id, r.variant_id, r.condition) is null;
$$;

create or replace function private.make_offer(seller uuid, variant uuid, wanted public.product_condition, offered bigint)
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
    or not version.active or price is null
    or private.was_price(variant, seller, wanted) is not null
    or private.sale_price(seller, variant, wanted) is not null
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

-- ── What customers see ─────────────────────────────────────────────────────

drop function public.product_offers(uuid);
drop function private.product_offers(uuid);

-- A product's offers, cheapest first: the price (a sale's while it runs,
-- with when it ends), the lowest in the last 30 days, the honest "was"
-- price and the listing's quantity deals.
create function private.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint,
  sale_ends_at timestamptz,
  deals jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.variant_id, o.condition, o.purpose, o.available, o.price, o.seller_id, o.seller_name,
    case when o.purpose = 'sale' then private.lowest_price_30d(o.variant_id, o.seller_id, o.condition) end,
    case when o.purpose = 'sale' then private.was_price(o.variant_id, o.seller_id, o.condition) end,
    case when o.purpose = 'sale' then (
      select max(x.ends_at) from public.listing_sales x
      where x.seller_id = o.seller_id and x.variant_id = o.variant_id and x.condition = o.condition
        and x.starts_at <= now() and x.ends_at > now()
    ) end,
    case when o.purpose = 'sale' then (
      select coalesce(jsonb_agg(jsonb_build_object('min_quantity', d.min_quantity, 'discount_rate', d.discount_rate)
        order by d.min_quantity), '[]'::jsonb)
      from public.quantity_deals d
      where d.seller_id = o.seller_id and d.variant_id = o.variant_id and d.condition = o.condition
    ) end
  from (
    select
      s.variant_id,
      s.condition,
      s.purpose,
      count(*)::integer as available,
      least(
        min(coalesce(s.price, v.price)) filter (where s.purpose = 'sale'),
        case when s.purpose = 'sale' then private.sale_price(s.seller_id, s.variant_id, s.condition) end
      ) as price,
      s.seller_id,
      sl.name as seller_name,
      sl.is_house
    from public.stock_items s
    join public.products p on p.id = s.product_id
    join public.product_variants v on v.id = s.variant_id
    join public.sellers sl on sl.id = s.seller_id
    where s.product_id = offer_product
      and v.active
      and sl.status = 'approved'
      and s.status = 'available'
      and s.purpose in ('sale', 'rental')
      and (p.status = 'active' or private.is_staff())
    group by s.variant_id, s.condition, s.purpose, s.seller_id, sl.name, sl.is_house
  ) o
  order by o.purpose, o.price nulls last, o.is_house desc, o.seller_name;
$$;

create function public.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text,
  lowest_30d bigint,
  was_price bigint,
  sale_ends_at timestamptz,
  deals jsonb
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;
