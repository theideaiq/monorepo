-- Prices, part 5 (owner's master brief, step 7, section 9): student prices.
--
-- * A shop (or editors, for The IDEA's own stock, above the margin floor)
--   sets a student price on a listing: below its price, paid by the shop.
-- * Only verified students see it (`product_offers.student_price`, null
--   for everyone else) and pay it at checkout when it is lower than the
--   listing's price, sale or quantity deal; an accepted offer stands alone.
--   The educator badge (section 21) joins `private.is_student` later.
-- * It is not a public price: it stays out of price history and "was"
--   prices.

create table public.student_prices (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null,
  price bigint not null check (price > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (variant_id, seller_id, condition)
);

comment on table public.student_prices is
  'A listing''s price for verified students, paid by the shop. Written only by functions.';

create index student_prices_seller_idx on public.student_prices (seller_id);
create index student_prices_created_by_idx on public.student_prices (created_by);

create trigger set_updated_at before update on public.student_prices
  for each row execute function private.set_updated_at();

alter table public.student_prices enable row level security;

-- Students see their prices through product_offers; the seller's team and
-- staff see the rows.
create policy "Sellers see their student prices" on public.student_prices
  for select to authenticated using (private.can_see_seller(seller_id));

grant select on public.student_prices to authenticated;

-- ── Setting one ────────────────────────────────────────────────────────────

create function private.set_student_price(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint
)
returns public.student_prices
language plpgsql
security definer
set search_path = ''
as $$
declare
  regular bigint := private.regular_price(seller, variant, wanted);
  saved public.student_prices;
begin
  if not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if regular is null then
    raise exception 'Nothing of this listing is for sale' using errcode = 'check_violation';
  end if;
  if price is null or price <= 0 or price >= regular then
    raise exception 'A student price is below the price' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.sellers sl where sl.id = seller and sl.is_house)
    and not private.house_offer_ok(variant, wanted, price)
  then
    raise exception 'Below the margin floor' using errcode = 'check_violation';
  end if;

  insert into public.student_prices as sp (seller_id, variant_id, condition, price, created_by)
  values (seller, variant, wanted, price, (select auth.uid()))
  on conflict (variant_id, seller_id, condition) do update set price = excluded.price
  returning * into saved;
  return saved;
end;
$$;

create function private.remove_student_price(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller uuid;
begin
  select sp.seller_id into seller from public.student_prices sp where sp.id = target;
  if seller is null or not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.student_prices sp where sp.id = target;
end;
$$;

create function public.set_student_price(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint
)
returns public.student_prices
language sql
security invoker
set search_path = ''
as $$ select private.set_student_price(seller, variant, wanted, price) $$;

create function public.remove_student_price(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_student_price(target) $$;

revoke all on function private.set_student_price(uuid, uuid, public.product_condition, bigint) from public, anon;
revoke all on function public.set_student_price(uuid, uuid, public.product_condition, bigint) from public, anon;
grant execute on function private.set_student_price(uuid, uuid, public.product_condition, bigint) to authenticated;
grant execute on function public.set_student_price(uuid, uuid, public.product_condition, bigint) to authenticated;
revoke all on function private.remove_student_price(uuid) from public, anon;
revoke all on function public.remove_student_price(uuid) from public, anon;
grant execute on function private.remove_student_price(uuid) to authenticated;
grant execute on function public.remove_student_price(uuid) to authenticated;

-- ── What students see ──────────────────────────────────────────────────────

drop function public.product_offers(uuid);
drop function private.product_offers(uuid);

-- A product's offers, cheapest first: the price (a sale's or a campaign's
-- while it runs, with when it ends), the lowest in the last 30 days, the
-- honest "was" price, the listing's quantity deals and, for verified
-- students only, its student price when it is lower.
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
  deals jsonb,
  student_price bigint
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
    case when o.purpose = 'sale' then private.sale_ends(o.seller_id, o.variant_id, o.condition) end,
    case when o.purpose = 'sale' then (
      select coalesce(jsonb_agg(jsonb_build_object('min_quantity', d.min_quantity, 'discount_rate', d.discount_rate)
        order by d.min_quantity), '[]'::jsonb)
      from public.quantity_deals d
      where d.seller_id = o.seller_id and d.variant_id = o.variant_id and d.condition = o.condition
    ) end,
    case when o.purpose = 'sale' and private.is_student((select auth.uid())) then (
      select sp.price from public.student_prices sp
      where sp.seller_id = o.seller_id and sp.variant_id = o.variant_id and sp.condition = o.condition
        and sp.price < o.price
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
  deals jsonb,
  student_price bigint
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;

-- ── Checkout ───────────────────────────────────────────────────────────────

-- As before (20270203000000_coupons.sql), with the student price.
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
  student boolean := private.is_student(member);
  student_cost bigint;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  coupon public.coupons;
  coupon_off bigint;
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

    -- A verified student pays the listing's student price when it is lower
    -- than everything above (never with an accepted offer); the shop pays it.
    student_cost := null;
    if student and offer.id is null then
      select sp.price into student_cost from public.student_prices sp
      where sp.seller_id = line.seller_id and sp.variant_id = line.variant_id
        and sp.condition = line.condition;
      if student_cost is not null and student_cost < line_price then
        line_price := student_cost;
        deal_rate := null;
      else
        student_cost := null;
      end if;
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
      'student_price', student_cost is not null,
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

  -- A coupon applied to the cart (The IDEA pays it) replaces the invite
  -- discount when it takes more off; the cap below still holds.
  select c.* into coupon from public.cart_coupons cc
  join public.coupons c on c.id = cc.coupon_id
  where cc.user_id = member;
  if coupon.id is not null and private.coupon_problem(coupon.id, member, subtotal) is null then
    coupon_off := case coupon.kind
      when 'percent' then floor(subtotal * coupon.amount / 100)::bigint
      else coupon.amount
    end;
    coupon_off := least(coupon_off, coalesce(coupon.max_discount, coupon_off), subtotal);
    if coupon_off > promo then
      promo := coupon_off;
      source := 'coupon';
    end if;
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
    'coupon_code', case when coupon.id is not null then coupon.code end,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs * 100,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$function$;
