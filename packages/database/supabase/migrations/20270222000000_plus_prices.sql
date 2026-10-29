-- Plus features, part 1 (owner's master brief, step 12, section 17): prices.
--
-- * Plus prices: a shop (or editors, for The IDEA's own stock, above the
--   margin floor) sets a Plus price on a listing, below its price and paid
--   by the shop, the same way as the student price. Plus members see it
--   (`product_offers.plus_price`) and pay it at checkout when it is lower
--   than everything else; an accepted offer stands alone. Like the student
--   price, it stays out of price history and "was" prices.
-- * Early access to campaigns: Plus members get a campaign's price 24 hours
--   before it opens to everyone (48 hours for Blaze), as their Plus price.
-- * Kits: Shine gets 10% off (Blaze keeps 25%).

create table public.plus_prices (
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

comment on table public.plus_prices is
  'A listing''s price for Plus members, paid by the shop. Written only by functions.';

create index plus_prices_seller_idx on public.plus_prices (seller_id);
create index plus_prices_created_by_idx on public.plus_prices (created_by);

create trigger set_updated_at before update on public.plus_prices
  for each row execute function private.set_updated_at();

alter table public.plus_prices enable row level security;

-- Plus members see their prices through product_offers; the seller's team
-- and staff see the rows.
create policy "Sellers see their Plus prices" on public.plus_prices
  for select to authenticated using (private.can_see_seller(seller_id));

grant select on public.plus_prices to authenticated;

-- ── Setting one ────────────────────────────────────────────────────────────

create function private.set_plus_price(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint
)
returns public.plus_prices
language plpgsql
security definer
set search_path = ''
as $$
declare
  regular bigint := private.regular_price(seller, variant, wanted);
  saved public.plus_prices;
begin
  if not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if regular is null then
    raise exception 'Nothing of this listing is for sale' using errcode = 'check_violation';
  end if;
  if price is null or price <= 0 or price >= regular then
    raise exception 'A Plus price is below the price' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.sellers sl where sl.id = seller and sl.is_house)
    and not private.house_offer_ok(variant, wanted, price)
  then
    raise exception 'Below the margin floor' using errcode = 'check_violation';
  end if;

  insert into public.plus_prices as pp (seller_id, variant_id, condition, price, created_by)
  values (seller, variant, wanted, price, (select auth.uid()))
  on conflict (variant_id, seller_id, condition) do update set price = excluded.price
  returning * into saved;
  return saved;
end;
$$;

create function private.remove_plus_price(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  seller uuid;
begin
  select pp.seller_id into seller from public.plus_prices pp where pp.id = target;
  if seller is null or not private.answers_offers(seller) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.plus_prices pp where pp.id = target;
end;
$$;

create function public.set_plus_price(
  seller uuid,
  variant uuid,
  wanted public.product_condition,
  price bigint
)
returns public.plus_prices
language sql
security invoker
set search_path = ''
as $$ select private.set_plus_price(seller, variant, wanted, price) $$;

create function public.remove_plus_price(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_plus_price(target) $$;

-- ── What Plus members pay ──────────────────────────────────────────────────

-- The share off a seller's listings from campaigns not yet open to
-- everyone that a member of this tier sees early: 24 hours, 48 for Blaze.
create function private.early_campaign_rate(seller uuid, tier integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select max(e.discount_rate)
  from public.campaign_entries e
  join public.campaigns c on c.id = e.campaign_id
  where tier > 0 and e.seller_id = seller and c.published
    and c.starts_at > now()
    and c.starts_at - make_interval(hours => case when tier >= 3 then 48 else 24 end) <= now()
    and c.ends_at > now();
$$;

-- A listing's price for a Plus member of this tier: its Plus price or its
-- early campaign price, whichever is lower, or null.
create function private.plus_price(seller uuid, variant uuid, wanted public.product_condition, tier integer)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select least(
    (
      select pp.price from public.plus_prices pp
      where tier > 0 and pp.seller_id = seller and pp.variant_id = variant and pp.condition = wanted
    ),
    (
      select r.price - floor(r.price * rate.rate / 100)::bigint
      from (select private.early_campaign_rate(seller, tier) as rate) rate
      cross join (select private.regular_price(seller, variant, wanted) as price) r
      where rate.rate is not null and r.price is not null
    )
  );
$$;

-- ── Kits: Shine 10% off, Blaze 25% ─────────────────────────────────────────

create or replace function private.kit_weekends(kit text)
returns table (starts_on date, units_free integer, price bigint, extra_day_price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Baghdad')::date as d),
  thursdays as (
    select (t.d + ((4 - extract(dow from t.d)::integer + 7) % 7) + case
      when extract(dow from t.d) = 4 then 7 else 0 end + 7 * n)::date as starts_on
    from today t, generate_series(0, 7) as n
  ),
  rate as (
    select case private.plus_tier((select auth.uid()))
      when 3 then 0.75
      when 2 then 0.9
      else 1
    end as factor
  )
  select th.starts_on,
    (select count(*)::integer from public.kit_units u
      where u.kit_type = kit and u.status = 'active'
        and not exists (
          select 1 from public.kit_bookings b
          where b.unit_id = u.id and b.status in ('booked', 'out')
            and b.starts_on < th.starts_on + 2 and b.ends_on > th.starts_on
        )),
    private.price_step_250(k.price * r.factor),
    private.price_step_250(k.extra_day_price * r.factor)
  from thursdays th
  cross join rate r
  join public.kit_types k on k.id = kit and k.active
  order by th.starts_on;
$$;

-- ── Offers ──────────────────────────────────────────────────────────────────

drop function public.product_offers(uuid);
drop function private.product_offers(uuid);

-- A product's offers, cheapest first: the price (a sale's or a campaign's
-- while it runs, with when it ends), the lowest in the last 30 days, the
-- honest "was" price, the listing's quantity deals, its student price
-- (verified students) and its Plus price (Plus members: the shop's Plus
-- price or an early campaign price), each when it is lower.
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
  student_price bigint,
  plus_price bigint
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
    ) end,
    case when o.purpose = 'sale' and private.plus_tier((select auth.uid())) > 0 then (
      select x.price from (
        select private.plus_price(o.seller_id, o.variant_id, o.condition, private.plus_tier((select auth.uid()))) as price
      ) x where x.price < o.price
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
  student_price bigint,
  plus_price bigint
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;

-- ── Checkout ────────────────────────────────────────────────────────────────

-- As before (20270221000000_plus_gifts.sql), with the Plus price.
create or replace function private.price_checkout(
  member uuid,
  governorate text,
  fulfilment public.order_fulfilment,
  payment_method public.order_payment_method,
  delivery_zone uuid,
  use_bulbs integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
  -- Plus members: the shop's Plus price, or a campaign's price before it
  -- opens to everyone.
  tier integer := private.plus_tier(member);
  plus_cost bigint;
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
  -- Rent lines: their rent, refundable deposits and the rentals to make.
  rental record;
  rate record;
  rent_items jsonb := '[]'::jsonb;
  rentals jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  goods bigint := 0;
  item public.products;
  -- The cart's game night kit, if any.
  cart_kit public.cart_kits;
  kit_row public.kit_types;
  weekend record;
  kit jsonb;
  -- Plus months given as a gift, if any.
  cart_plus public.cart_plus_gifts;
  gift_plan public.plans;
  plus bigint := 0;
  plus_gift jsonb;
  -- Whether anything in the cart is delivered.
  ships boolean;
begin
  select * into settings from public.store_settings;

  if price_checkout.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;


  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  select * into cart_kit from public.cart_kits k where k.user_id = member;
  select * into cart_plus from public.cart_plus_gifts g where g.user_id = member;
  ships := cart_kit.id is not null
    or exists (select 1 from public.cart_items where user_id = member);
  if not ships and cart_plus.user_id is null then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  -- Plus months on their own are added to the recipient's Pass: nothing
  -- is delivered, so no zone is needed.
  if ships or delivery_zone is not null or wanted <> '' then
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
    where c.user_id = member and c.purpose = 'sale'
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

    -- A Plus member pays the listing's Plus price (the shop pays it) or the
    -- early campaign price when it is lower still (never with an offer).
    plus_cost := null;
    if tier > 0 and offer.id is null then
      plus_cost := private.plus_price(line.seller_id, line.variant_id, line.condition, tier);
      if plus_cost is not null and plus_cost < line_price then
        line_price := plus_cost;
        deal_rate := null;
        student_cost := null;
      else
        plus_cost := null;
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
      'plus_price', plus_cost is not null,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  goods := subtotal;

  -- Rent lines: 1 to 3, several only films, books and games; each priced
  -- by its rate, with a copy free to go out.
  select coalesce(jsonb_agg(
    jsonb_build_object('product', c.product_id, 'variant', c.variant_id)
    order by c.created_at, c.product_id
  ), '[]'::jsonb)
  into rent_items
  from public.cart_items c
  where c.user_id = member and c.purpose = 'rent';
  if jsonb_array_length(rent_items) > 0 then
    for rental in select * from private.rental_items(rent_items) loop
      select * into item from public.products p where p.id = rental.product;
      select * into rate from private.rental_quote(rental.product, rental.variant);
      if item.status is distinct from 'active' or rate.price is null then
        raise exception 'Item not available' using errcode = 'no_data_found';
      end if;
      if not exists (
        select 1 from public.stock_items s
        join public.product_variants v on v.id = s.variant_id
        where s.product_id = rental.product and v.active
          and (rental.variant is null or s.variant_id = rental.variant)
          and s.purpose = 'rental' and s.status = 'available'
      ) then
        raise exception 'All copies are rented out' using errcode = 'check_violation';
      end if;
      rent := rent + rate.price;
      deposits := deposits + rate.deposit;
      rentals := rentals || jsonb_build_object(
        'product_id', rental.product,
        'variant_id', rental.variant,
        'name_ar', item.name_ar,
        'name_en', item.name_en,
        'price', rate.price,
        'deposit', rate.deposit,
        'days', rate.days,
        'late_fee', rate.late_fee
      );
    end loop;
  end if;

  -- A game night kit: the weekend's price and its extra days count like
  -- rent, with its deposit (none for verified students); delivered in
  -- Baghdad only.
  if cart_kit.id is not null then
    select * into kit_row from public.kit_types k where k.id = cart_kit.kit_type and k.active;
    select * into weekend from private.kit_weekends(cart_kit.kit_type) w
    where w.starts_on = cart_kit.starts_on;
    if kit_row.id is null or weekend.starts_on is null then
      raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
    end if;
    if private.free_kit_unit(kit_row.id, cart_kit.starts_on, cart_kit.starts_on + 2 + cart_kit.extra_days) is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    if zone.governorate is distinct from 'baghdad' then
      raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
    end if;
    if private.is_student(member) then
      kit_row.deposit := 0;
    end if;
    kit := jsonb_build_object(
      'kit_type', kit_row.id,
      'name_ar', kit_row.name_ar,
      'name_en', kit_row.name_en,
      'starts_on', cart_kit.starts_on,
      'extra_days', cart_kit.extra_days,
      'games', to_jsonb(cart_kit.games),
      'price', weekend.price + cart_kit.extra_days * weekend.extra_day_price,
      'deposit', kit_row.deposit
    );
    rent := rent + (kit ->> 'price')::bigint;
    deposits := deposits + kit_row.deposit;
  end if;

  -- Plus months as a gift: the plan's monthly price for each month. They
  -- don't count towards free delivery, discounts, the giveaway cap or
  -- cashback.
  if cart_plus.user_id is not null then
    select * into gift_plan from public.plans p
    where p.id = cart_plus.plan_id and p.active and p.audience = 'plus'
      and p.billing_interval = 'month' and p.student_of is null;
    if gift_plan.id is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    plus := gift_plan.amount * cart_plus.months;
    plus_gift := jsonb_build_object(
      'plan_id', gift_plan.id,
      'name', gift_plan.name,
      'name_ar', gift_plan.name_ar,
      'months', cart_plus.months,
      'monthly', gift_plan.amount,
      'price', plus
    );
  end if;
  subtotal := goods + rent + deposits + plus;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := coalesce(zone.fee, 0);
  -- Deposits come back, so they don't count towards the threshold.
  if zone.free_from is not null and goods + rent >= zone.free_from then
    free_reason := 'threshold';
  elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
    free_reason := 'plan';
  end if;
  if free_reason is not null then
    waived := fee;
    fee := 0;
  end if;
  if not ships then
    fee := 0;
    waived := 0;
    free_reason := null;
  end if;
  -- A kit on its own is delivered free, as before.
  if kit is not null and goods = 0 and jsonb_array_length(rentals) = 0 then
    fee := 0;
    waived := 0;
    free_reason := 'kit';
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
    promo := least(floor(goods * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- A coupon applied to the cart (The IDEA pays it) replaces the invite
  -- discount when it takes more off; the cap below still holds.
  select c.* into coupon from public.cart_coupons cc
  join public.coupons c on c.id = cc.coupon_id
  where cc.user_id = member;
  -- Discounts are on what's bought; rentals keep their rates.
  if coupon.id is not null and private.coupon_problem(coupon.id, member, goods) is null then
    coupon_off := case coupon.kind
      when 'percent' then floor(goods * coupon.amount / 100)::bigint
      else coupon.amount
    end;
    coupon_off := least(coupon_off, coalesce(coupon.max_discount, coupon_off), goods);
    if coupon_off > promo then
      promo := coupon_off;
      source := 'coupon';
    end if;
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor((goods + rent) * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs (1 IQD each) pay up to the whole order, from what's usable now,
  -- in steps of 250 and at least 1,000.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    -- Bulbs pay for what's bought and rented, never a deposit, and up to
    -- half of one month of gifted Plus.
    bulbs := (least(
      use_bulbs,
      goods + rent + fee - promo + least(plus, coalesce(gift_plan.amount, 0) / 2)
    ) / 250 * 250)::integer;
    if bulbs < 1000 then
      bulbs := 0;
    end if;
  end if;

  total := subtotal + fee - promo - bulbs;
  max_bulbs := greatest(0, cap - waived - promo)::integer;
  -- Cashback on what's paid in money, at the member's rate, rounded.
  earn := least(
    round(
      (goods + rent)
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 100
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'rentals', rentals,
    'kit', kit,
    'plus_gift', plus_gift,
    'plus', plus,
    'ships', ships,
    'goods', goods,
    'rent', rent,
    'deposits', deposits,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', zone.free_from,
    'discount', promo,
    'discount_source', source,
    'coupon_code', case when coupon.id is not null then coupon.code end,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$$;


-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.set_plus_price(uuid, uuid, public.product_condition, bigint) from public, anon;
revoke all on function public.set_plus_price(uuid, uuid, public.product_condition, bigint) from public, anon;
grant execute on function private.set_plus_price(uuid, uuid, public.product_condition, bigint) to authenticated;
grant execute on function public.set_plus_price(uuid, uuid, public.product_condition, bigint) to authenticated;
revoke all on function private.remove_plus_price(uuid) from public, anon;
revoke all on function public.remove_plus_price(uuid) from public, anon;
grant execute on function private.remove_plus_price(uuid) to authenticated;
grant execute on function public.remove_plus_price(uuid) to authenticated;
revoke all on function private.early_campaign_rate(uuid, integer) from public, anon, authenticated;
revoke all on function private.plus_price(uuid, uuid, public.product_condition, integer) from public;
grant execute on function private.plus_price(uuid, uuid, public.product_condition, integer) to anon, authenticated, service_role;
