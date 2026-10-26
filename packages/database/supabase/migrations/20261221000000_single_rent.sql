-- Program revision v1, step 5a: single-item rent and Keep it.
--
-- * Single-item rent: anyone with The IDEA Pass rents one rentable item
--   from its product page, without The IDEA Plus. Rates are per category
--   (`rental_rates`: games 9,750 IQD for 7 days, books 3,750 for 14, films
--   2,750 for 7) with a late fee per day. `create_rental_order()` makes an
--   order of two lines, the rental and a refundable deposit (half the
--   item's value, `store_settings.rental_deposit_rate`), plus delivery or
--   free pickup, and holds a copy. The rental starts when the order is
--   delivered (or collected) and is due after the rate's days.
-- * Late fees build up per day and are settled at return
--   (`settle_rental()`): late fees and any damage come out of the deposit,
--   and the rest is owed back to the renter. After 14 days late the item is
--   kept at its used price.
-- * Keep it: a Plus member buys the copy they're renting at its used price
--   minus one month of their plan (`keep_rental()`).
-- Single-item rent and Keep it orders earn no purchase Bulbs (max_bulbs 0): the deposit isn't a purchase.

-- ── Rates ──────────────────────────────────────────────────────────────────

create table public.rental_rates (
  category_id uuid primary key references public.product_categories (id) on delete cascade,
  price bigint not null check (price > 0),
  days integer not null check (days between 1 and 60),
  late_fee bigint not null check (late_fee >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.rental_rates is
  'Single-item rent by category: the price for `days` days and the fee for each day late.';

alter table public.rental_rates enable row level security;

create policy "Rental rates are public" on public.rental_rates
  for select to anon, authenticated using (true);
create policy "Finance adds rental rates" on public.rental_rates
  for insert to authenticated
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance edits rental rates" on public.rental_rates
  for update to authenticated
  using ((select private.has_staff_role('{finance}')))
  with check ((select private.has_staff_role('{finance}')));
create policy "Finance removes rental rates" on public.rental_rates
  for delete to authenticated
  using ((select private.has_staff_role('{finance}')));

grant select on public.rental_rates to anon, authenticated;
grant insert, update, delete on public.rental_rates to authenticated;

create trigger set_updated_at before update on public.rental_rates
  for each row execute function private.set_updated_at();

insert into public.rental_rates (category_id, price, days, late_fee)
select c.id, r.price, r.days, r.late_fee
from (values ('games', 9750, 7, 1750), ('books', 3750, 14, 500), ('films', 2750, 7, 500))
  as r (slug, price, days, late_fee)
join public.product_categories c on c.slug = r.slug
on conflict (category_id) do nothing;

alter table public.store_settings
  add column rental_deposit_rate numeric(5, 2) not null default 50
    check (rental_deposit_rate between 0 and 100);

comment on column public.store_settings.rental_deposit_rate is
  'Single-item rent: the refundable deposit, in percent of the item''s price.';

-- ── Rentals and order lines ────────────────────────────────────────────────

alter type public.rental_status add value if not exists 'kept';

alter table public.rentals
  add column kind text not null default 'plus' check (kind in ('plus', 'single')),
  add column order_id uuid references public.orders (id) on delete set null,
  add column days integer check (days between 1 and 60),
  add column late_fee bigint not null default 0 check (late_fee >= 0),
  add column deposit bigint not null default 0 check (deposit >= 0),
  add column settled_at timestamptz,
  add column late_charge bigint check (late_charge >= 0),
  add column damage_charge bigint check (damage_charge >= 0),
  add column refund_due bigint check (refund_due >= 0),
  add column amount_due bigint check (amount_due >= 0);

comment on column public.rentals.kind is
  'plus: rented with The IDEA Plus; single: rented on its own, paid with an order.';
comment on column public.rentals.refund_due is
  'At settlement: what goes back to the renter from the deposit.';
comment on column public.rentals.amount_due is
  'At settlement: what the renter still owes beyond the deposit (late fees, damage, or the used price of a kept item).';

create index rentals_order_idx on public.rentals (order_id);

alter table public.order_items
  add column kind text not null default 'sale' check (kind in ('sale', 'rental', 'deposit', 'keep')),
  add column rental_id uuid references public.rentals (id) on delete set null;

comment on column public.order_items.kind is
  'sale: an item bought; rental: a single-item rent; deposit: its refundable deposit; keep: a rented copy bought (Keep it).';

create index order_items_rental_idx on public.order_items (rental_id);

-- ── Prices ─────────────────────────────────────────────────────────────────

-- The largest store price (…4,750 or …9,750) at or below `amount`.
create function private.price_step(amount numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$ select greatest(0, floor((amount - 4750) / 5000) * 5000 + 4750)::bigint $$;

-- A copy's used price: its own price when used, else 60% of new.
create function private.used_price(variant uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select min(s.price) from public.stock_items s
      where s.variant_id = variant and s.condition = 'used' and s.price is not null
    ),
    (select private.price_step(v.price * 0.6) from public.product_variants v where v.id = variant)
  );
$$;

-- What renting the product on its own costs: price, days, late fee and
-- deposit (null when it can't be rented on its own).
create function private.rental_quote(product uuid, variant uuid default null)
returns table (price bigint, days integer, late_fee bigint, deposit bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.price, r.days, r.late_fee,
    (floor(coalesce(v.price, p.price) * s.rental_deposit_rate / 100 / 250) * 250)::bigint
  from public.products p
  join public.rental_rates r on r.category_id = p.category_id
  cross join public.store_settings s
  left join public.product_variants v
    on v.id = coalesce(variant, (
      select x.id from public.product_variants x
      where x.product_id = p.id and x.active
        and exists (select 1 from public.stock_items c where c.variant_id = x.id and c.purpose = 'rental')
      order by x.position limit 1
    ))
  where p.id = product and p.status = 'active' and p.rentable;
$$;

create function public.rental_quote(product uuid, variant uuid default null)
returns table (price bigint, days integer, late_fee bigint, deposit bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.rental_quote(product, variant) $$;

-- Whole days a rental is late (now, or at its return).
create function private.late_days(target public.rentals)
returns integer
language sql
stable
set search_path = ''
as $$
  select case when target.due_at is null then 0
    else greatest(0, ceil(extract(epoch from (coalesce(target.returned_at, now()) - target.due_at)) / 86400))::integer
  end;
$$;

-- ── Renting one item ───────────────────────────────────────────────────────

create function private.create_rental_order(
  rental_product uuid,
  shipping jsonb,
  fulfilment public.order_fulfilment default 'pickup',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  rental_variant uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_rental_order.fulfilment = 'pickup';
  cash boolean := create_rental_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  settings public.store_settings;
  item public.products;
  quote record;
  copy public.stock_items;
  zone public.delivery_zones;
  plan public.plans;
  fee bigint := 0;
  minor boolean;
  guardian uuid;
  created public.orders;
  rental public.rentals;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if (select p.birthday from public.profiles p where p.id = caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;

  select * into settings from public.store_settings;
  select * into item from public.products p where p.id = rental_product for update;
  select * into quote from private.rental_quote(rental_product, rental_variant);
  if item.id is null or quote.price is null then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  minor := private.is_minor(caller);
  if minor then
    if item.age_rating = 18 then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or (not pickup and (coalesce(trim(shipping ->> 'address'), '') = '' or (wanted = '' and delivery_zone is null)))
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  if pickup then
    if not settings.pickup_enabled
      or coalesce(nullif(trim(settings.pickup_address_ar), ''), nullif(trim(settings.pickup_address_en), '')) is null
    then
      raise exception 'Store pickup is not available' using errcode = 'check_violation';
    end if;
  else
    select * into zone from public.delivery_zones z
    where z.active and (z.id = delivery_zone or (delivery_zone is null and (z.governorate = wanted or lower(z.name_en) = wanted)))
    order by z.position limit 1;
    if zone.id is null then
      raise exception 'Delivery zone not available' using errcode = 'check_violation';
    end if;
    plan := private.member_plan(caller);
    fee := case when zone.plus_free_delivery and coalesce(plan.free_delivery, false) then 0 else zone.fee end;
  end if;
  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  select s.* into copy from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = item.id and v.active
    and (rental_variant is null or s.variant_id = rental_variant)
    and s.purpose = 'rental' and s.status = 'available'
  order by s.created_at
  limit 1
  for update of s skip locked;
  if copy.id is null then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
    fulfilment, payment_method, delivery_zone_id, guardian_status
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    quote.price + quote.deposit,
    fee,
    quote.price + quote.deposit + fee,
    0,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case when pickup then '' else coalesce(zone.governorate, zone.name_en) end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    create_rental_order.fulfilment,
    create_rental_order.payment_method,
    zone.id,
    case when minor then 'pending' end
  )
  returning * into created;

  insert into public.rentals (
    user_id, product_id, variant_id, name_ar, name_en, kind, order_id, days, late_fee, deposit
  )
  values (
    caller, item.id, copy.variant_id, item.name_ar, item.name_en, 'single', created.id,
    quote.days, quote.late_fee, quote.deposit
  )
  returning * into rental;

  update public.stock_items set status = 'rented', rental_id = rental.id where id = copy.id;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
  )
  values
    (created.id, item.id, copy.variant_id, copy.condition,
      item.name_ar || ' (إيجار ' || quote.days || case when quote.days between 3 and 10 then ' أيام)' else ' يومًا)' end, item.name_en || ' (rent, ' || quote.days || ' days)',
      quote.price, 1, 'rental', rental.id),
    (created.id, item.id, copy.variant_id, copy.condition,
      'تأمين قابل للاسترداد: ' || item.name_ar, 'Refundable deposit: ' || item.name_en,
      quote.deposit, 1, 'deposit', rental.id);

  if minor then
    perform private.notify(
      guardian, 'order', 'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
  elsif cash then
    perform private.notify(
      caller, 'order', 'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;
  return created;
end;
$$;

create function public.create_rental_order(
  rental_product uuid,
  shipping jsonb,
  fulfilment public.order_fulfilment default 'pickup',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  rental_variant uuid default null
)
returns public.orders
language sql
security invoker
set search_path = ''
as $$
  select private.create_rental_order(rental_product, shipping, fulfilment, payment_method, delivery_zone, rental_variant)
$$;

-- ── Keep it ────────────────────────────────────────────────────────────────

-- The price to keep a Plus rental: its used price minus one month of the
-- member's plan.
create function private.keep_price(target uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, private.used_price(r.variant_id) - coalesce((private.member_plan(r.user_id)).amount, 0))
  from public.rentals r
  where r.id = target and r.kind = 'plus';
$$;

create function public.keep_price(target uuid)
returns bigint
language sql
stable
security invoker
set search_path = ''
as $$ select private.keep_price(target) $$;

-- The member buys the copy they're renting with The IDEA Plus.
create function private.keep_rental(
  target uuid,
  payment_method public.order_payment_method default 'online'
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  rental public.rentals;
  copy public.stock_items;
  price bigint;
  minor boolean;
  guardian uuid;
  created public.orders;
begin
  select * into rental from public.rentals r
  where r.id = target and r.user_id = caller and r.kind = 'plus' and r.status in ('active', 'overdue')
  for update;
  if rental.id is null then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;
  if exists (
    select 1 from public.order_items i join public.orders o on o.id = i.order_id
    where i.rental_id = rental.id and i.kind = 'keep' and o.status not in ('cancelled', 'refunded')
  ) then
    raise exception 'Already being kept' using errcode = 'check_violation';
  end if;
  select * into copy from public.stock_items s where s.rental_id = rental.id and s.status = 'rented';
  if copy.id is null then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;

  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
  end if;

  price := private.keep_price(rental.id);
  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, shipping_address, fulfilment, payment_method, guardian_status
  )
  values (
    caller,
    case when keep_rental.payment_method = 'cash_on_delivery' and not minor then 'confirmed' else 'pending' end::public.order_status,
    price, 0, price,
    jsonb_build_object('full_name', coalesce((select full_name from public.profiles where id = caller), ''),
      'phone', '', 'governorate', '', 'city', '', 'address', '', 'notes', ''),
    'pickup',
    keep_rental.payment_method,
    case when minor then 'pending' end
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
  )
  values (
    created.id, rental.product_id, rental.variant_id, copy.condition,
    rental.name_ar, rental.name_en, price, 1, 'keep', rental.id
  );

  if minor then
    perform private.notify(
      guardian, 'order', 'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
  elsif created.status = 'confirmed' then
    perform private.take_order_stock(created.id);
  elsif price = 0 and keep_rental.payment_method = 'online' then
    perform public.complete_order_payment(created.id);
    select * into created from public.orders o where o.id = created.id;
  end if;
  return created;
end;
$$;

create function public.keep_rental(
  target uuid,
  payment_method public.order_payment_method default 'online'
)
returns public.orders
language sql
security invoker
set search_path = ''
as $$ select private.keep_rental(target, payment_method) $$;

-- ── Orders take (or keep) their copies ─────────────────────────────────────

-- Items for sale take copies; a Keep it line buys the rented copy and ends
-- the rental; rental and deposit lines hold the copy the rental reserved.
create or replace function private.take_order_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
begin
  for item in select * from public.order_items where order_id = target loop
    if item.kind = 'sale' then
      update public.stock_items set status = 'sold', order_item_id = item.id
      where id in (
        select c.stock_item
        from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity) c
      );
    elsif item.kind = 'keep' then
      update public.stock_items
      set status = 'sold', order_item_id = item.id, rental_id = null
      where rental_id = item.rental_id and status = 'rented';
      update public.rentals set status = 'kept', returned_at = now()
      where id = item.rental_id and status in ('active', 'overdue');
    end if;
  end loop;
end;
$$;

-- A single-item rent starts when its order is delivered or collected, and
-- is cancelled with it.
create function private.on_rental_order_status()
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
    update public.rentals set status = 'active'
    where order_id = new.id and kind = 'single' and status = 'requested';
  elsif new.status in ('cancelled', 'refunded') then
    update public.rentals set status = 'cancelled'
    where order_id = new.id and kind = 'single' and status = 'requested';
  end if;
  return null;
end;
$$;

create trigger on_rental_order_status after update of status on public.orders
  for each row execute function private.on_rental_order_status();

-- Rental moves: a single-item rent lasts its rate's days, and starts only
-- once paid (or confirmed for cash); kept rentals end without a return.
create or replace function private.on_rental_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'requested' and new.status in ('active', 'cancelled'))
    or (old.status = 'active' and new.status in ('returned', 'overdue', 'kept'))
    or (old.status = 'overdue' and new.status in ('returned', 'active', 'kept'))
  ) then
    raise exception 'Rental status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'active' and old.status = 'requested' then
    if new.kind = 'single' and not exists (
      select 1 from public.orders o
      where o.id = new.order_id and o.status in ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
    ) then
      raise exception 'Waiting for payment' using errcode = 'check_violation';
    end if;
    new.started_at := coalesce(new.started_at, now());
    new.due_at := coalesce(new.due_at, new.started_at + make_interval(days => coalesce(new.days, 14)));
  end if;

  if new.status in ('returned', 'cancelled') then
    if new.status = 'returned' then
      new.returned_at := coalesce(new.returned_at, now());
    end if;
    update public.stock_items set status = 'available', rental_id = null
    where rental_id = new.id and status = 'rented';
  end if;

  return new;
end;
$$;

-- ── Settling a single-item rent ────────────────────────────────────────────

-- Support settles a returned (or long-overdue) single-item rent: late fees
-- and damage come out of the deposit. 14 days late or more, the renter
-- keeps the item at its used price instead.
create function private.settle_rental(target uuid, damage bigint default 0)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  rental public.rentals;
  late integer;
  charge bigint;
  kept boolean;
  saved public.rentals;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(damage, 0) < 0 then
    raise exception 'Invalid amount' using errcode = 'check_violation';
  end if;

  select * into rental from public.rentals r
  where r.id = target and r.kind = 'single' and r.settled_at is null
  for update;
  if rental.id is null then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;

  late := private.late_days(rental);
  kept := rental.status in ('active', 'overdue') and late >= 14;
  if rental.status <> 'returned' and not kept then
    raise exception 'Not returned yet' using errcode = 'check_violation';
  end if;

  if kept then
    charge := private.used_price(rental.variant_id);
    update public.stock_items set status = 'sold', rental_id = null
    where rental_id = rental.id and status = 'rented';
    update public.rentals set status = 'kept', returned_at = now() where id = rental.id;
  else
    charge := late * rental.late_fee + coalesce(damage, 0);
  end if;

  update public.rentals set
    settled_at = now(),
    late_charge = case when kept then 0 else late * rental.late_fee end,
    damage_charge = case when kept then 0 else coalesce(damage, 0) end,
    refund_due = greatest(0, rental.deposit - charge),
    amount_due = greatest(0, charge - rental.deposit)
  where id = rental.id
  returning * into saved;
  return saved;
end;
$$;

create function public.settle_rental(target uuid, damage bigint default 0)
returns public.rentals
language sql
security invoker
set search_path = ''
as $$ select private.settle_rental(target, damage) $$;

-- ── The deposit rate ───────────────────────────────────────────────────────

-- Finance sets the single-item rent deposit (percent of the item's price).
create function private.set_rental_deposit_rate(rate numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if rate is null or rate < 0 or rate > 100 then
    raise exception 'Invalid amount' using errcode = 'check_violation';
  end if;
  update public.store_settings set rental_deposit_rate = rate where true;
end;
$$;

create function public.set_rental_deposit_rate(rate numeric)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_rental_deposit_rate(rate) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.price_step(numeric) from public, anon;
revoke all on function private.used_price(uuid) from public, anon;
revoke all on function private.rental_quote(uuid, uuid) from public;
revoke all on function private.late_days(public.rentals) from public, anon;
revoke all on function private.create_rental_order(uuid, jsonb, public.order_fulfilment, public.order_payment_method, uuid, uuid) from public, anon;
revoke all on function private.keep_price(uuid) from public, anon;
revoke all on function private.keep_rental(uuid, public.order_payment_method) from public, anon;
revoke all on function private.settle_rental(uuid, bigint) from public, anon;
revoke all on function private.on_rental_order_status() from public, anon, authenticated;
revoke all on function public.rental_quote(uuid, uuid) from public;
revoke all on function public.create_rental_order(uuid, jsonb, public.order_fulfilment, public.order_payment_method, uuid, uuid) from public, anon;
revoke all on function public.keep_price(uuid) from public, anon;
revoke all on function public.keep_rental(uuid, public.order_payment_method) from public, anon;
revoke all on function public.settle_rental(uuid, bigint) from public, anon;
revoke all on function private.set_rental_deposit_rate(numeric) from public, anon;
revoke all on function public.set_rental_deposit_rate(numeric) from public, anon;

grant execute on function private.price_step(numeric) to authenticated;
grant execute on function private.used_price(uuid) to authenticated;
grant execute on function private.rental_quote(uuid, uuid) to anon, authenticated;
grant execute on function private.late_days(public.rentals) to authenticated;
grant execute on function private.create_rental_order(uuid, jsonb, public.order_fulfilment, public.order_payment_method, uuid, uuid) to authenticated;
grant execute on function private.keep_price(uuid) to authenticated;
grant execute on function private.keep_rental(uuid, public.order_payment_method) to authenticated;
grant execute on function private.settle_rental(uuid, bigint) to authenticated;
grant execute on function public.rental_quote(uuid, uuid) to anon, authenticated;
grant execute on function public.create_rental_order(uuid, jsonb, public.order_fulfilment, public.order_payment_method, uuid, uuid) to authenticated;
grant execute on function public.keep_price(uuid) to authenticated;
grant execute on function public.keep_rental(uuid, public.order_payment_method) to authenticated;
grant execute on function public.settle_rental(uuid, bigint) to authenticated;
grant execute on function private.set_rental_deposit_rate(numeric) to authenticated;
grant execute on function public.set_rental_deposit_rate(numeric) to authenticated;
