-- Bulbs: 1 Bulb = 1 IQD (owner's master brief, step 9, section 16).
--
-- * Every balance, bonus and Bulbs amount is multiplied by 100, so nobody
--   loses value: entries, Bulbs spent and refunded on orders and returns,
--   cashback caps, survey rewards and the Bulbs surveys hold.
-- * One earning rate: 2% for everyone, and 3% / 4% / 5% for Plus Glow /
--   Shine / Blaze, on what's paid for goods, rentals, keeps and kits (shop
--   items too), rounded to whole Bulbs. Nothing on Plus fees (payments,
--   swaps), deposits or survey payments.
-- * Spending: in steps of 250 Bulbs, at least 1,000 on an order. A request
--   is rounded down to the step, and under 1,000 spends nothing.
-- * Bonuses: first order 2,000, invite 5,000, birthday 2,500, photo review
--   500, event check-in 1,000, Telegram link 1,000.
-- * Shops are still paid on their full prices: Bulbs spent on their items
--   are The IDEA's, since the Bulbs discount sits on the order, never on a
--   shop's line.

-- ── Amounts ────────────────────────────────────────────────────────────────

update public.bulb_entries set amount = amount * 100;

alter table public.orders drop constraint orders_bulbs_discount_check;
update public.orders set bulbs_used = bulbs_used * 100, max_bulbs = max_bulbs * 100;
alter table public.orders add constraint orders_bulbs_discount_check check (bulbs_discount = bulbs_used);

update public.returns set refund_bulbs = refund_bulbs * 100;

alter table public.surveys drop constraint surveys_reward_check;
update public.surveys set reward = reward * 100;
update public.surveys set held = held * 100 where kind = 'bulbs';
alter table public.surveys add constraint surveys_reward_check check (reward between 0 and 2000);

-- ── Rates ──────────────────────────────────────────────────────────────────

update public.store_settings set bulb_rate = 2;
update public.plans set bulb_rate = case tier when 1 then 3 when 2 then 4 when 3 then 5 end
where audience = 'plus' and tier in (1, 2, 3);

-- ── Earning ────────────────────────────────────────────────────────────────

-- A delivered order earns the member's rate on what was paid in money for
-- goods, rentals, keeps and kits, rounded; within the order's cashback cap.
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

  select round(
    coalesce(sum(i.unit_price * i.quantity), 0) * paid_share * private.bulb_rate(member) / 100
  )::integer
  into earned
  from public.order_items i
  where i.order_id = target and i.kind in ('sale', 'rental', 'keep', 'kit');

  earned := least(earned, coalesce(cap, earned));

  if earned > 0 then
    insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id)
    values (member, earned, 'purchase', 'pending', usable_at, target)
    on conflict do nothing;
  end if;

  insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id, reason)
  values (member, 2000, 'bonus', 'pending', usable_at, target, 'first_order')
  on conflict do nothing;
end;
$$;

-- Plus fees earn nothing; a refunded payment still takes back what it
-- earned before this change.
create or replace function private.on_payment_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.subscription_id is not null and new.status = 'refunded'
    and tg_op = 'UPDATE' and old.status is distinct from 'refunded'
  then
    update public.bulb_entries set status = 'void'
    where payment_id = new.id and kind = 'purchase' and status <> 'void';
  end if;
  return null;
end;
$$;


