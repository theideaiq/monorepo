-- Program revision v1, step 2: the money rules.
--
-- * Bulbs are flat: everyone earns `store_settings.bulb_rate` (3%) on
--   purchases, The IDEA Plus members their plan's rate (Glow 4%, Shine 5%,
--   Blaze 6%). Consoles, laptops and items over 500,000 IQD earn half
--   (`products.bulb_multiplier`, the category's, `bulb_half_from`). The
--   spend tiers (Glow, Shine, Beam, Blaze) go, with their delivery perks and
--   the Club's tier join rule (it becomes Plus). Nobody loses Bulbs.
-- * The Plus plans are Glow 14,750, Shine 22,750 and Blaze 39,750 IQD a
--   month for 1, 2 and 4 items; they are added switched off until Plus
--   launches.
-- * Delivery is free per zone: `delivery_zones.free_from` (Baghdad
--   150,000 IQD) for everyone, and `plus_free_delivery` (Baghdad) for plans
--   with `free_delivery` (Shine and Blaze). The store-wide threshold goes.
-- * One return window, `store_settings.return_days` (14): Bulbs from an
--   order and an invite, and affiliate commissions, wait for it.
-- * What an order gives away (discount, delivery waived, affiliate
--   commission and cashback) is capped at `max_giveaway_rate` (20%) of the
--   subtotal: the discount shrinks first at checkout, the cashback at
--   delivery (`orders.max_bulbs`).
-- * Cash on delivery stops above `cash_limit` (500,000 IQD); pickup can
--   still be paid in cash.
-- * `checkout_quote()` prices the caller's cart exactly as `create_order()`
--   will, for the checkout page; `price_check()` lists copies without a
--   cost or below the margin floor (`min_margin_rate` after the payment
--   fee, a delivery and the largest giveaway).

-- ── Settings ───────────────────────────────────────────────────────────────

alter table public.store_settings
  drop column free_shipping_threshold,
  drop column bulb_plus_bonus,
  add column bulb_rate numeric(4, 2) not null default 3
    check (bulb_rate >= 0 and bulb_rate <= 50),
  add column bulb_half_from bigint not null default 500000 check (bulb_half_from > 0),
  add column return_days smallint not null default 14 check (return_days between 1 and 60),
  add column max_giveaway_rate numeric(4, 2) not null default 20
    check (max_giveaway_rate >= 0 and max_giveaway_rate <= 100),
  add column cash_limit bigint default 500000 check (cash_limit > 0),
  add column payment_fee_rate numeric(4, 2) not null default 3
    check (payment_fee_rate >= 0 and payment_fee_rate <= 20),
  add column delivery_cost bigint not null default 5000 check (delivery_cost >= 0),
  add column min_margin_rate numeric(4, 2) not null default 20
    check (min_margin_rate >= 0 and min_margin_rate <= 100);

comment on column public.store_settings.bulb_rate is
  'Bulbs cashback in percent for every Pass holder; Plus plans set their own (plans.bulb_rate).';
comment on column public.store_settings.bulb_half_from is
  'Items priced above this (IQD) earn half the Bulbs rate.';
comment on column public.store_settings.return_days is
  'The return window in days: order Bulbs, invite Bulbs and affiliate commissions wait for it.';
comment on column public.store_settings.max_giveaway_rate is
  'The most an order gives away (discount, free delivery, affiliate commission, cashback), in percent of its subtotal.';
comment on column public.store_settings.cash_limit is
  'Orders above this (IQD) can''t be paid in cash on delivery; null for no limit.';
comment on column public.store_settings.payment_fee_rate is
  'The online payment fee in percent (Wayl), for the price check.';
comment on column public.store_settings.delivery_cost is
  'What one delivery costs The IDEA (IQD), for the price check.';
comment on column public.store_settings.min_margin_rate is
  'The margin every price must leave after cost, the payment fee, a delivery and the largest giveaway, in percent.';

-- ── Plus plans ─────────────────────────────────────────────────────────────

alter table public.plans
  add column bulb_rate numeric(4, 2) check (bulb_rate >= 0 and bulb_rate <= 50),
  add column free_delivery boolean not null default false;

comment on column public.plans.bulb_rate is
  'Bulbs cashback in percent for members on this Plus plan; null for the store rate.';
comment on column public.plans.free_delivery is
  'Members on this plan get free delivery in zones with plus_free_delivery.';

insert into public.plans (
  id, name, description, amount, currency, billing_interval, audience,
  rental_slots, tier, bulb_rate, free_delivery, features_ar, features_en, position, active
)
values
  ('plus-glow', 'Plus Glow', '1 item at a time', 14750, 'IQD', 'month', 'plus', 1, 1, 4, false,
    '{"غرض واحد في كل مرة","استبدال غير محدود في نقاط الاستلام","4% Bulbs على مشترياتك"}',
    '{"1 item at a time","Unlimited swaps at pickup points","4% Bulbs back on purchases"}', 1, false),
  ('plus-shine', 'Plus Shine', '2 items at a time', 22750, 'IQD', 'month', 'plus', 2, 2, 5, true,
    '{"غرضان في كل مرة","توصيل مجاني لطلبات المتجر في بغداد","الإصدارات الجديدة في أول 30 يومًا","5% Bulbs على مشترياتك"}',
    '{"2 items at a time","Free Store delivery in Baghdad","New releases in their first 30 days","5% Bulbs back on purchases"}', 2, false),
  ('plus-blaze', 'Plus Blaze', '4 items at a time', 39750, 'IQD', 'month', 'plus', 4, 3, 6, true,
    '{"أربعة أغراض في كل مرة","كل ما في Shine","6% Bulbs على مشترياتك"}',
    '{"4 items at a time","Everything in Shine","6% Bulbs back on purchases"}', 3, false)
on conflict (id) do nothing;

-- The member's live Plus plan (the highest tier), if any.
create function private.member_plan(member uuid)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = member
    and s.status in ('active', 'past_due')
    and p.audience = 'plus'
    and (s.current_period_end is null or s.current_period_end > now())
  order by p.tier desc nulls last, p.amount desc
  limit 1;
$$;

-- ── Flat Bulbs ─────────────────────────────────────────────────────────────

alter table public.products
  add column bulb_multiplier numeric(3, 2) check (bulb_multiplier >= 0 and bulb_multiplier <= 5);

comment on column public.products.bulb_multiplier is
  'Multiplies the Bulbs rate on this product (0.5 for consoles); null for its category''s.';

update public.products p
set bulb_multiplier = 0.5
from public.product_categories c
where c.id = p.category_id
  and c.slug = 'gaming'
  and (p.slug like '%console%' or p.name_en ~* '\m(playstation 5|ps5|nintendo switch|xbox series)\M(?!.*\m(game|edition)\M)')
  and p.price >= 200000;

-- The member's cashback rate in percent: their Plus plan's, else the store's.
create or replace function private.bulb_rate(member uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.bulb_rate from private.member_plan(member) p),
    (select s.bulb_rate from public.store_settings s limit 1),
    0
  );
