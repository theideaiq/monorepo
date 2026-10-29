-- Catalog, part 2 (master brief section 11): up to 3 films, books or games
-- rented together for one delivery fee, and the normal free-delivery
-- threshold for rentals.
--
-- * `create_rentals_order(items, ...)`: one order with 1 to 3 different
--   items (`[{"product": uuid, "variant": uuid}]`), each with its rental
--   and deposit lines and its own copy, one delivery fee. Several items
--   must all be films, books or games (board games included, and Books'
--   subcategories).
-- * The fee is waived when the rent (not deposits) reaches the zone's
--   `free_from`, as for purchases, or by the Plus plan as before.
-- * `rentals_quote(items, delivery_zone)` prices the same order for the
--   checkout page.
-- * `create_rental_order` (one item) stays and uses the same path.

-- Films, books and games (with board games and subcategories) rent
-- together.
create function private.rents_together(category uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.product_categories c
    left join public.product_categories p on p.id = c.parent_id
    where c.id = category
      and coalesce(p.slug, c.slug) in ('films', 'books', 'games', 'board-games')
  )
$$;

-- The delivery fee for rentals: free with a Plus plan that includes it, or
-- once the rent reaches the zone's threshold.
create function private.rental_delivery_fee(
  zone public.delivery_zones,
  plan public.plans,
  rent bigint
)
returns bigint
language sql
stable
set search_path = ''
as $$
  select case
    when zone.plus_free_delivery and coalesce(plan.free_delivery, false) then 0
    when zone.free_from is not null and rent >= zone.free_from then 0
    else zone.fee
  end
$$;

-- The items of a rental order: 1 to 3 different products, rentable, and
-- all films, books or games when there are several. Raises otherwise.
create function private.rental_items(items jsonb)
returns table (item_no integer, product uuid, variant uuid, category uuid)
language plpgsql
stable
set search_path = ''
as $$
declare
  n integer;
begin
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'Choose what to rent' using errcode = 'check_violation';
  end if;
  n := jsonb_array_length(items);
  if n < 1 or n > 3 then
    raise exception 'Rent 1 to 3 items at a time' using errcode = 'check_violation';
  end if;

  return query
  select e.ordinality::integer,
    (e.value ->> 'product')::uuid,
    nullif(e.value ->> 'variant', '')::uuid,
    p.category_id
  from jsonb_array_elements(items) with ordinality e
  left join public.products p on p.id = (e.value ->> 'product')::uuid
  order by e.ordinality;

  if (select count(distinct x.value ->> 'product') from jsonb_array_elements(items) x) <> n then
    raise exception 'Each item once' using errcode = 'check_violation';
  end if;
  if n > 1 and exists (
    select 1 from jsonb_array_elements(items) x
    left join public.products p on p.id = (x.value ->> 'product')::uuid
    where p.id is null or not private.rents_together(p.category_id)
  ) then
    raise exception 'Only films, books and games rent together' using errcode = 'check_violation';
  end if;
end;
$$;

-- ── The order ──────────────────────────────────────────────────────────────

