-- Catalog, part 7: Plus months as a gift.
--
-- A member puts a number of prepaid months of a Plus plan in the cart
-- (public.cart_plus_gifts: one per cart) and sends them with Send as a
-- gift, alone or with other things. Starting Plus for yourself stays on
-- the plan page's own checkout.
--
-- * price_checkout prices them at the plan's monthly price for each month.
--   They don't count towards free delivery, discounts, the giveaway cap or
--   cashback; Bulbs pay up to half of one month. Months on their own are
--   delivered nowhere, so they need no area.
-- * create_order adds a 'plus' line and a public.plus_gift_months row.
-- * claim_gift adds the months to the recipient's Pass. Without Plus, they
--   need a place (as joining does) and it starts at once, ending with the
--   gifted months unless the recipient keeps it. With Plus, the months
--   wait: each renewal uses one instead of an invoice
--   (public.use_plus_gift_month, called by the renewal job), on the gifted
--   plan, then the member's own plan comes back. A gift with nothing to
--   deliver is delivered once it's claimed.

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('sale', 'rental', 'deposit', 'keep', 'swap', 'kit', 'survey', 'plus'));

-- ── In the cart ──────────────────────────────────────────────────────────────

create table public.cart_plus_gifts (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  plan_id text not null references public.plans (id) on delete cascade,
  months integer not null check (months between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cart_plus_gifts is
  'Plus months waiting in the cart to be sent as a gift; create_order turns them into plus_gift_months.';

create index cart_plus_gifts_plan_idx on public.cart_plus_gifts (plan_id);

create trigger set_updated_at before update on public.cart_plus_gifts
  for each row execute function private.set_updated_at();

alter table public.cart_plus_gifts enable row level security;

create policy "Members see their cart's Plus gift" on public.cart_plus_gifts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members put a Plus gift in their cart" on public.cart_plus_gifts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members change their cart's Plus gift" on public.cart_plus_gifts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members take the Plus gift out of their cart" on public.cart_plus_gifts
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.cart_plus_gifts to authenticated;
grant insert (plan_id, months) on public.cart_plus_gifts to authenticated;
grant update (plan_id, months) on public.cart_plus_gifts to authenticated;

-- A monthly Plus plan that's on offer (not a student price: the recipient
-- may not be a student).
create function private.check_cart_plus_gift()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.plans p
    where p.id = new.plan_id and p.active and p.audience = 'plus'
      and p.billing_interval = 'month' and p.student_of is null
  ) then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  return new;
end;
$$;

create trigger check_cart_plus_gift before insert or update on public.cart_plus_gifts
  for each row execute function private.check_cart_plus_gift();

-- ── Gifted months ────────────────────────────────────────────────────────────

create table public.plus_gift_months (
  order_id uuid primary key references public.orders (id) on delete cascade,
  plan_id text not null references public.plans (id) on delete restrict,
  months integer not null check (months between 1 and 12),
  -- The recipient, once claimed, and how many months they've used.
  user_id uuid references auth.users (id) on delete cascade,
  used integer not null default 0,
  created_at timestamptz not null default now(),
  check (used between 0 and months),
  check (user_id is not null or used = 0)
);

comment on table public.plus_gift_months is
  'Prepaid Plus months sent as a gift: the plan, how many, who claimed them and how many are used.';

create index plus_gift_months_plan_idx on public.plus_gift_months (plan_id);
create index plus_gift_months_user_idx on public.plus_gift_months (user_id, created_at);

alter table public.plus_gift_months enable row level security;

create policy "Buyers, recipients and staff see gifted Plus months" on public.plus_gift_months
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = (select auth.uid())
    )
    or (select private.has_staff_role('{support,finance}'))
  );