$$;

-- What a line counts for in cashback, as a multiple of its price: the
-- product's or category's multiplier, at most half above `bulb_half_from`.
create function private.bulb_multiplier(product uuid, unit_price bigint)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when unit_price > (select s.bulb_half_from from public.store_settings s limit 1)
      then least(m.value, 0.5)
    else m.value
  end
  from (
    select coalesce(p.bulb_multiplier, c.bulb_multiplier, 1) as value
    from (select product as id) x
    left join public.products p on p.id = x.id
    left join public.product_categories c on c.id = p.category_id
  ) m;
$$;

-- The return window as an interval.
create function private.return_window()
returns interval
language sql
stable
security definer
set search_path = ''
as $$
  select make_interval(days => coalesce((select s.return_days from public.store_settings s limit 1), 14)::integer);
$$;

-- The tiers go: balances keep everything earned.
drop function public.telegram_join_check(bigint, bigint);
drop function public.my_bulbs();
drop function private.my_bulbs();
drop function public.member_bulbs(uuid);
drop function private.member_bulbs(uuid);
drop function public.set_bulb_rates(numeric, jsonb);
drop function private.set_bulb_rates(numeric, jsonb);
drop function private.bulb_tier_for(bigint);
drop function private.bulb_spend(uuid);
drop table public.bulb_tiers;

alter table public.telegram_chats
  drop constraint telegram_chats_join_tier,
  drop constraint telegram_chats_join_rule_check;
