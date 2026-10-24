-- Delivery zones, store pickup and cash payments for the Megastore.
--
-- * `delivery_zones`: one row per area The IDEA delivers to (seeded with
--   Iraq's governorates), each with its own fee in IQD and delivery time.
--   Everyone can read them; admins edit them in the back office.
-- * Orders say how they reach the customer (`fulfilment`: delivery or
--   pickup) and how they are paid (`payment_method`: online through Wayl,
--   or cash on delivery / at pickup). Pickup has no fee; the free-delivery
--   threshold still applies to delivery.
-- * `create_order()` takes the fulfilment, payment method and zone and
--   prices the fee itself from the zone; the client never sends a fee.
--   Online orders start `pending` (awaiting Wayl) as before. Cash orders
--   start `confirmed`: their stock is taken at once, and staff record the
--   cash with `mark_cash_collected()` when the courier (or the counter)
--   hands it in, which marks the order paid and delivered, records a cash
--   payment for finance and writes the audit log.
-- * The store's pickup address and opening hours (Arabic and English) live
--   in `store_settings`, with switches for pickup and cash payments.
--
-- The `confirmed` status comes from 20261120000150_order_confirmed.sql. It
-- is only used inside PL/pgSQL bodies here, which are resolved when they
-- run, never while this migration's transaction is open.

create type public.order_fulfilment as enum ('delivery', 'pickup');
create type public.order_payment_method as enum ('online', 'cash_on_delivery');

-- ── Delivery zones ──────────────────────────────────────────────────────────

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  -- The governorate id the checkout stores on the address ("baghdad"); null
  -- for a zone that isn't a whole governorate.
  governorate text unique
    check (governorate ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(governorate) <= 64),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  name_en text not null check (char_length(name_en) between 1 and 120),
  -- Delivery fee in IQD (whole dinars).
  fee bigint not null check (fee >= 0),
  -- Estimated delivery time in days, shown at checkout.
  min_days integer not null default 1 check (min_days between 0 and 60),
  max_days integer not null default 3 check (max_days between 0 and 60),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_zones_days check (max_days >= min_days)
);

create index delivery_zones_position_idx on public.delivery_zones (position);

create trigger set_updated_at before update on public.delivery_zones
  for each row execute function private.set_updated_at();

-- Baghdad, then the other governorates (Kurdistan Region included). The
-- ids match `governorates` in @repo/commerce.
insert into public.delivery_zones (governorate, name_ar, name_en, fee, min_days, max_days, position) values
  ('baghdad', 'بغداد', 'Baghdad', 5000, 1, 2, 0),
  ('basra', 'البصرة', 'Basra', 8000, 2, 3, 10),
  ('nineveh', 'نينوى', 'Nineveh', 8000, 2, 4, 20),
  ('erbil', 'أربيل', 'Erbil', 10000, 2, 4, 30),
  ('sulaymaniyah', 'السليمانية', 'Sulaymaniyah', 10000, 2, 4, 40),
  ('duhok', 'دهوك', 'Duhok', 10000, 3, 5, 50),
  ('halabja', 'حلبجة', 'Halabja', 10000, 3, 5, 60),
  ('kirkuk', 'كركوك', 'Kirkuk', 8000, 2, 3, 70),
  ('anbar', 'الأنبار', 'Anbar', 8000, 2, 4, 80),
  ('babylon', 'بابل', 'Babylon', 7000, 1, 3, 90),
  ('karbala', 'كربلاء', 'Karbala', 7000, 1, 3, 100),
  ('najaf', 'النجف', 'Najaf', 7000, 1, 3, 110),
  ('wasit', 'واسط', 'Wasit', 7000, 1, 3, 120),
  ('diyala', 'ديالى', 'Diyala', 7000, 1, 3, 130),
  ('saladin', 'صلاح الدين', 'Saladin', 8000, 2, 3, 140),
  ('dhi-qar', 'ذي قار', 'Dhi Qar', 8000, 2, 4, 150),
  ('maysan', 'ميسان', 'Maysan', 8000, 2, 4, 160),
  ('muthanna', 'المثنى', 'Muthanna', 8000, 2, 4, 170),
  ('qadisiyah', 'القادسية', 'Al-Qadisiyah', 7000, 2, 3, 180)