grant select on public.plus_gift_months to authenticated;

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
  kit jsonb;
  kit_unit uuid;
  booking public.kit_bookings;
  plus_gift jsonb;
  months integer;
  ships boolean := exists (select 1 from public.cart_items c where c.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_kits k where k.user_id = (select auth.uid()));
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
    -- Plus months on their own go to the recipient's Pass, not an area.
    if delivery_zone is null and ships then
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
  kit := nullif(quote -> 'kit', 'null'::jsonb);
  -- Starting Plus for yourself is the plan page's own checkout.
  plus_gift := nullif(quote -> 'plus_gift', 'null'::jsonb);
  if plus_gift is not null and not gift then
    raise exception 'Plus months are sent as a gift' using errcode = 'check_violation';
  end if;
  if kit is not null then
    if gift then
      raise exception 'Kits can''t be sent as gifts' using errcode = 'check_violation';
    end if;
    if not private.is_adult(caller) then
      raise exception 'You need to be 18 or over' using errcode = 'check_violation';
    end if;
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
    case when gift then jsonb_strip_nulls(jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    )) else jsonb_build_object(
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

  -- The kit: a free unit for the weekend and its extra days, the games
  -- chosen, and its price and deposit lines (as book_kit).
  if kit is not null then
    kit_unit := private.free_kit_unit(
      kit ->> 'kit_type',
      (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer
    );
    if kit_unit is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
    values (
      caller, kit ->> 'kit_type', kit_unit, (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer,
      (kit ->> 'extra_days')::integer, created.id, (kit ->> 'deposit')::bigint
    )
    returning * into booking;
    insert into public.kit_booking_games (booking_id, product_id)
    select booking.id, g::uuid from jsonb_array_elements_text(kit -> 'games') g;

    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (kit ->> 'name_ar') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'name_en') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'price')::bigint, 1, 'kit'
    );
    if (kit ->> 'deposit')::bigint > 0 then
      insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
      values (
        created.id, 'تأمين قابل للاسترداد: ' || (kit ->> 'name_ar'),
        'Refundable deposit: ' || (kit ->> 'name_en'), (kit ->> 'deposit')::bigint, 1, 'deposit'
      );
    end if;
  end if;

  -- Plus months: one line, and the months the recipient claims.
  if plus_gift is not null then
    months := (plus_gift ->> 'months')::integer;
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      coalesce(plus_gift ->> 'name_ar', plus_gift ->> 'name') || ' · ' || case
        when months = 1 then 'شهر واحد'
        when months = 2 then 'شهران'
        when months between 3 and 10 then months || ' أشهر'
        else months || ' شهرًا'
      end,
      (plus_gift ->> 'name') || ' · ' || months
        || case when months = 1 then ' month' else ' months' end,
      (plus_gift ->> 'price')::bigint, 1, 'plus'
    );
    insert into public.plus_gift_months (order_id, plan_id, months)
    values (created.id, plus_gift ->> 'plan_id', months);
  end if;

  delete from public.cart_items where user_id = caller;
  delete from public.cart_kits where user_id = caller;
  delete from public.cart_plus_gifts where user_id = caller;

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

  -- The coming weekend: hold the kit's games now.
  if kit is not null then
    perform private.hold_kit_games();
  end if;
  return created;
end;
$$;

-- ── The link ────────────────────────────────────────────────────────────────

-- What the link shows, now with the Plus months and whether anything is
-- delivered (the recipient then gives an address).
create or replace function private.gift_details(gift public.gifts)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_id', o.id,
    'from', private.first_name(gift.sender_id),
    'message', gift.message,
    'claimed', gift.claimed_at is not null,
    'ready', o.status in ('paid', 'confirmed', 'processing', 'shipped', 'delivered'),
    'status', o.status,
    'governorate', o.shipping_address ->> 'governorate',
    'zone_id', o.delivery_zone_id,
    'total', case when gift.hide_price then null else o.total - o.shipping_fee end,
    'ships', exists (select 1 from public.order_items i where i.order_id = o.id and i.kind <> 'plus'),
    'plus', (
      select jsonb_build_object(
        'plan_id', m.plan_id,
        'name', p.name,
        'name_ar', p.name_ar,
        'months', m.months,
        'used', m.used
      )
      from public.plus_gift_months m
      join public.plans p on p.id = m.plan_id
      where m.order_id = o.id
    ),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name_ar', i.name_ar,
        'name_en', i.name_en,
        'quantity', i.quantity,
        'slug', p.slug,
        'image', p.images[1],
        'unit_price', case when gift.hide_price then null else i.unit_price end
      ) order by i.name_en)
      from public.order_items i
      left join public.products p on p.id = i.product_id
      where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.id = gift.order_id
