-- Prices, part 4 (owner's master brief, step 7, section 9): coupons.
--
-- * Staff (marketing and finance) make coupon codes: a share or an amount
--   off the order, with an optional most it takes off, a smallest order,
--   dates, and how many times in all and per Pass it can be used.
-- * A member applies a code to the cart (`apply_coupon`); checkout takes it
--   off when it is still valid and takes more off than an invite would.
--   The IDEA pays it: shops are paid on their full prices, and the
--   existing giveaway cap (20% of the order, delivery waived first) holds.
-- * An order placed with a coupon records it (`orders.coupon_id`), which
--   is what the uses count; the cart's code is cleared then.

create type public.coupon_kind as enum ('percent', 'amount');

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9]{4,20}$'),
  description text check (char_length(description) <= 300),
  kind public.coupon_kind not null,
  amount bigint not null check (amount > 0),
  max_discount bigint check (max_discount > 0),
  min_subtotal bigint not null default 0 check (min_subtotal >= 0),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_uses integer check (max_uses > 0),
  uses_per_member integer not null default 1 check (uses_per_member > 0),
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'percent' or amount <= 20),
  check (ends_at is null or ends_at > starts_at)
);

comment on table public.coupons is
  'Coupon codes The IDEA pays for, within the giveaway cap. Staff only; members apply them by code.';

create index coupons_created_by_idx on public.coupons (created_by);

create trigger set_updated_at before update on public.coupons
  for each row execute function private.set_updated_at();

-- The code a member has applied to their cart.
create table public.cart_coupons (
  user_id uuid primary key references auth.users (id) on delete cascade,
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  applied_at timestamptz not null default now()
);

create index cart_coupons_coupon_idx on public.cart_coupons (coupon_id);

alter table public.orders add column coupon_id uuid references public.coupons (id) on delete set null;
create index orders_coupon_idx on public.orders (coupon_id) where coupon_id is not null;

alter table public.orders drop constraint orders_discount_source_check;
alter table public.orders add constraint orders_discount_source_check
  check (discount_source in ('invite', 'coupon'));
alter table public.orders add constraint orders_coupon_discount
  check (coupon_id is null or discount_source = 'coupon');

alter table public.coupons enable row level security;
alter table public.cart_coupons enable row level security;

create policy "Staff read coupons" on public.coupons
  for select to authenticated using ((select private.has_staff_role('{marketing,finance}')));
create policy "Staff add coupons" on public.coupons
  for insert to authenticated with check ((select private.has_staff_role('{marketing,finance}')));
create policy "Staff change coupons" on public.coupons
  for update to authenticated
  using ((select private.has_staff_role('{marketing,finance}')))
  with check ((select private.has_staff_role('{marketing,finance}')));

create policy "Members see their applied code" on public.cart_coupons
  for select to authenticated using (user_id = (select auth.uid()));

grant select, insert, update on public.coupons to authenticated;
grant select on public.cart_coupons to authenticated;

-- ── Checking a code ────────────────────────────────────────────────────────

-- Why a coupon can't be used on this order now, or null when it can:
-- 'inactive', 'not_started', 'ended', 'used_up', 'used', 'below_minimum'.
create function private.coupon_problem(target uuid, member uuid, subtotal bigint)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  coupon public.coupons;
begin
  select * into coupon from public.coupons c where c.id = target;
  if coupon.id is null or not coupon.active then
    return 'inactive';
  end if;
  if coupon.starts_at > now() then
    return 'not_started';
  end if;
  if coupon.ends_at is not null and coupon.ends_at <= now() then
    return 'ended';
  end if;
  if coupon.max_uses is not null and (
    select count(*) from public.orders o
    where o.coupon_id = coupon.id and o.status <> 'cancelled'
  ) >= coupon.max_uses then
    return 'used_up';
  end if;
  if (
    select count(*) from public.orders o
    where o.coupon_id = coupon.id and o.user_id = member and o.status <> 'cancelled'
  ) >= coupon.uses_per_member then
    return 'used';
  end if;
  if subtotal is not null and subtotal < coupon.min_subtotal then
    return 'below_minimum';
  end if;
  return null;
end;
$$;

revoke all on function private.coupon_problem(uuid, uuid, bigint) from public, anon, authenticated;

-- Applies a code to the caller's cart; returns the reason it can't be
-- used, or null. Codes are matched without case or spaces.
create function private.apply_coupon(entered text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  coupon public.coupons;
  problem text;
begin
  if caller is null then
    raise exception 'Sign in first' using errcode = 'insufficient_privilege';
  end if;
  select * into coupon from public.coupons c
  where c.code = upper(regexp_replace(coalesce(entered, ''), '\s', '', 'g'));
  if coupon.id is null then
    return 'unknown';
  end if;
  problem := private.coupon_problem(coupon.id, caller, null);
  if problem is not null then
    return problem;
  end if;
  insert into public.cart_coupons as cc (user_id, coupon_id) values (caller, coupon.id)
  on conflict (user_id) do update set coupon_id = excluded.coupon_id, applied_at = now();
  return null;
end;
$$;

create function private.remove_coupon()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.cart_coupons where user_id = (select auth.uid());
$$;

create function public.apply_coupon(entered text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.apply_coupon(entered) $$;

create function public.remove_coupon()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_coupon() $$;

revoke all on function private.apply_coupon(text) from public, anon;
revoke all on function public.apply_coupon(text) from public, anon;
grant execute on function private.apply_coupon(text) to authenticated;
grant execute on function public.apply_coupon(text) to authenticated;
revoke all on function private.remove_coupon() from public, anon;
revoke all on function public.remove_coupon() from public, anon;
grant execute on function private.remove_coupon() to authenticated;
grant execute on function public.remove_coupon() to authenticated;

-- An order placed with a coupon's discount records the coupon and clears
-- the cart's code.
create function private.on_order_coupon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.discount_source = 'coupon' and new.coupon_id is null then
    select cc.coupon_id into new.coupon_id from public.cart_coupons cc where cc.user_id = new.user_id;
    delete from public.cart_coupons cc where cc.user_id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function private.on_order_coupon() from public, anon, authenticated;

create trigger record_coupon before insert on public.orders
  for each row execute function private.on_order_coupon();

-- ── Checkout: the cart's coupon ────────────────────────────────────────────

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