on conflict (governorate) do nothing;

-- ── Store settings: pickup and cash ─────────────────────────────────────────

alter table public.store_settings
  -- Pickup is offered once it is switched on and has an address.
  add column pickup_enabled boolean not null default false,
  add column pickup_address_ar text check (char_length(pickup_address_ar) <= 500),
  add column pickup_address_en text check (char_length(pickup_address_en) <= 500),
  add column pickup_hours_ar text check (char_length(pickup_hours_ar) <= 200),
  add column pickup_hours_en text check (char_length(pickup_hours_en) <= 200),
  add column cash_on_delivery_enabled boolean not null default true;

comment on column public.store_settings.shipping_fee is
  'Delivery fee shown in the cart before a delivery zone is chosen; orders use the zone''s fee.';

-- ── Orders ──────────────────────────────────────────────────────────────────

alter table public.orders
  add column fulfilment public.order_fulfilment not null default 'delivery',
  add column payment_method public.order_payment_method not null default 'online',
  add column delivery_zone_id uuid references public.delivery_zones (id) on delete set null,
  -- Who recorded the cash for a cash order (paid_at says when).
  add column cash_collected_by uuid references auth.users (id) on delete set null,
  -- Set once the cash order's confirmation email went out (apps/api).
  add column confirmation_emailed_at timestamptz,
  add constraint orders_pickup_is_free check (fulfilment <> 'pickup' or shipping_fee = 0);

create index orders_delivery_zone_id_idx on public.orders (delivery_zone_id);
create index orders_cash_collected_by_idx on public.orders (cash_collected_by);

-- ── Stock ───────────────────────────────────────────────────────────────────

