-- Catalog, part 5: one cart, with rentals.
--
-- Single rentals go in the cart with everything bought (cart_items.purpose
-- 'rent'), and check out in one order with one delivery fee:
--
-- * A rent line is one copy of a rentable item from The IDEA; at most 3,
--   several only films, books and games (as rentals_quote).
-- * price_checkout prices rent lines by their rate (the term's end for
--   textbooks) with their refundable deposits. The order's subtotal is
--   what's bought + the rent + the deposits. Free delivery counts what's
--   bought and the rent (not deposits); invite and coupon discounts apply
--   to what's bought; Bulbs pay for anything but deposits; the giveaway
--   cap and the cashback count the rent.
-- * create_order makes the rentals in the same order, each holding its
--   copy, with its rent and deposit lines. Rentals can't be sent as gifts.
--
-- create_rentals_order stays for the apps that still call it.

alter table public.cart_items
  add column purpose text not null default 'sale' check (purpose in ('sale', 'rent'));

comment on column public.cart_items.purpose is
  'sale: bought; rent: a single rental (one copy from The IDEA, priced by its rental rate).';

-- A rent line is one copy from The IDEA, in no particular condition.
alter table public.cart_items add constraint cart_items_rent_line check (
  purpose = 'sale'
  or (quantity = 1 and condition is null and seller_id = '00000000-0000-4000-8000-000000000001')
);

drop index public.cart_items_line_idx;
create unique index cart_items_line_idx
  on public.cart_items (user_id, product_id, variant_id, seller_id, condition, purpose) nulls not distinct;

grant insert (purpose) on public.cart_items to authenticated;

-- An accepted offer's line is bought (the line key now has the purpose).
create or replace function private.accept_offer(target uuid)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.offers;
begin
  update public.offers set
    status = 'accepted',
    accepted_at = now(),
    cart_until = now() + interval '24 hours'
  where id = target
  returning * into o;

  insert into public.cart_items (user_id, product_id, variant_id, seller_id, condition, quantity, purpose)
  values (o.buyer_id, o.product_id, o.variant_id, o.seller_id, o.condition, 1, 'sale')
  on conflict (user_id, product_id, variant_id, seller_id, condition, purpose) do update set quantity = 1;
  return o;
end;
$$;

-- Rent lines are rentable and rent together (1 to 3, several only films,
-- books and games); the checkout checks the rest.
create function private.check_cart_rent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  items jsonb;
begin
  if new.purpose <> 'rent' then
    return new;
  end if;
  if not exists (select 1 from private.rental_quote(new.product_id, new.variant_id) q where q.price is not null) then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('product', c.product_id, 'variant', c.variant_id)), '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('product', new.product_id, 'variant', new.variant_id))
  into items
  from public.cart_items c
  where c.user_id = new.user_id and c.purpose = 'rent' and c.id <> new.id;
  perform 1 from private.rental_items(items);
  return new;
end;
$$;

create trigger check_cart_rent
  before insert or update of purpose, product_id, variant_id on public.cart_items
  for each row execute function private.check_cart_rent();

revoke all on function private.check_cart_rent() from public, anon, authenticated;

-- ── Pricing ─────────────────────────────────────────────────────────────────

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
  subtotal := goods + rent + deposits;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := zone.fee;
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
    -- Bulbs pay for what's bought and rented, never a deposit.
    bulbs := (least(use_bulbs, goods + rent + fee - promo) / 250 * 250)::integer;
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

-- ── Checkout ────────────────────────────────────────────────────────────────

create or replace function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0,
  gift boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
  rental jsonb;
  copy public.stock_items;
  made public.rentals;
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

  -- A gift is paid now and its address comes later, from the recipient
  -- (claim_gift): the buyer only picks the area it goes to.
  if gift then
    if create_order.payment_method is distinct from 'online' then
      raise exception 'Gifts are paid online or with Bulbs' using errcode = 'check_violation';
    end if;
    if delivery_zone is null then
      raise exception 'Choose where the gift goes' using errcode = 'check_violation';
    end if;
  elsif create_order.payment_method is null
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
  -- A rental comes back to whoever rented it, so it isn't a gift (yet).
  if gift and jsonb_array_length(quote -> 'rentals') > 0 then
    raise exception 'Rentals can''t be sent as gifts' using errcode = 'check_violation';
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status, is_gift
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
    case when gift then jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    ) else jsonb_build_object(
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
    end end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end,
    gift
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

  -- Rent lines: a copy held for each, its rental and its rent and
  -- deposit lines (as create_rentals_order).
  for rental in select * from jsonb_array_elements(quote -> 'rentals') loop
    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = (rental ->> 'product_id')::uuid and v.active
      and (rental ->> 'variant_id' is null or s.variant_id = (rental ->> 'variant_id')::uuid)
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
      caller, (rental ->> 'product_id')::uuid, copy.variant_id, rental ->> 'name_ar',
      rental ->> 'name_en', 'single', created.id, (rental ->> 'days')::integer,
      (rental ->> 'late_fee')::bigint, (rental ->> 'deposit')::bigint
    )
    returning * into made;

    update public.stock_items set status = 'rented', rental_id = made.id where id = copy.id;

    insert into public.order_items (
      order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
    )
    values
      (created.id, made.product_id, copy.variant_id, copy.condition,
        made.name_ar || ' (إيجار ' || made.days || case when made.days between 3 and 10 then ' أيام)' else ' يومًا)' end,
        made.name_en || ' (rent, ' || made.days || ' days)',
        (rental ->> 'price')::bigint, 1, 'rental', made.id),
      (created.id, made.product_id, copy.variant_id, copy.condition,
        'تأمين قابل للاسترداد: ' || made.name_ar, 'Refundable deposit: ' || made.name_en,
        made.deposit, 1, 'deposit', made.id);
  end loop;

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
$$;