create function private.create_rentals_order(
  items jsonb,
  shipping jsonb,
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
  cash boolean := create_rentals_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  settings public.store_settings;
  line record;
  item public.products;
  quote record;
  copy public.stock_items;
  zone public.delivery_zones;
  plan public.plans;
  rent bigint := 0;
  deposits bigint := 0;
  fee bigint;
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
  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
  end if;

  -- Every item can be rented, and the rent adds up.
  for line in select * from private.rental_items(items) loop
    select * into item from public.products p where p.id = line.product for update;
    select * into quote from private.rental_quote(line.product, line.variant);
    if item.id is null or quote.price is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    if minor and item.age_rating = 18 then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
    rent := rent + quote.price;
    deposits := deposits + quote.deposit;
  end loop;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
    or (wanted = '' and delivery_zone is null)
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  select * into zone from public.delivery_zones z
  where z.active and (z.id = delivery_zone or (delivery_zone is null and (z.governorate = wanted or lower(z.name_en) = wanted)))
  order by z.position limit 1;
  if zone.id is null then
    raise exception 'Delivery zone not available' using errcode = 'check_violation';
  end if;
  plan := private.member_plan(caller);
  fee := private.rental_delivery_fee(zone, plan, rent);
  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
    fulfilment, payment_method, delivery_zone_id, guardian_status
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    rent + deposits,
    fee,
    rent + deposits + fee,
    floor(rent * settings.max_giveaway_rate / 100)::integer,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', coalesce(zone.governorate, zone.name_en),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    'delivery',
    create_rentals_order.payment_method,
    zone.id,
    case when minor then 'pending' end
  )
  returning * into created;

  -- Each item: a copy held for it, its rental and its lines.
  for line in select * from private.rental_items(items) loop
    select * into item from public.products p where p.id = line.product;
    select * into quote from private.rental_quote(line.product, line.variant);

    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = item.id and v.active
      and (line.variant is null or s.variant_id = line.variant)
      and s.purpose = 'rental' and s.status = 'available'
    order by s.created_at
    limit 1
    for update of s skip locked;
    if copy.id is null then
      raise exception 'All copies are rented out' using errcode = 'check_violation';
    end if;

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
  end loop;

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

create function public.create_rentals_order(
  items jsonb,
  shipping jsonb,
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null
)
returns public.orders
language sql
security invoker
set search_path = ''
as $$ select private.create_rentals_order(items, shipping, payment_method, delivery_zone) $$;

comment on function public.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid) is
  'Rents 1 to 3 different items (several only films, books or games) in one order with one delivery fee.';

-- One item, as before, through the same path.
create or replace function private.create_rental_order(
  rental_product uuid,
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  rental_variant uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
begin
  if create_rental_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;
  return private.create_rentals_order(
    jsonb_build_array(jsonb_build_object('product', rental_product, 'variant', rental_variant)),
    shipping, payment_method, delivery_zone
  );
end;
$$;

-- ── The quote ──────────────────────────────────────────────────────────────

-- What the order would cost: each item's rent and deposit, the delivery
-- fee and the total. Null zone: no fee yet.
create function private.rentals_quote(items jsonb, delivery_zone uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  line record;
  quote record;
  zone public.delivery_zones;
  lines jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  fee bigint;
begin
  for line in select * from private.rental_items(items) loop
    select * into quote from private.rental_quote(line.product, line.variant);
    if quote.price is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    lines := lines || jsonb_build_object(
      'product', line.product, 'variant', line.variant, 'price', quote.price,
      'days', quote.days, 'late_fee', quote.late_fee, 'deposit', quote.deposit
    );
    rent := rent + quote.price;
    deposits := deposits + quote.deposit;
  end loop;

  select * into zone from public.delivery_zones z where z.id = delivery_zone and z.active;
  if zone.id is not null then
    fee := private.rental_delivery_fee(zone, private.member_plan((select auth.uid())), rent);
  end if;

  return jsonb_build_object(
    'items', lines,
    'rent', rent,
    'deposit', deposits,
    'fee', fee,
    'free_from', zone.free_from,
    'total', rent + deposits + coalesce(fee, 0)
  );
end;
$$;

create function public.rentals_quote(items jsonb, delivery_zone uuid default null)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.rentals_quote(items, delivery_zone) $$;

comment on function public.rentals_quote(jsonb, uuid) is
  'The price of renting 1 to 3 items together: each item''s rent and deposit, the delivery fee and the total.';

revoke all on function private.rents_together(uuid) from public, anon, authenticated;
revoke all on function private.rental_delivery_fee(public.delivery_zones, public.plans, bigint) from public, anon, authenticated;
revoke all on function private.rental_items(jsonb) from public, anon, authenticated;
revoke all on function private.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid) from public, anon;
revoke all on function public.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid) from public, anon;
revoke all on function private.rentals_quote(jsonb, uuid) from public;
revoke all on function public.rentals_quote(jsonb, uuid) from public;

grant execute on function private.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid) to authenticated;
grant execute on function public.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid) to authenticated;
grant execute on function private.rentals_quote(jsonb, uuid) to anon, authenticated;
grant execute on function public.rentals_quote(jsonb, uuid) to anon, authenticated;