-- Takes an order's items out of stock (online orders when paid, cash orders
-- when placed).
create function private.take_order_stock(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.product_variants v
  set stock_count = greatest(v.stock_count - i.quantity, 0)
  from public.order_items i
  where i.order_id = target and i.variant_id = v.id;

  update public.products p
  set stock_count = greatest(p.stock_count - i.quantity, 0)
  from public.order_items i
  where i.order_id = target and i.variant_id is null and i.product_id = p.id;
$$;

-- Puts a cancelled cash order's items back in stock.
create function private.return_order_stock(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.product_variants v
  set stock_count = v.stock_count + i.quantity
  from public.order_items i
  where i.order_id = target and i.variant_id = v.id;

  update public.products p
  set stock_count = p.stock_count + i.quantity
  from public.order_items i
  where i.order_id = target and i.variant_id is null and i.product_id = p.id;
$$;

-- ── create_order ────────────────────────────────────────────────────────────

-- The one-argument version is replaced by one whose new arguments have
-- defaults, so `create_order(shipping)` still places an online delivery
-- order (its zone found from the address's governorate).
drop function public.create_order(jsonb);
drop function private.create_order(jsonb);

-- Turns the caller's cart into an order, priced from the catalog and the
-- delivery zone. Raises if the cart is empty, an item is unavailable or out
-- of stock, the zone doesn't exist or the chosen option is switched off.
create function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null
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
  order_subtotal bigint := 0;
  fee bigint := 0;
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

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.cart_items where user_id = caller) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock.
  for line in
    select
      c.quantity,
      p.status,
      p.kind,
      coalesce(v.price_override, p.price) as unit_price,
      case when v.id is null then p.stock_count else v.stock_count end as stock
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = caller
    for update of p
  loop
    if line.status <> 'active' or line.kind <> 'sale' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;
    if line.quantity > line.stock then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;
    order_subtotal := order_subtotal + line.unit_price * line.quantity;
  end loop;

  -- Pickup is free; delivery costs the zone's fee unless the subtotal
  -- reaches the free-delivery threshold.
  fee := case
    when pickup then 0
    when settings.free_shipping_threshold is not null
      and order_subtotal >= settings.free_shipping_threshold then 0
    else zone.fee
  end;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, shipping_address,
    fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    order_subtotal,
    fee,
    order_subtotal + fee,
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
    order_id, product_id, variant_id, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id,
    p.id,
    v.id,
    p.name_ar,
    p.name_en,
    coalesce(v.attributes, '{}'::jsonb),
    coalesce(v.price_override, p.price),
    c.quantity
  from public.cart_items c
  join public.products p on p.id = c.product_id
  left join public.product_variants v on v.id = c.variant_id
  where c.user_id = caller;

  delete from public.cart_items where user_id = caller;

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
  delivery_zone uuid default null
)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.create_order($1, $2, $3, $4) $$;

-- ── Customer cancellation ───────────────────────────────────────────────────

-- Customers cancel an order before it is paid online, or a cash order
-- before staff start preparing it. Cancelled cash orders get their stock
-- back (on_order_cancelled).
create or replace function private.cancel_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders o
  set status = 'cancelled'
  where o.id = cancel_order.order_id
    and o.user_id = (select auth.uid())
    and (
      o.status = 'pending'
      or (o.status = 'confirmed' and o.payment_method = 'cash_on_delivery')
    );

  if not found then
    raise exception 'Order not found or no longer cancellable' using errcode = 'no_data_found';
  end if;
end;
$$;

create function private.on_order_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'cancelled'
    and old.status in ('confirmed', 'processing', 'shipped')
    and new.payment_method = 'cash_on_delivery'
    and new.paid_at is null
  then
    perform private.return_order_stock(new.id);
  end if;
  return null;
end;
$$;

create trigger on_order_cancelled after update of status on public.orders
  for each row execute function private.on_order_cancelled();

-- ── Payments ────────────────────────────────────────────────────────────────

-- Marks an online order paid and takes its items out of stock. Server
-- only: called by the billing service after a verified, re-read payment.
-- Idempotent. Cash orders are paid only with mark_cash_collected().
create or replace function public.complete_order_payment(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
begin
  select * into target from public.orders o where o.id = order_id for update;

  if not found
    or target.status not in ('pending', 'cancelled')
    or target.payment_method <> 'online'
  then
    return;
  end if;

  update public.orders
  set status = 'paid', paid_at = now()
  where id = target.id;

  perform private.take_order_stock(target.id);
end;
$$;

-- Staff record the cash for a cash order once it reaches the company: the
-- order becomes paid (paid_at) and delivered, a `cash` payment is recorded
-- for finance, and the audit log names who did it. Support and finance
-- (and admins). Repeating it changes nothing.
create function private.mark_cash_collected(order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
begin
  if not private.has_staff_role('{support,finance}') then
    raise exception 'Support or finance staff only' using errcode = 'insufficient_privilege';
  end if;

  select * into target from public.orders o where o.id = mark_cash_collected.order_id for update;

  if not found then
    raise exception 'Order not found' using errcode = 'no_data_found';
  end if;
  if target.payment_method <> 'cash_on_delivery' then
    raise exception 'Not a cash order' using errcode = 'check_violation';
  end if;
  if target.paid_at is not null then
    return target;
  end if;
  if target.status not in ('confirmed', 'processing', 'shipped', 'delivered') then
    raise exception 'This order can''t be paid now' using errcode = 'check_violation';
  end if;

  update public.orders
  set paid_at = now(),
    cash_collected_by = (select auth.uid()),
    status = 'delivered'
  where id = target.id
  returning * into target;

  if target.total > 0 then
    insert into public.payments (
      user_id, order_id, reference_id, provider, amount, currency, status,
      description, payment_method, paid_at
    )
    values (
      target.user_id, target.id, 'cash_' || target.number, 'cash', target.total,
      target.currency, 'paid', 'Order #' || target.number || ' (cash)', 'cash', target.paid_at
    )
    on conflict (reference_id) do nothing;
  end if;

  insert into public.audit_logs (action, entity_type, entity_id, metadata)
  values (
    'cash_collected',
    'orders',
    target.id::text,
    jsonb_build_object('number', target.number, 'amount', target.total)
  );

  return target;
end;
$$;

create function public.mark_cash_collected(order_id uuid)
returns public.orders
language sql volatile
security invoker
set search_path = ''
as $$ select * from private.mark_cash_collected($1) $$;

-- ── Status rules ────────────────────────────────────────────────────────────

-- Staff move orders forward through fulfilment. Online orders are paid only
-- by the payment webhook (service role); cash orders start confirmed, can be
-- prepared and shipped before the cash is in, and can be cancelled until
-- then (for example when the customer refuses the parcel).
create or replace function private.guard_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    -- Direct updates by signed-in users; RPCs and server code run as other roles.
    and current_user = 'authenticated'
    and not (
      (old.status = 'pending' and new.status = 'cancelled')
      or (old.status = 'paid' and new.status in ('processing', 'shipped'))
      or (old.status = 'confirmed' and new.status in ('processing', 'shipped', 'cancelled'))
      or (old.status = 'processing' and new.status = 'shipped')
      or (old.status = 'shipped' and new.status = 'delivered')
      or (
        old.status in ('processing', 'shipped')
        and new.status = 'cancelled'
        and old.payment_method = 'cash_on_delivery'
        and old.paid_at is null
      )
    )
  then
    raise exception 'Order status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Pickup orders that are "shipped" are ready at the store.
create or replace function private.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending' then
    perform private.notify(
      new.user_id,
      'order',
      case
        when new.fulfilment = 'pickup' and new.status = 'shipped' then 'order_ready_for_pickup'
        else 'order_' || new.status::text
      end,
      jsonb_build_object('number', new.number, 'tracking', new.tracking_number),
      '/orders/view?id=' || new.id
    );
  end if;
  return null;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.delivery_zones enable row level security;

create policy "Delivery zones are public"
  on public.delivery_zones for select to anon, authenticated
  using (true);

create policy "Admins add delivery zones"
  on public.delivery_zones for insert to authenticated
  with check ((select private.has_staff_role('{admin}')));

create policy "Admins edit delivery zones"
  on public.delivery_zones for update to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));

create policy "Admins remove delivery zones"
  on public.delivery_zones for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

create trigger audit_delivery_zones after insert or update or delete on public.delivery_zones
  for each row execute function private.audit_change();

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.delivery_zones from anon, authenticated;
grant select on public.delivery_zones to anon, authenticated;
grant insert, update, delete on public.delivery_zones to authenticated;
grant all on public.delivery_zones to service_role;

grant update (
  pickup_enabled, pickup_address_ar, pickup_address_en, pickup_hours_ar,
  pickup_hours_en, cash_on_delivery_enabled
) on public.store_settings to authenticated;

revoke all on function private.take_order_stock(uuid) from public, anon, authenticated;
revoke all on function private.return_order_stock(uuid) from public, anon, authenticated;
revoke all on function private.on_order_cancelled() from public, anon, authenticated;

revoke all on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid)
  from public, anon;
grant execute on function private.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid)
  to authenticated, service_role;
revoke all on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.create_order(jsonb, public.order_fulfilment, public.order_payment_method, uuid)
  to authenticated, service_role;

revoke all on function private.mark_cash_collected(uuid) from public, anon;
grant execute on function private.mark_cash_collected(uuid) to authenticated, service_role;
revoke all on function public.mark_cash_collected(uuid) from public, anon, authenticated, service_role;
grant execute on function public.mark_cash_collected(uuid) to authenticated, service_role;