$$;

-- Gifted months for the recipient: Plus starts now when they don't have
-- it (with a place, as joining needs), ending with the gift unless they
-- keep it; with Plus, the months wait for their renewals.
create function private.add_plus_gift(member uuid, target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  gifted public.plus_gift_months;
  live public.subscriptions;
  reason text;
begin
  select * into gifted from public.plus_gift_months m where m.order_id = target for update;
  if gifted.order_id is null then
    return;
  end if;

  -- 13–17-year-olds have Plus once their guardian allows it.
  if private.is_minor(member) and not exists (
    select 1 from public.guardian_links g
    where g.teen_id = member and g.status = 'active' and g.allows_plus
  ) then
    raise exception 'A guardian must allow Plus first' using errcode = 'check_violation';
  end if;

  select * into live from public.subscriptions s
  where s.user_id = member and s.status in ('incomplete', 'active', 'past_due')
  for update;
  if live.provider = 'company' then
    raise exception 'Your organization pays for your Plus' using errcode = 'check_violation';
  end if;

  update public.plus_gift_months set user_id = member where order_id = target;

  if live.status in ('active', 'past_due') then
    -- Overdue: the first gifted month pays it now.
    if live.status = 'past_due' then
      perform private.use_plus_gift_month(live.id);
    end if;
    return;
  end if;

  reason := private.plus_join_reason(member);
  if reason not in ('open', 'invited') then
    raise exception '%', case reason
      when 'needs_home' then 'Add your home in Baghdad first'
      when 'outside_baghdad' then 'Plus is in Baghdad only for now'
      else 'Plus is full right now'
    end using errcode = 'check_violation';
  end if;

  -- An unpaid start becomes the gift; otherwise Plus starts now.
  if live.id is null then
    insert into public.subscriptions (user_id, plan_id, provider, status, cancel_at_period_end)
    values (member, gifted.plan_id, 'gift', 'incomplete', true)
    returning * into live;
  else
    update public.subscriptions set cancel_at_period_end = true where id = live.id;
  end if;
  perform private.use_plus_gift_month(live.id);
end;
$$;

-- One gifted month for a subscription's next period, instead of an
-- invoice: on the gifted plan, with the member's own plan coming back
-- once the gifted months are used. False when there are none left.
create function private.use_plus_gift_month(subscription uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions;
  gifted public.plus_gift_months;
  base timestamptz;
begin
  select * into sub from public.subscriptions s where s.id = subscription for update;
  if sub.id is null or sub.user_id is null or sub.provider = 'company' then
    return false;
  end if;
  select * into gifted from public.plus_gift_months m
  where m.user_id = sub.user_id and m.used < m.months
  order by m.created_at, m.order_id
  limit 1
  for update;
  if gifted.order_id is null then
    return false;
  end if;

  base := greatest(coalesce(sub.current_period_end, now()), now());
  -- A late renewal starts the month from now, not from the lapsed end.
  if sub.status = 'past_due' then
    base := now();
  end if;

  update public.subscriptions set
    next_plan_id = case
      when sub.plan_id = gifted.plan_id then sub.next_plan_id
      else coalesce(sub.next_plan_id, sub.plan_id)
    end,
    plan_id = gifted.plan_id,
    status = 'active',
    current_period_start = base,
    current_period_end = base + interval '1 month'
  where id = sub.id;

  update public.plus_gift_months set used = used + 1 where order_id = gifted.order_id;
  return true;
end;
$$;

create function public.use_plus_gift_month(subscription uuid)
returns boolean
language sql volatile
security invoker
set search_path = ''
as $$ select private.use_plus_gift_month(subscription) $$;

-- The recipient takes the gift: their address in the gift's area when
-- anything is delivered (else none is needed), and any Plus months. The
-- link is spent; the buyer is told.
drop function public.claim_gift(text, jsonb);
drop function private.claim_gift(text, jsonb);

create function private.claim_gift(token text, shipping jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  gift public.gifts;
  target public.orders;
  phone text := shipping ->> 'phone';
  ships boolean;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  gift := private.gift_by_token(token);
  if gift.order_id is null then
    raise exception 'Gift not found' using errcode = 'no_data_found';
  end if;
  select * into target from public.orders o where o.id = gift.order_id for update;
  if gift.sender_id = caller then
    raise exception 'This gift is from you' using errcode = 'check_violation';
  end if;
  if target.status not in ('paid', 'confirmed') then
    raise exception 'This gift isn''t ready yet' using errcode = 'check_violation';
  end if;

  ships := exists (
    select 1 from public.order_items i where i.order_id = target.id and i.kind <> 'plus'
  );
  if ships then
    if jsonb_typeof(shipping) is distinct from 'object'
      or coalesce(trim(shipping ->> 'full_name'), '') = ''
      or coalesce(phone, '') !~ '^\+[1-9][0-9]{7,14}$'
      or char_length(shipping::text) > 4000
      or coalesce(trim(shipping ->> 'address'), '') = ''
    then
      raise exception 'Invalid shipping address' using errcode = 'check_violation';
    end if;
    if coalesce((select s.require_verified_phone from public.store_settings s), false)
      and not private.phone_is_verified(caller, phone)
    then
      raise exception 'Verify your phone number first' using errcode = 'check_violation';
    end if;

    update public.orders set shipping_address = jsonb_build_object(
        'full_name', left(trim(shipping ->> 'full_name'), 120),
        'phone', phone,
        'governorate', target.shipping_address ->> 'governorate',
        'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
        'address', left(trim(shipping ->> 'address'), 500),
        'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
        'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
      ) || case
        when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
        else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
      end
    where id = target.id;
  end if;

  perform private.add_plus_gift(caller, target.id);

  update public.gifts
  set recipient_id = caller, claimed_at = now(), token_hash = null
  where order_id = gift.order_id;

  perform private.notify(
    gift.sender_id,
    'order',
    'gift_claimed',
    jsonb_build_object('number', target.number, 'name', private.first_name(caller)),
    '/orders/view?id=' || target.id
  );

  -- Nothing to deliver: the gift arrived with the claim.
  if not ships then
    update public.orders set status = 'delivered' where id = target.id;
  end if;
  return target.id;
end;
$$;

create function public.claim_gift(token text, shipping jsonb default null)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.claim_gift(token, shipping) $$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.check_cart_plus_gift() from public, anon, authenticated;
revoke all on function private.add_plus_gift(uuid, uuid) from public, anon, authenticated;

revoke all on function private.use_plus_gift_month(uuid) from public, anon, authenticated;
revoke all on function public.use_plus_gift_month(uuid) from public, anon, authenticated;
grant execute on function private.use_plus_gift_month(uuid) to service_role;
grant execute on function public.use_plus_gift_month(uuid) to service_role;

revoke all on function private.claim_gift(text, jsonb) from public, anon;
revoke all on function public.claim_gift(text, jsonb) from public, anon;
grant execute on function private.claim_gift(text, jsonb) to authenticated;
grant execute on function public.claim_gift(text, jsonb) to authenticated;
