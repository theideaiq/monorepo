-- Bulbs, part 2: spending Bulbs at checkout and the tiers' delivery perks.
--
-- Checkout takes `use_bulbs`: Bulbs pay up to the whole order, delivery
-- included, at 100 IQD each, from what is usable now. The order records the
-- Bulbs and the discount; a `redemption` entry takes them off the balance.
-- An order paid in full with Bulbs is paid at once (no online payment). A
-- cancelled or refunded order gives its Bulbs back (the redemption is
-- voided); cashback is earned only on what was paid in money.
--
-- Tiers can deliver free: `bulb_tiers.free_delivery_from` is the subtotal
-- from which delivery is free for the tier (null: no perk, 0: always).
-- Shine from 50,000 IQD; Beam and Blaze always. Finance edits them.

-- ── Orders ──────────────────────────────────────────────────────────────────

alter table public.orders
  add column bulbs_used integer not null default 0 check (bulbs_used >= 0),
  add column bulbs_discount bigint not null default 0,
  drop constraint orders_check,
  add constraint orders_bulbs_discount_check check (bulbs_discount = bulbs_used * 100),
  add constraint orders_total_check
    check (total = subtotal + shipping_fee - bulbs_discount and total >= 0);

comment on column public.orders.bulbs_used is
  'Bulbs spent on the order (each takes 100 IQD off the total).';

-- ── Tier delivery perks ────────────────────────────────────────────────────

alter table public.bulb_tiers
  add column free_delivery_from bigint check (free_delivery_from >= 0);

comment on column public.bulb_tiers.free_delivery_from is
  'Subtotal (IQD) from which delivery is free for the tier; null for none, 0 for always.';

update public.bulb_tiers set free_delivery_from = 50000 where tier = 'shine';
update public.bulb_tiers set free_delivery_from = 0 where tier in ('beam', 'blaze');

grant update (free_delivery_from) on public.bulb_tiers to authenticated;

-- ── Checkout ───────────────────────────────────────────────────────────────

drop function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid);
drop function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid);

-- Turns the caller's cart into an order, priced from the copies and the
-- delivery zone (free with the tier's perk), less the Bulbs spent. Raises
-- if the cart is empty, an item is unavailable or out of stock, the zone
-- doesn't exist, the chosen option is switched off or the Bulbs aren't
-- there.
create function private.create_order(
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
  settings public.store_settings;
  zone public.delivery_zones;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  order_subtotal bigint := 0;
  fee bigint := 0;
  free_from bigint;
  usable bigint;
  bulbs integer := 0;
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

  if not exists (select 1 from public.cart_items where user_id = caller) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock.
  for line in
    select
      c.product_id,
      c.variant_id,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = caller
    for update of p
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

    order_subtotal := order_subtotal + line_price * line.quantity;
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

  -- Pickup is free; delivery costs the zone's fee unless the subtotal
  -- reaches the free-delivery threshold.
  fee := case
    when pickup then 0
    when settings.free_shipping_threshold is not null
      and order_subtotal >= settings.free_shipping_threshold then 0
    else zone.fee
  end;

  -- The member's tier may deliver free: from a lower subtotal (Shine) or
  -- always (Beam and Blaze).
  select t.free_delivery_from into free_from
  from public.bulb_tiers t
  where t.tier = private.bulb_tier_for(private.bulb_spend(caller));
  if free_from is not null and order_subtotal >= free_from then
    fee := 0;
  end if;

  -- Bulbs pay up to the whole order (100 IQD each), from what's usable now.
  -- Concurrent checkouts by the same member wait for each other.
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
    select b.available into usable from private.bulb_balance(caller) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    bulbs := least(use_bulbs, ((order_subtotal + fee) / 100)::integer);
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, bulbs_used, bulbs_discount, total,
    shipping_address, fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    order_subtotal,
    fee,
    bulbs,
    bulbs * 100,
    order_subtotal + fee - bulbs * 100,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case
        when pickup then ''
        -- A zone that isn't a whole governorate is named instead.
        else coalesce(zone.governorate, nullif(left(trim(shipping ->> 'governorate'), 60), ''), zone.name_en)
      end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    create_order.fulfilment,
    create_order.payment_method,
    zone.id
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.condition, l.name_ar, l.name_en,
    l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(lines) as l (
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

  if bulbs > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -bulbs, 'redemption', created.id);
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

create function public.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0
)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_order($1, $2, $3, $4, $5) $$;

revoke all on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  from public, anon;
grant execute on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  to authenticated, service_role;
revoke all on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  from public, anon;
grant execute on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid, integer)
  to authenticated, service_role;

-- ── Earning and giving back ────────────────────────────────────────────────

-- Cashback only on what was paid in money: the items' value scaled by the
-- share of the order not paid with Bulbs.
create or replace function private.earn_order_bulbs(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  paid_share numeric;
  pct numeric;
  earned integer;
  usable_at timestamptz := now() + interval '7 days';
begin
  select o.user_id,
    case when o.subtotal + o.shipping_fee > 0
      then o.total::numeric / (o.subtotal + o.shipping_fee)
      else 0
    end
  into member, paid_share
  from public.orders o where o.id = target;
  if member is null then
    return;
  end if;

  pct := private.bulb_rate(member);
  -- 1 Bulb = 100 IQD: IQD × rate% ÷ 100 ÷ 100.
  select floor(
    coalesce(sum(i.unit_price * i.quantity * coalesce(c.bulb_multiplier, 1)), 0)
    * paid_share * pct / 10000
  )::integer
  into earned
  from public.order_items i
  left join public.products p on p.id = i.product_id
  left join public.product_categories c on c.id = p.category_id
  where i.order_id = target;

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

create or replace function private.on_order_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'delivered' then
    perform private.earn_order_bulbs(new.id);
  elsif new.status in ('cancelled', 'refunded') then
    -- The order's cashback and bonus go, and the Bulbs spent on it come back.
    update public.bulb_entries
    set status = 'void'
    where order_id = new.id
      and kind in ('purchase', 'bonus', 'redemption')
      and status <> 'void';
  end if;
  -- A cancelled order paid after all spends its Bulbs again.
  if old.status = 'cancelled' and new.status not in ('cancelled', 'refunded') then
    update public.bulb_entries
    set status = 'available'
    where order_id = new.id and kind = 'redemption' and status = 'void';
  end if;
  return null;
end;
$$;
