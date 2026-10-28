-- Store pickup removed (owner's master brief, 2026-10-28): every order is
-- delivered by Boxy. The checkout functions accept only `delivery` (the
-- rental order's default changes from pickup to delivery), the "Ready for
-- pickup" notification goes, and the store's pickup address, hours and
-- switch are dropped. `orders.fulfilment` keeps `pickup` for past orders,
-- and for the orders that deliver nothing (keeping a rental, a survey's
-- fee), which `keep_rental()` and `open_survey()` still create.

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

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
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
$function$
;

CREATE OR REPLACE FUNCTION private.create_order(shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  -- Ages: a date of birth is needed to buy; 13–17-year-olds buy with
  -- their guardian's approval, and never PEGI 18 items.
  if (select p.birthday from public.profiles p where p.id = caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.cart_items c
      join public.products p on p.id = c.product_id
      where c.user_id = caller and p.age_rating = 18
    ) then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
  end if;

  if create_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

  if create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
    -- Without a chosen zone, the governorate finds it.
    or (wanted = '' and delivery_zone is null)
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
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      -- A zone that isn't a whole governorate is named instead.
      'governorate', coalesce(
        quote ->> 'zone_governorate',
        nullif(left(trim(shipping ->> 'governorate'), 60), ''),
        quote ->> 'zone_name_en'
      ),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
    ) || case
      when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
    attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.seller_id, l.seller_name, l.condition,
    l.name_ar, l.name_en, l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    seller_id uuid,
    seller_name text,
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

  -- A minor's order waits for the guardian (decide_guardian_order).
  if minor then
    perform private.notify(
      guardian,
      'order',
      'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
    return created;
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
$function$
;

CREATE OR REPLACE FUNCTION private.create_rental_order(rental_product uuid, shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, rental_variant uuid DEFAULT NULL::uuid)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
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

  if create_rental_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

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
  fee := case when zone.plus_free_delivery and coalesce(plan.free_delivery, false) then 0 else zone.fee end;
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
      'governorate', coalesce(zone.governorate, zone.name_en),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
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
$function$
;

CREATE OR REPLACE FUNCTION public.create_rental_order(rental_product uuid, shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, rental_variant uuid DEFAULT NULL::uuid)
 RETURNS orders
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  select private.create_rental_order(rental_product, shipping, fulfilment, payment_method, delivery_zone, rental_variant)
$function$
;

CREATE OR REPLACE FUNCTION private.notify_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status is distinct from old.status and new.status <> 'pending'
    and not exists (
      select 1 from public.order_items i where i.order_id = new.id and i.kind = 'survey'
    )
  then
    perform private.notify(
      new.user_id,
      'order',
      'order_' || new.status::text,
      jsonb_build_object('number', new.number, 'tracking', new.tracking_number),
      '/orders/view?id=' || new.id
    );
  end if;
  return null;
end;
$function$
;

alter table public.store_settings
  drop column pickup_enabled,
  drop column pickup_address_ar,
  drop column pickup_address_en,
  drop column pickup_hours_ar,
  drop column pickup_hours_en;