update public.telegram_chats set join_rule = 'plus' where join_rule = 'tier';
alter table public.telegram_chats
  drop column join_tier,
  add constraint telegram_chats_join_rule_check
    check (join_rule in ('open', 'pass', 'plus'));

drop type public.bulb_tier;

comment on column public.telegram_chats.join_rule is
  'Who Droid lets in on a join request: open, pass (linked The IDEA Pass) or plus (and a live Plus membership).';

-- Whether a Telegram account may join a chat (service only): the chat's
-- rule and whether the account is linked.
create function public.telegram_join_check(chat bigint, member bigint)
returns table (allowed boolean, rule text, linked boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room public.telegram_chats;
  owner uuid;
begin
  select * into room from public.telegram_chats c where c.id = chat;
  if room.id is null then
    return;
  end if;
  select m.user_id into owner from public.telegram_members m where m.id = member;
  if owner is not null and exists (
    select 1 from public.profiles p where p.id = owner and p.banned_at is not null
  ) then
    owner := null;
  end if;
  return query select
    case room.join_rule
      when 'open' then true
      when 'pass' then owner is not null
      else owner is not null and private.plus_rental_slots(owner) > 0
    end,
    room.join_rule,
    owner is not null;
end;
$$;

-- The caller's Bulbs and cashback rate.
create function private.my_bulbs()
returns table (available bigint, pending bigint, rate numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  return query
  select b.available, b.pending, private.bulb_rate(caller)
  from private.bulb_balance(caller) b;
end;
$$;

create function public.my_bulbs()
returns table (available bigint, pending bigint, rate numeric)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_bulbs() $$;

comment on function public.my_bulbs() is
  'The caller''s usable and pending Bulbs and cashback rate.';

-- A member's Bulbs and rate, for support and finance in the back office.
create function private.member_bulbs(member uuid)
returns table (available bigint, pending bigint, rate numeric)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support,finance}') then
    raise exception 'Support and finance only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select b.available, b.pending, private.bulb_rate(member)
  from private.bulb_balance(member) b;
end;
$$;

create function public.member_bulbs(member uuid)
returns table (available bigint, pending bigint, rate numeric)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.member_bulbs($1) $$;

-- Finance sets the money rules and the categories' Bulbs multipliers
-- ({category id: multiplier}). Rules not given stay as they are.
create function private.set_money_rules(rules jsonb, multipliers jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(rules, '{}')) <> 'object'
    or jsonb_typeof(coalesce(multipliers, '{}')) <> 'object'
  then
    raise exception 'Rules and multipliers must be objects' using errcode = 'invalid_parameter_value';
  end if;
  update public.store_settings s set
    bulb_rate = coalesce((rules ->> 'bulb_rate')::numeric, s.bulb_rate),
    bulb_half_from = coalesce((rules ->> 'bulb_half_from')::bigint, s.bulb_half_from),
    return_days = coalesce((rules ->> 'return_days')::smallint, s.return_days),
    max_giveaway_rate = coalesce((rules ->> 'max_giveaway_rate')::numeric, s.max_giveaway_rate),
    cash_limit = case
      when rules ? 'cash_limit' then (rules ->> 'cash_limit')::bigint
      else s.cash_limit
    end,
    payment_fee_rate = coalesce((rules ->> 'payment_fee_rate')::numeric, s.payment_fee_rate),
    delivery_cost = coalesce((rules ->> 'delivery_cost')::bigint, s.delivery_cost),
    min_margin_rate = coalesce((rules ->> 'min_margin_rate')::numeric, s.min_margin_rate);
  update public.product_categories c
  set bulb_multiplier = (m.value #>> '{}')::numeric
  from jsonb_each(coalesce(multipliers, '{}')) m
  where c.id::text = m.key;
end;
$$;

create function public.set_money_rules(rules jsonb, multipliers jsonb default '{}')
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.set_money_rules($1, $2) $$;

-- ── Free delivery by zone ──────────────────────────────────────────────────

alter table public.delivery_zones
  add column free_from bigint check (free_from >= 0),
  add column plus_free_delivery boolean not null default false;

comment on column public.delivery_zones.free_from is
  'Subtotal (IQD) from which delivery to this zone is free for everyone; null for never.';
comment on column public.delivery_zones.plus_free_delivery is
  'Plus plans with free_delivery deliver free to this zone on any order.';

update public.delivery_zones
set free_from = 150000, plus_free_delivery = true
where governorate = 'baghdad';

-- ── Pricing a checkout ─────────────────────────────────────────────────────

alter table public.orders
  add column max_bulbs integer check (max_bulbs >= 0);

comment on column public.orders.max_bulbs is
  'The most cashback the order may earn, in Bulbs, under the giveaway cap; null for no cap (older orders).';

-- Prices the member's cart for a checkout: the lines (from the copies they
-- get), delivery (the zone's fee, free from its threshold or with the
-- member's plan), the one discount (invite or affiliate, the larger),
-- capped so the order gives away at most `max_giveaway_rate` of its
-- subtotal, the Bulbs spent, and the cashback it may earn. Raises like
-- `create_order()` for an empty cart, an unavailable item, missing stock,
-- an unknown zone, a switched-off option or missing Bulbs. The caller locks
-- the products when it means to order.
create function private.price_checkout(
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
  pickup boolean := price_checkout.fulfilment = 'pickup';
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  subtotal bigint := 0;
  cashback_base numeric := 0;
  commission_base numeric := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  promo bigint := 0;
  source text;
  affiliate uuid;
  follower bigint;
  commission bigint := 0;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
begin
  select * into settings from public.store_settings;

  if pickup then
    if not settings.pickup_enabled
      or coalesce(nullif(trim(settings.pickup_address_ar), ''), nullif(trim(settings.pickup_address_en), '')) is null
    then
      raise exception 'Store pickup is not available' using errcode = 'check_violation';
    end if;
  else
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
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes,
      coalesce(cat.affiliate_rate, 3) as affiliate_rate
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.product_categories cat on cat.id = p.category_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = member
    order by c.created_at, c.product_id
  loop
    if line.status <> 'active' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    subtotal := subtotal + line_price * line.quantity;
    cashback_base := cashback_base
      + line_price * line.quantity * private.bulb_multiplier(line.product_id, line_price);
    commission_base := commission_base + line_price * line.quantity * line.affiliate_rate;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  if cash and not pickup and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Pickup is free; delivery costs the zone's fee, free from the zone's
  -- threshold for everyone or on any order with the member's plan.
  if not pickup then
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

  -- An affiliate's link or code (the last one in 30 days) takes 5% off.
  -- One discount per order: the larger wins, the invite on a tie.
  affiliate := private.order_affiliate(member);
  if affiliate is not null then
    follower := floor(subtotal * 0.05)::bigint;
    if follower > promo then
      promo := follower;
      source := 'affiliate';
      -- What the affiliate will earn on delivery, at most.
      commission := floor(commission_base / 100)::bigint;
    else
      affiliate := null;
    end if;
  end if;

  -- The giveaway cap: delivery waived and the affiliate's commission come
  -- first, then the discount, then the cashback.
  cap := floor(subtotal * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived - commission));
  if promo = 0 then
    source := null;
    affiliate := null;
    commission := 0;
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
  max_bulbs := (greatest(0, cap - waived - commission - promo) / 100)::integer;
  -- Cashback on what's paid in money, at the member's rate (1 Bulb = 100 IQD).
  earn := least(
    floor(
      cashback_base
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
    'free_from', case when pickup then null else zone.free_from end,
    'discount', promo,
    'discount_source', source,
    'affiliate_id', affiliate,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs * 100,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$$;

-- What the caller's checkout would come to, for the checkout page.
create function private.checkout_quote(
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0,
  governorate text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  return private.price_checkout(
    caller, governorate, fulfilment, payment_method, delivery_zone, use_bulbs
  ) - 'lines' - 'affiliate_id' - 'zone_governorate' - 'zone_name_en';
end;
$$;

create function public.checkout_quote(
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0,
  governorate text default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.checkout_quote($1, $2, $3, $4, $5) $$;

comment on function public.checkout_quote(public.order_fulfilment, public.order_payment_method, uuid, integer, text) is
  'The caller''s checkout priced as create_order() will: subtotal, delivery, discount, Bulbs spent, total and the cashback it may earn.';

-- Turns the caller's cart into an order, priced by `price_checkout()`.
create or replace function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_order.fulfilment = 'pickup';
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  if create_order.fulfilment is null or create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or (
      not pickup
      and (
        coalesce(trim(shipping ->> 'address'), '') = ''
        -- Without a chosen zone, the governorate finds it.
        or (wanted = '' and delivery_zone is null)
      )
    )
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock, and
  -- the member's Bulbs so concurrent checkouts wait for each other.
  perform 1 from public.products p
  where p.id in (select c.product_id from public.cart_items c where c.user_id = caller)
  order by p.id
  for update;
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
  end if;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source, affiliate_id,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'affiliate_id')::uuid,
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case
        when pickup then ''
        -- A zone that isn't a whole governorate is named instead.
        else coalesce(
          quote ->> 'zone_governorate',
          nullif(left(trim(shipping ->> 'governorate'), 60), ''),
          quote ->> 'zone_name_en'
        )
      end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.condition, l.name_ar, l.name_en,
    l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    condition public.product_condition,
    quantity integer,
    unit_price bigint,
    name_ar text,
    name_en text,
    attributes jsonb
  );

  delete from public.cart_items where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- Paid in full with Bulbs: nothing to pay online, so it's paid now.
  if not cash and created.total = 0 then
    perform public.complete_order_payment(created.id);
    select * into created from public.orders o where o.id = created.id;
  end if;

  -- A cash order is confirmed now: its copies are set aside and the
  -- customer is told (online orders wait for the payment webhook).
  if cash then
    perform private.take_order_stock(created.id);
    perform private.notify(
      caller,
      'order',
      'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;

  return created;
end;
$$;

-- ── Earning, after the return window ───────────────────────────────────────

-- Cashback only on what was paid in money: the items' value (each at its
-- Bulbs multiplier) scaled by the share of the order not paid with Bulbs,
-- at most the order's `max_bulbs`. Pending for the return window.
create or replace function private.earn_order_bulbs(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  paid_share numeric;
  cap integer;
  pct numeric;
  earned integer;
  usable_at timestamptz := now() + private.return_window();
begin
  select o.user_id,
    case when o.subtotal + o.shipping_fee > 0
      then o.total::numeric / (o.subtotal + o.shipping_fee)
      else 0
    end,
    o.max_bulbs
  into member, paid_share, cap
  from public.orders o where o.id = target;
  if member is null then
    return;
  end if;

  pct := private.bulb_rate(member);
  -- 1 Bulb = 100 IQD: IQD × rate% ÷ 100 ÷ 100.
  select floor(
    coalesce(sum(i.unit_price * i.quantity * private.bulb_multiplier(i.product_id, i.unit_price)), 0)
    * paid_share * pct / 10000
  )::integer
  into earned
  from public.order_items i
  where i.order_id = target;

  earned := least(earned, coalesce(cap, earned));

  if earned > 0 then
    insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id)
    values (member, earned, 'purchase', 'pending', usable_at, target)
    on conflict do nothing;
  end if;

  insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id, reason)
  values (member, 20, 'bonus', 'pending', usable_at, target, 'first_order')
  on conflict do nothing;
end;
$$;

-- When an invited member's first order is delivered, the inviter earns 50
-- Bulbs (pending for the return window), up to 20 a month, unless the
-- order shares a phone number or address with the inviter's own orders.
create or replace function private.reward_invite(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivered public.orders;
  invite public.referrals;
  shared boolean;
begin
  select * into delivered from public.orders o where o.id = target;
  select * into invite from public.referrals r
  where r.invitee_id = delivered.user_id and r.status = 'pending'
  for update;
  if invite.invitee_id is null then
    return;
  end if;

  select exists (
    select 1 from public.orders o
    where o.user_id = invite.inviter_id
      and (
        nullif(o.shipping_address ->> 'phone', '') = delivered.shipping_address ->> 'phone'
        or (
          nullif(trim(o.shipping_address ->> 'address'), '') is not null
          and lower(trim(o.shipping_address ->> 'address')) = lower(trim(delivered.shipping_address ->> 'address'))
        )
      )
  ) or exists (
    select 1 from auth.users u
    where u.id = invite.inviter_id
      and u.phone is not null
      and '+' || u.phone = delivered.shipping_address ->> 'phone'
  )
  into shared;

  if shared or (
    select count(*) from public.referrals r
    where r.inviter_id = invite.inviter_id and r.status = 'rewarded'
      and r.rewarded_at >= date_trunc('month', now())
  ) >= 20 then
    update public.referrals set status = 'void', order_id = target
    where invitee_id = invite.invitee_id;
    return;
  end if;

  insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id, reason)
  values (invite.inviter_id, 50, 'bonus', 'pending', now() + private.return_window(), target, 'invite')
  on conflict do nothing;

  update public.referrals
  set status = 'rewarded', order_id = target, rewarded_at = now()
  where invitee_id = invite.invitee_id;
end;
$$;

-- A delivered order earns its affiliate the category rate on the price after
-- the follower's discount, ready after the return window. Nothing when the
-- order shares a phone number or address with the affiliate.
create or replace function private.earn_affiliate_commission(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivered public.orders;
  earned bigint;
begin
  select * into delivered from public.orders o where o.id = target;
  if delivered.affiliate_id is null or delivered.subtotal = 0
    or private.order_shares_contact(target, delivered.affiliate_id)
  then
    return;
  end if;

  select floor(
    coalesce(sum(i.unit_price * i.quantity * coalesce(c.affiliate_rate, 3)), 0)
    * (delivered.subtotal - delivered.discount) / delivered.subtotal / 100
  )::bigint
  into earned
  from public.order_items i
  left join public.products p on p.id = i.product_id
  left join public.product_categories c on c.id = p.category_id
  where i.order_id = target;

  if earned > 0 then
    insert into public.affiliate_commissions (affiliate_id, kind, amount, available_at, order_id)
    values (delivered.affiliate_id, 'order', earned, now() + private.return_window(), target)
    on conflict do nothing;
  end if;
end;
$$;

-- A paid Plus membership earns its affiliate 20% of the first 3 monthly
-- payments (or a quarter of 20% of the first yearly one), within the first
-- 3 months of the member's first membership; refunds claw it back.
create or replace function private.on_payment_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions;
  plan public.plans;
  paid_before integer;
  earned bigint;
begin
  if new.subscription_id is null then
    return null;
  end if;

  if new.status = 'refunded' and tg_op = 'UPDATE' and old.status is distinct from 'refunded' then
    perform private.claw_back_commission(null, new.id);
    return null;
  end if;
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return null;
  end if;

  select * into sub from public.subscriptions s where s.id = new.subscription_id for update;
  select * into plan from public.plans p where p.id = sub.plan_id;
  if sub.user_id is null or plan.audience is distinct from 'plus' then
    return null;
  end if;

  -- Payments of this membership paid before this one.
  select count(*) into paid_before from public.payments p
  where p.subscription_id = sub.id and p.status in ('paid', 'refunded') and p.id <> new.id
    and (coalesce(p.paid_at, p.created_at), p.id) < (coalesce(new.paid_at, new.created_at), new.id);

  -- Attribute within the first 3 months of the member's first Plus membership.
  if sub.affiliate_id is null and paid_before < 3 and not exists (
    select 1 from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.payments pay on pay.subscription_id = s.id
    where s.user_id = sub.user_id and s.id <> sub.id
      and p.audience = 'plus' and pay.status in ('paid', 'refunded')
  ) then
    sub.affiliate_id := private.order_affiliate(sub.user_id);
    if sub.affiliate_id is not null then
      update public.subscriptions set affiliate_id = sub.affiliate_id where id = sub.id;
    end if;
  end if;

  if sub.affiliate_id is null then
    return null;
  end if;

  earned := case
    when plan.billing_interval = 'month' and paid_before < 3 then floor(new.amount * 0.20)
    when plan.billing_interval = 'year' and paid_before = 0 then floor(new.amount * 0.20 / 4)
    else 0
  end;
  if earned > 0 then
    insert into public.affiliate_commissions (affiliate_id, kind, amount, available_at, payment_id)
    values (sub.affiliate_id, 'plus', earned, now() + private.return_window(), new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

-- ── The price check ────────────────────────────────────────────────────────

-- Copies for sale that have no cost, or whose price leaves less than
-- `min_margin_rate` after the cost, the payment fee, a delivery and the
-- largest giveaway (`max_giveaway_rate`). For admins and finance.
create function private.price_check(max_rows integer default 500)
returns table (
  stock_item_id uuid,
  product_id uuid,
  product_slug text,
  name_ar text,
  name_en text,
  variant_label text,
  condition public.product_condition,
  price bigint,
  cost bigint,
  margin bigint,
  floor_amount bigint,
  problem text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  settings public.store_settings;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Admins and finance only' using errcode = 'insufficient_privilege';
  end if;
  select * into settings from public.store_settings;
  return query
  select * from (
    select
      s.id,
      p.id,
      p.slug,
      p.name_ar,
      p.name_en,
      coalesce(v.label_en, v.sku),
      s.condition,
      coalesce(s.price, v.price) as sale_price,
      s.cost,
      case when s.cost is null then null else
        coalesce(s.price, v.price) - s.cost
        - ceil(coalesce(s.price, v.price) * settings.payment_fee_rate / 100)::bigint
        - settings.delivery_cost
        - floor(coalesce(s.price, v.price) * settings.max_giveaway_rate / 100)::bigint
      end as left_over,
      ceil(coalesce(s.price, v.price) * settings.min_margin_rate / 100)::bigint as needed,
      case when s.cost is null then 'no_cost' else 'below_floor' end
    from public.stock_items s
    join public.products p on p.id = s.product_id
    join public.product_variants v on v.id = s.variant_id
    where s.purpose = 'sale' and s.status = 'available'
  ) x
  where x.left_over is null or x.left_over < x.needed
  order by (x.left_over is null), x.left_over - x.needed, x.name_en
  limit greatest(1, least(max_rows, 2000));
end;
$$;

create function public.price_check(max_rows integer default 500)
returns table (
  stock_item_id uuid,
  product_id uuid,
  product_slug text,
  name_ar text,
  name_en text,
  variant_label text,
  condition public.product_condition,
  price bigint,
  cost bigint,
  margin bigint,
  floor_amount bigint,
  problem text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.price_check($1) $$;

comment on function public.price_check(integer) is
  'Copies for sale with no cost or a price below the margin floor, worst first (admins and finance).';

-- ── Grants ─────────────────────────────────────────────────────────────────

grant update (free_from, plus_free_delivery) on public.delivery_zones to authenticated;

revoke all on function private.member_plan(uuid) from public, anon, authenticated;
revoke all on function private.bulb_multiplier(uuid, bigint) from public, anon, authenticated;
revoke all on function private.return_window() from public, anon, authenticated;
revoke all on function private.price_checkout(uuid, text, public.order_fulfilment, public.order_payment_method, uuid, integer)
  from public, anon, authenticated;

revoke all on function private.my_bulbs() from public, anon;
grant execute on function private.my_bulbs() to authenticated, service_role;
revoke all on function public.my_bulbs() from public, anon;
grant execute on function public.my_bulbs() to authenticated, service_role;

revoke all on function private.member_bulbs(uuid) from public, anon;
grant execute on function private.member_bulbs(uuid) to authenticated, service_role;
revoke all on function public.member_bulbs(uuid) from public, anon;
grant execute on function public.member_bulbs(uuid) to authenticated, service_role;

revoke all on function private.set_money_rules(jsonb, jsonb) from public, anon;
grant execute on function private.set_money_rules(jsonb, jsonb) to authenticated, service_role;
revoke all on function public.set_money_rules(jsonb, jsonb) from public, anon;
grant execute on function public.set_money_rules(jsonb, jsonb) to authenticated, service_role;

revoke all on function private.checkout_quote(public.order_fulfilment, public.order_payment_method, uuid, integer, text)
  from public, anon;
grant execute on function private.checkout_quote(public.order_fulfilment, public.order_payment_method, uuid, integer, text)
  to authenticated, service_role;
revoke all on function public.checkout_quote(public.order_fulfilment, public.order_payment_method, uuid, integer, text)
  from public, anon;
grant execute on function public.checkout_quote(public.order_fulfilment, public.order_payment_method, uuid, integer, text)
  to authenticated, service_role;

revoke all on function private.price_check(integer) from public, anon;
grant execute on function private.price_check(integer) to authenticated, service_role;
revoke all on function public.price_check(integer) from public, anon;
grant execute on function public.price_check(integer) to authenticated, service_role;

revoke all on function public.telegram_join_check(bigint, bigint) from public, anon, authenticated;
grant execute on function public.telegram_join_check(bigint, bigint) to service_role;
