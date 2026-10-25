-- Invite friends: every member has an invite link (theideaiq.com/i/<code>).
-- A friend who joins through it gets 10% off their first order (at most
-- 15,000 IQD); once that order is delivered the inviter earns 50 Bulbs,
-- pending through the return window like any order's Bulbs (a refund voids
-- them). At most 20 invite rewards a month, and none when the friend's
-- order shares a phone number or address with the inviter's own orders.
--
-- Orders gain a general `discount` (with `discount_source`), which
-- affiliate codes will use too.

-- ── Codes and referrals ────────────────────────────────────────────────────

alter table public.profiles
  add column invite_code text unique
    default lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    check (invite_code ~ '^[a-z0-9]{6,16}$');

update public.profiles set invite_code = lower(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where invite_code is null;

alter table public.profiles alter column invite_code set not null;

comment on column public.profiles.invite_code is
  'The member''s invite code: theideaiq.com/i/<code>.';

create type public.referral_status as enum ('pending', 'rewarded', 'void');

create table public.referrals (
  -- One inviter per member.
  invitee_id uuid primary key references auth.users (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  status public.referral_status not null default 'pending',
  -- The invitee's first delivered order, once rewarded.
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  rewarded_at timestamptz,
  check (invitee_id <> inviter_id)
);

comment on table public.referrals is
  'Who invited whom (Invite friends), and whether the inviter was rewarded. Server-written.';

create index referrals_inviter_idx on public.referrals (inviter_id, created_at desc);
create index referrals_order_idx on public.referrals (order_id);

alter table public.referrals enable row level security;

create policy "Members see their own referrals; support and finance see all"
  on public.referrals for select to authenticated
  using (
    invitee_id = (select auth.uid())
    or inviter_id = (select auth.uid())
    or private.has_staff_role('{support,finance}')
  );

create unique index bulb_entries_invite_key
  on public.bulb_entries (order_id) where kind = 'bonus' and reason = 'invite';

-- ── Orders ──────────────────────────────────────────────────────────────────

alter table public.orders
  add column discount bigint not null default 0 check (discount >= 0),
  add column discount_source text check (discount_source in ('invite', 'affiliate')),
  drop constraint orders_total_check,
  add constraint orders_total_check
    check (total = subtotal + shipping_fee - discount - bulbs_discount and total >= 0),
  add constraint orders_discount_has_source
    check ((discount = 0) = (discount_source is null));

comment on column public.orders.discount is
  'IQD taken off the order by an invite or an affiliate code (see discount_source).';

-- ── Claiming an invite ─────────────────────────────────────────────────────

-- The caller joins through a member's invite code. Only new members can:
-- no order placed yet (paid, confirmed or later), not invited before, not
-- their own code. Returns the inviter's first name for the welcome.
create function private.claim_invite(code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  inviter public.profiles;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into inviter from public.profiles p
  where p.invite_code = lower(trim(coalesce(code, ''))) and p.banned_at is null;
  if inviter.id is null or inviter.id = caller then
    raise exception 'Invalid invite' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.referrals r where r.invitee_id = caller)
    or exists (
      select 1 from public.orders o
      where o.user_id = caller and o.status not in ('cancelled', 'pending')
    )
  then
    raise exception 'Invites are for new members' using errcode = 'check_violation';
  end if;

  insert into public.referrals (invitee_id, inviter_id) values (caller, inviter.id);
  return split_part(coalesce(inviter.full_name, ''), ' ', 1);
end;
$$;

create function public.claim_invite(code text)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$ select private.claim_invite($1) $$;

comment on function public.claim_invite(text) is
  'Joins through a member''s invite code (new members only); returns the inviter''s first name.';

-- The caller's invite code and how their invites are doing.
create function private.my_invites()
returns table (code text, invited bigint, rewarded bigint, rewarded_this_month bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.invite_code,
    (select count(*) from public.referrals r where r.inviter_id = caller),
    (select count(*) from public.referrals r where r.inviter_id = caller and r.status = 'rewarded'),
    (select count(*) from public.referrals r
     where r.inviter_id = caller and r.status = 'rewarded'
       and r.rewarded_at >= date_trunc('month', now()))
  from public.profiles p
  where p.id = caller;
end;
$$;

create function public.my_invites()
returns table (code text, invited bigint, rewarded bigint, rewarded_this_month bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_invites() $$;

-- ── Checkout ───────────────────────────────────────────────────────────────

create or replace function private.create_order(
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
  invite public.referrals;
  promo bigint := 0;
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

  -- A friend's invite takes 10% off the first order (at most 15,000 IQD).
  select * into invite from public.referrals r
  where r.invitee_id = caller and r.status = 'pending';
  -- Once: not after a paid order, nor while another invite order is open.
  if invite.invitee_id is not null and not exists (
    select 1 from public.orders o
    where o.user_id = caller
      and (
        o.status not in ('cancelled', 'pending')
        or (o.discount_source = 'invite' and o.status <> 'cancelled')
      )
  ) then
    promo := least(floor(order_subtotal * 0.10)::bigint, 15000);
  end if;

  -- Bulbs pay up to the whole order (100 IQD each), from what's usable now.
  -- Concurrent checkouts by the same member wait for each other.
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
    select b.available into usable from private.bulb_balance(caller) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    bulbs := least(use_bulbs, ((order_subtotal + fee - promo) / 100)::integer);
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, shipping_address, fulfilment,
    payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    order_subtotal,
    fee,
    promo,
    case when promo > 0 then 'invite' end,
    bulbs,
    bulbs * 100,
    order_subtotal + fee - promo - bulbs * 100,
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

-- ── Rewarding the inviter ──────────────────────────────────────────────────

-- When an invited member's first order is delivered, the inviter earns 50
-- Bulbs (pending for the return window), up to 20 a month, unless the
-- order shares a phone number or address with the inviter's own orders.
create function private.reward_invite(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
  values (invite.inviter_id, 50, 'bonus', 'pending', now() + interval '7 days', target, 'invite')
  on conflict do nothing;

  update public.referrals
  set status = 'rewarded', order_id = target, rewarded_at = now()
  where invitee_id = invite.invitee_id;
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
    perform private.reward_invite(new.id);
  elsif new.status in ('cancelled', 'refunded') then
    -- The order's cashback, its bonuses (the inviter's too) go, and the
    -- Bulbs spent on it come back.
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

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.reward_invite(uuid) from public, anon, authenticated;

revoke all on function private.claim_invite(text) from public, anon;
grant execute on function private.claim_invite(text) to authenticated, service_role;
revoke all on function public.claim_invite(text) from public, anon;
grant execute on function public.claim_invite(text) to authenticated, service_role;

revoke all on function private.my_invites() from public, anon;
grant execute on function private.my_invites() to authenticated, service_role;
revoke all on function public.my_invites() from public, anon;
grant execute on function public.my_invites() to authenticated, service_role;
