-- Program revision v2, stage 1, item 1: remove what v2 drops.
--
-- There are no customers yet, so removed features go outright:
--   * Sell to us (trade-ins): table, functions, photos bucket, Bulbs bonus.
--   * Affiliates: tables, commissions, the 5% follower discount; /r/<code>
--     keeps friends' invites only.
--   * Hiring (company job requests and candidates, the CV bucket).
--   * The half-rate Bulbs rule (category and product multipliers, the
--     "half from" price): every item earns the member's rate.
--   * Boxes: no new boxes; a box leaves the store once its parts sell out.
--
-- Postgres can't drop a value from an enum that's in use, so the old
-- labels stay in notification_kind and bulb_kind ('trade_in'); nothing
-- writes them any more.

-- ── Shared functions without affiliates or multipliers ─────────────────────

CREATE OR REPLACE FUNCTION private.price_checkout(member uuid, governorate text, fulfilment order_fulfilment, payment_method order_payment_method, delivery_zone uuid, use_bulbs integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
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
    'free_from', case when pickup then null else zone.free_from end,
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
$function$;
CREATE OR REPLACE FUNCTION private.checkout_quote(fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0, governorate text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  return private.price_checkout(
    caller, governorate, fulfilment, payment_method, delivery_zone, use_bulbs
  ) - 'lines' - 'zone_governorate' - 'zone_name_en';
end;
$function$;
CREATE OR REPLACE FUNCTION private.create_order(shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_order.fulfilment = 'pickup';
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
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end
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
$function$;
CREATE OR REPLACE FUNCTION private.earn_order_bulbs(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    coalesce(sum(i.unit_price * i.quantity), 0)
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
$function$;
CREATE OR REPLACE FUNCTION public.claim_whatsapp_notifications(notification_ids uuid[] DEFAULT NULL::uuid[], max_age interval DEFAULT '24:00:00'::interval, max_rows integer DEFAULT 500)
 RETURNS TABLE(id uuid, user_id uuid, event text, data jsonb, link text, locale text, phone text, first_name text)
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  with claimed as (
    update public.notifications as n
    set whatsapp_sent_at = now()
    where n.id in (
      select candidate.id
      from public.notifications as candidate
      where candidate.whatsapp_sent_at is null
        and candidate.created_at > now() - max_age
        and (notification_ids is null or candidate.id = any (notification_ids))
      order by candidate.created_at
      limit greatest(least(max_rows, 1000), 1)
      for update skip locked
    )
    returning n.id, n.user_id, n.event, n.data, n.link
  )
  select claimed.id, claimed.user_id, claimed.event, claimed.data, claimed.link,
    profile.locale, profile.whatsapp_phone,
    nullif(split_part(trim(coalesce(profile.full_name, '')), ' ', 1), '')
  from claimed
  join public.profiles as profile on profile.id = claimed.user_id
  where profile.whatsapp_opt_in
    and profile.whatsapp_phone is not null
    and claimed.event in ('order_paid', 'order_shipped', 'rental_due_soon');
$function$;
CREATE OR REPLACE FUNCTION private.referral_kind(code text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select 'invite'
  where exists (
    select 1 from public.profiles p
    where p.invite_code = lower(trim(coalesce(referral_kind.code, ''))) and p.banned_at is null
  )
$function$;

-- ── Money rules without the half-rate settings ─────────────────────────────

drop function public.set_money_rules(jsonb, jsonb);
drop function private.set_money_rules(jsonb, jsonb);

CREATE FUNCTION private.set_money_rules(rules jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(rules, '{}')) <> 'object' then
    raise exception 'Rules must be an object' using errcode = 'invalid_parameter_value';
  end if;
  update public.store_settings s set
    bulb_rate = coalesce((rules ->> 'bulb_rate')::numeric, s.bulb_rate),
    return_days = coalesce((rules ->> 'return_days')::smallint, s.return_days),
    max_giveaway_rate = coalesce((rules ->> 'max_giveaway_rate')::numeric, s.max_giveaway_rate),
    cash_limit = case
      when rules ? 'cash_limit' then (rules ->> 'cash_limit')::bigint
      else s.cash_limit
    end,
    payment_fee_rate = coalesce((rules ->> 'payment_fee_rate')::numeric, s.payment_fee_rate),
    delivery_cost = coalesce((rules ->> 'delivery_cost')::bigint, s.delivery_cost),
    min_margin_rate = coalesce((rules ->> 'min_margin_rate')::numeric, s.min_margin_rate);
end;
$function$;

create function public.set_money_rules(rules jsonb)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_money_rules(rules) $$;

revoke all on function private.set_money_rules(jsonb) from public, anon;
grant execute on function private.set_money_rules(jsonb) to authenticated, service_role;
revoke all on function public.set_money_rules(jsonb) from public, anon;
grant execute on function public.set_money_rules(jsonb) to authenticated, service_role;

drop function private.bulb_multiplier(uuid, bigint);
alter table public.products drop column bulb_multiplier;
alter table public.product_categories drop column bulb_multiplier;
alter table public.store_settings drop column bulb_half_from;

-- ── Affiliates ─────────────────────────────────────────────────────────────

drop trigger affiliate_on_order on public.orders;
drop trigger affiliate_on_payment on public.payments;
drop function private.on_order_affiliate();
drop function private.on_payment_affiliate();

drop function public.affiliate_balances();
drop function public.apply_affiliate(text, text);
drop function public.decide_affiliate(uuid, public.affiliate_status, text, text);
drop function public.my_affiliate();
drop function public.my_affiliate_referrer();
drop function public.record_affiliate_payout(uuid, text);
drop function public.set_affiliate_payout(public.affiliate_payout_method, text);
drop function public.set_affiliate_rates(jsonb);
drop function public.touch_affiliate(text, text);
drop function private.affiliate_balance(uuid);
drop function private.affiliate_balances();
drop function private.apply_affiliate(text, text);
drop function private.decide_affiliate(uuid, public.affiliate_status, text, text);
drop function private.earn_affiliate_commission(uuid);
drop function private.claw_back_commission(uuid, uuid);
drop function private.my_affiliate();
drop function private.my_affiliate_referrer();
drop function private.order_affiliate(uuid);
drop function private.record_affiliate_payout(uuid, text);
drop function private.set_affiliate_payout(public.affiliate_payout_method, text);
drop function private.set_affiliate_rates(jsonb);
drop function private.touch_affiliate(text, text);

alter table public.orders drop constraint orders_affiliate_discount;
alter table public.orders drop column affiliate_id;
alter table public.orders drop constraint orders_discount_source_check;
alter table public.orders add constraint orders_discount_source_check
  check (discount_source = 'invite');
alter table public.subscriptions drop column affiliate_id;
alter table public.product_categories drop column affiliate_rate;

drop table public.affiliate_commissions;
drop table public.affiliate_payouts;
drop table public.affiliate_attributions;
drop table public.affiliates;
drop type public.affiliate_commission_status;
drop type public.affiliate_commission_kind;
drop type public.affiliate_payout_method;
drop type public.affiliate_status;

-- ── Sell to us (trade-ins) ─────────────────────────────────────────────────

drop function public.respond_to_trade_in_offer(uuid, boolean);
drop function public.withdraw_trade_in(uuid);
drop function public.complete_trade_in(uuid, boolean);
drop function private.respond_to_trade_in_offer(uuid, boolean);
drop function private.withdraw_trade_in(uuid);
drop function private.complete_trade_in(uuid, boolean);

alter table public.stock_items drop column trade_in_id;
alter table public.bulb_entries drop column trade_in_id;

drop policy "Customers upload their trade-in photos" on storage.objects;
drop policy "Customers and support read trade-in photos" on storage.objects;
drop policy "Customers delete unused trade-in photos" on storage.objects;

drop table public.trade_ins;
drop function private.on_trade_in_insert();
drop function private.guard_trade_in();
drop function private.notify_trade_in();
drop function private.on_trade_in_bulbs();
drop function private.paths_in_folder(text[], text);
drop type public.trade_in_category;
drop type public.trade_in_condition;
drop type public.trade_in_payout;
drop type public.trade_in_status;

-- ── Hiring ─────────────────────────────────────────────────────────────────

drop policy "Support uploads CVs" on storage.objects;
drop policy "Company members and support read CVs" on storage.objects;
drop policy "Support deletes CVs" on storage.objects;

drop function public.decide_candidate(uuid, public.candidate_status, text);
drop function public.close_job_request(uuid);
drop function private.decide_candidate(uuid, public.candidate_status, text);
drop function private.close_job_request(uuid);

drop table public.candidates;
drop table public.job_requests;
drop function private.on_candidate_proposed();
drop function private.candidate_org(uuid);
drop function private.job_org(uuid);
drop type public.candidate_status;
drop type public.job_status;
drop type public.employment_type;

-- The two buckets are empty (no requests or CVs were ever stored).
set local storage.allow_delete_query = 'true';
delete from storage.buckets b
where b.id in ('trade-ins', 'candidates')
  and not exists (select 1 from storage.objects o where o.bucket_id = b.id);

-- ── Boxes: no new ones; sold-out boxes leave the store ─────────────────────

drop policy "Admins add boxes" on public.boxes;
drop function private.add_launch_boxes();

-- A box's stock follows its parts; at none it is archived.
CREATE OR REPLACE FUNCTION private.sync_box_stock(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  available integer := private.box_stock(target);
begin
  perform set_config('idea.stock_sync', 'on', true);
  update public.product_variants v set stock_count = available, rental_stock = 0
  where v.product_id = target and (v.stock_count <> available or v.rental_stock <> 0);
  update public.products p set stock_count = available, rental_stock = 0
  where p.id = target and (p.stock_count <> available or p.rental_stock <> 0);
  -- No new boxes are made: once its parts sell out, a box leaves the store.
  if available = 0 then
    update public.products p set status = 'archived'
    where p.id = target and p.status = 'active';
  end if;
  perform set_config('idea.stock_sync', 'off', true);
end;
$function$;

-- Boxes already sold out leave the store now.
do $$
declare
  box record;
begin
  for box in select b.product_id from public.boxes b loop
    perform private.sync_box_stock(box.product_id);
  end loop;
end;
$$;