CREATE OR REPLACE FUNCTION private.on_review_bulbs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.status = 'hidden' then
    update public.bulb_entries set status = 'void'
    where user_id = new.user_id and product_id = new.product_id
      and reason = 'photo_review' and status <> 'void';
  elsif new.status = 'published' and new.verified_purchase and cardinality(new.photos) > 0 then
    insert into public.bulb_entries (user_id, amount, kind, review_id, product_id, reason)
    values (new.user_id, 500, 'bonus', new.id, new.product_id, 'photo_review')
    on conflict do nothing;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION private.reward_invite(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  values (invite.inviter_id, 5000, 'bonus', 'pending', now() + private.return_window(), target, 'invite')
  on conflict do nothing;

  update public.referrals
  set status = 'rewarded', order_id = target, rewarded_at = now()
  where invitee_id = invite.invitee_id;
end;
$function$;

CREATE OR REPLACE FUNCTION private.run_birthday_bulbs(OUT rewarded integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  today date := (now() at time zone 'Asia/Baghdad')::date;
  leap boolean := extract(day from (date_trunc('year', today) + interval '2 months' - interval '1 day')) = 29;
begin
  with due as (
    select p.id
    from public.profiles p
    where p.birthday is not null
      and p.banned_at is null
      and (
        (extract(month from p.birthday), extract(day from p.birthday))
          = (extract(month from today), extract(day from today))
        or (not leap and extract(month from p.birthday) = 2 and extract(day from p.birthday) = 29
          and extract(month from today) = 2 and extract(day from today) = 28)
      )
  ),
  paid as (
    insert into public.bulb_entries (user_id, amount, kind, reason)
    select due.id, 2500, 'bonus', 'birthday_' || extract(year from today)::text
    from due
    on conflict do nothing
    returning user_id, amount
  ),
  told as (
    insert into public.notifications (user_id, kind, event, data, link)
    select paid.user_id, 'system', 'bulbs_birthday',
      jsonb_build_object('bulbs', paid.amount), '/pass/bulbs'
    from paid
    returning 1
  )
  select count(*)::integer into rewarded from told;
end;
$function$;

CREATE OR REPLACE FUNCTION private.check_in_rsvp(event uuid, member uuid)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  at timestamptz;
begin
  if not private.has_staff_role('{editor,support}') then
    raise exception 'Editors and support only' using errcode = 'insufficient_privilege';
  end if;
  update public.event_rsvps r
  set checked_in_at = coalesce(r.checked_in_at, now()),
    checked_in_by = coalesce(r.checked_in_by, (select auth.uid()))
  where r.event_id = event and r.user_id = member
  returning r.checked_in_at into at;
  if at is null then
    raise exception 'No RSVP for this member' using errcode = 'no_data_found';
  end if;
  insert into public.bulb_entries (user_id, amount, kind, event_id, reason)
  values (member, 1000, 'bonus', event, 'event_check_in')
  on conflict do nothing;
  return at;
end;
$function$;

CREATE OR REPLACE FUNCTION public.link_telegram(member uuid, telegram_id bigint, username text DEFAULT NULL::text, first_name text DEFAULT NULL::text, last_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_owner uuid;
begin
  if member is null or telegram_id is null or telegram_id <= 0 then
    raise exception 'Invalid Telegram account' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles where id = member and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select m.user_id into current_owner from public.telegram_members m
  where m.id = telegram_id for update;
  if current_owner is not null and current_owner <> member then
    raise exception 'Telegram linked elsewhere' using errcode = 'unique_violation';
  end if;

  update public.telegram_members set user_id = null
  where user_id = member and id <> telegram_id;

  insert into public.telegram_members (id, username, first_name, last_name, user_id)
  values (
    telegram_id,
    nullif(left(trim(coalesce(username, '')), 64), ''),
    nullif(left(trim(coalesce(first_name, '')), 128), ''),
    nullif(left(trim(coalesce(last_name, '')), 128), ''),
    member
  )
  on conflict (id) do update
    set username = coalesce(excluded.username, public.telegram_members.username),
      first_name = coalesce(excluded.first_name, public.telegram_members.first_name),
      last_name = coalesce(excluded.last_name, public.telegram_members.last_name),
      user_id = member;

  insert into public.bulb_entries (user_id, amount, kind, reason)
  values (member, 1000, 'bonus', 'telegram')
  on conflict do nothing;
end;
$function$;

CREATE OR REPLACE FUNCTION private.adjust_bulbs(member uuid, bulbs integer, why text)
 RETURNS bulb_entries
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  entry public.bulb_entries;
begin
  if not private.has_staff_role('{support,finance}') then
    raise exception 'Support and finance only' using errcode = 'insufficient_privilege';
  end if;
  if bulbs is null or bulbs = 0 or abs(bulbs) > 10000000 then
    raise exception 'Choose a number of Bulbs' using errcode = 'check_violation';
  end if;
  if char_length(trim(coalesce(why, ''))) < 3 then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from auth.users u where u.id = member) then
    raise exception 'No such member' using errcode = 'no_data_found';
  end if;
  insert into public.bulb_entries (user_id, amount, kind, reason, created_by)
  values (member, bulbs, 'adjustment', trim(why), (select auth.uid()))
  returning * into entry;
  return entry;
end;
$function$;

CREATE OR REPLACE FUNCTION private.bulbs_outstanding()
 RETURNS TABLE(available bigint, pending bigint, value_iqd bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select
    coalesce(sum(e.amount) filter (
      where e.status = 'available' or (e.status = 'pending' and e.available_at <= now())
    ), 0)::bigint,
    coalesce(sum(e.amount) filter (where e.status = 'pending' and e.available_at > now()), 0)::bigint,
    coalesce(sum(e.amount) filter (where e.status <> 'void'), 0)::bigint
  from public.bulb_entries e;
end;
$function$;

-- Rentals and kits earn cashback too, within the giveaway cap.
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
    floor(quote.price * (select s.max_giveaway_rate from public.store_settings s limit 1) / 100)::integer,
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
$function$;

CREATE OR REPLACE FUNCTION private.book_kit(kit text, starts_on date, shipping jsonb, delivery_zone uuid, extra_days integer DEFAULT 0, games uuid[] DEFAULT '{}'::uuid[], payment_method order_payment_method DEFAULT 'online'::order_payment_method)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  kit_row public.kit_types;
  weekend record;
  zone public.delivery_zones;
  settings public.store_settings;
  unit uuid;
  ends date;
  total_price bigint;
  created public.orders;
  booking public.kit_bookings;
  cash boolean := payment_method = 'cash_on_delivery';
  game uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_adult(caller) then
    raise exception 'You need to be 18 or over' using errcode = 'check_violation';
  end if;

  select * into kit_row from public.kit_types k where k.id = kit and k.active;
  if kit_row.id is null then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  if private.is_student(caller) then
    kit_row.deposit := 0;
  end if;
  if coalesce(extra_days, 0) not between 0 and 3 then
    raise exception 'Invalid booking' using errcode = 'check_violation';
  end if;
  select * into weekend from private.kit_weekends(kit) w where w.starts_on = book_kit.starts_on;
  if weekend.starts_on is null then
    raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(games), 0) <> kit_row.games then
    raise exception 'Choose the kit''s games' using errcode = 'check_violation';
  end if;
  if kit_row.games > 0 and (
    select count(distinct p.id) from public.products p
    where p.id = any (games) and p.status = 'active' and p.rentable
      and (kit_row.games_category_id is null or p.category_id = kit_row.games_category_id)
      and not (p.age_rating = 18 and private.is_minor(caller))
  ) <> kit_row.games then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or coalesce(trim(shipping ->> 'address'), '') = ''
    or char_length(shipping::text) > 4000
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;
  select * into zone from public.delivery_zones z
  where z.id = delivery_zone and z.active and z.governorate = 'baghdad';
  if zone.id is null then
    raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
  end if;
  select * into settings from public.store_settings limit 1;
  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  -- Thursday evening to Saturday evening, plus the extra days.
  ends := book_kit.starts_on + 2 + coalesce(extra_days, 0);
  unit := private.free_kit_unit(kit, book_kit.starts_on, ends);
  if unit is null then
    raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
  end if;

  total_price := weekend.price + coalesce(extra_days, 0) * weekend.extra_day_price;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
    fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    total_price + kit_row.deposit, 0, total_price + kit_row.deposit,
    floor(total_price * (select s.max_giveaway_rate from public.store_settings s limit 1) / 100)::integer,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', 'baghdad',
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    'delivery', payment_method, zone.id
  )
  returning * into created;

  insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
  values (caller, kit, unit, book_kit.starts_on, ends, coalesce(extra_days, 0), created.id, kit_row.deposit)
  returning * into booking;

  foreach game in array coalesce(games, '{}') loop
    insert into public.kit_booking_games (booking_id, product_id) values (booking.id, game);
  end loop;

  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values
    (created.id, kit_row.name_ar || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'),
      kit_row.name_en || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'), total_price, 1, 'kit');
  if kit_row.deposit > 0 then
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (created.id, 'تأمين قابل للاسترداد: ' || kit_row.name_ar, 'Refundable deposit: ' || kit_row.name_en,
      kit_row.deposit, 1, 'deposit');
  end if;

  if cash then
    perform private.notify(
      caller, 'order', 'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;
  -- The coming weekend: hold the games now.
  perform private.hold_kit_games();
  return created;
end;
$function$;

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

  -- Bulbs (1 IQD each) pay up to the whole order, from what's usable now,
  -- in steps of 250 and at least 1,000.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    bulbs := (least(use_bulbs, subtotal + fee - promo) / 250 * 250)::integer;
    if bulbs < 1000 then
      bulbs := 0;
    end if;
  end if;

  total := subtotal + fee - promo - bulbs;
  max_bulbs := greatest(0, cap - waived - promo)::integer;
  -- Cashback on what's paid in money, at the member's rate, rounded.
  earn := least(
    round(
      subtotal
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
$function$;

-- Survey rewards per counted answer, now 200 to 1,000 Bulbs.
create or replace function private.survey_reward(questions integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select 100 * least(10, greatest(2, 2 + (greatest(questions, 0) - 1) / 3)) $$;

CREATE OR REPLACE FUNCTION private.open_survey(target surveys)
 RETURNS surveys
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  saved public.surveys;
  questions integer := (select count(*) from public.survey_questions q where q.survey_id = target.id);
  per_answer integer := private.survey_reward(questions);
  cost integer;
  balance bigint;
  created public.orders;
begin
  if target.kind = 'free' then
    update public.surveys set status = 'open', opened_at = now(), reward = 0
    where id = target.id returning * into saved;
    return saved;
  end if;

  cost := private.survey_cost(per_answer, target.wanted);
  if target.kind = 'bulbs' then
    select b.available into balance from private.bulb_balance(target.creator_id) b;
    if balance < cost then
      raise exception 'Not enough Bulbs for the rewards' using errcode = 'check_violation';
    end if;
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (target.creator_id, -cost, 'redemption', 'survey_hold');
    update public.surveys set status = 'open', opened_at = now(), reward = per_answer, held = cost
    where id = target.id returning * into saved;
    return saved;
  end if;

  -- Cash: an order of the rewards (1 IQD a Bulb) and the fee.
  insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
  values (target.creator_id, 'pending', cost, 0, cost, 0, '{}', 'pickup', 'online')
  returning * into created;
  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values (created.id, 'مكافآت استبيان: ' || target.title, 'Survey rewards: ' || target.title, cost, 1, 'survey');
  update public.surveys set status = 'awaiting_payment', reward = per_answer, held = cost, order_id = created.id
  where id = target.id returning * into saved;
  return saved;
end;
$function$;
