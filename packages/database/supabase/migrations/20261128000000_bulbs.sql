-- Bulbs: The IDEA Pass rewards. 1 Bulb = 100 IQD.
--
-- Members earn Bulbs as cashback on delivered orders, at the rate of their
-- tier (from what they spent on delivered orders in the last 12 months):
--   Glow   everyone          3%
--   Shine  250,000 IQD       4%
--   Beam   750,000 IQD       5%
--   Blaze  2,000,000 IQD     7%
-- The IDEA Plus members get +1%. Each category has a multiplier (laptops
-- earn half); finance staff edit the tiers, the Plus bonus and the
-- multipliers in the back office (Finance → Bulbs).
--
-- Bonuses: first delivered order 20, completed trade-in 10. Trade-ins paid
-- in store credit are paid in Bulbs, with 20% more than the cash offer.
--
-- Earned Bulbs stay pending until 7 days after delivery (the return
-- window); a cancelled or refunded order voids them. Bulbs expire only
-- after 12 months without any activity, with a reminder 30 days before.
--
-- Only the server writes Bulbs: there is no insert, update or delete policy
-- on `bulb_entries`; triggers and SECURITY DEFINER functions write them.
-- Staff adjustments need a reason and are audited.

create type public.bulb_tier as enum ('glow', 'shine', 'beam', 'blaze');
create type public.bulb_kind as enum (
  'purchase', 'bonus', 'trade_in', 'redemption', 'adjustment', 'expiry'
);
create type public.bulb_status as enum ('pending', 'available', 'void');

-- ── Settings ───────────────────────────────────────────────────────────────

create table public.bulb_tiers (
  tier public.bulb_tier primary key,
  -- Spend on delivered orders in the last 12 months, in IQD.
  min_spend bigint not null check (min_spend >= 0),
  -- Cashback in percent of the order (before delivery).
  rate numeric(4, 2) not null check (rate >= 0 and rate <= 50),
  updated_at timestamptz not null default now()
);

comment on table public.bulb_tiers is
  'The IDEA Pass tiers: the 12-month spend that reaches each and its Bulbs cashback rate.';

insert into public.bulb_tiers (tier, min_spend, rate) values
  ('glow', 0, 3),
  ('shine', 250000, 4),
  ('beam', 750000, 5),
  ('blaze', 2000000, 7);

alter table public.store_settings
  add column bulb_plus_bonus numeric(4, 2) not null default 1
    check (bulb_plus_bonus >= 0 and bulb_plus_bonus <= 20);

comment on column public.store_settings.bulb_plus_bonus is
  'Extra Bulbs cashback, in percentage points, for The IDEA Plus members.';

alter table public.product_categories
  add column bulb_multiplier numeric(3, 2) not null default 1
    check (bulb_multiplier >= 0 and bulb_multiplier <= 5);

comment on column public.product_categories.bulb_multiplier is
  'Multiplies the Bulbs cashback rate on this category (0.5 = half, for low-margin items).';

update public.product_categories set bulb_multiplier = 0.5 where slug = 'laptops';

-- ── The ledger ─────────────────────────────────────────────────────────────

create table public.bulb_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Bulbs in (positive) or out (negative).
  amount integer not null check (amount <> 0),
  kind public.bulb_kind not null,
  status public.bulb_status not null default 'available',
  -- Pending Bulbs become usable at this time.
  available_at timestamptz not null default now(),
  order_id uuid references public.orders (id) on delete set null,
  trade_in_id uuid references public.trade_ins (id) on delete set null,
  -- Which bonus (first_order, trade_in) or the staff member's reason.
  reason text check (char_length(reason) between 1 and 300),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (status <> 'pending' or amount > 0),
  check (kind <> 'adjustment' or (reason is not null and created_by is not null))
);

comment on table public.bulb_entries is
  'Every Bulb earned, spent, voided or expired. Written only by the server.';

create index bulb_entries_user_idx on public.bulb_entries (user_id, created_at desc);
create index bulb_entries_order_idx on public.bulb_entries (order_id);
create index bulb_entries_trade_in_idx on public.bulb_entries (trade_in_id);
create index bulb_entries_created_by_idx on public.bulb_entries (created_by);
-- Each order earns once, each member gets the first-order bonus once and
-- each trade-in pays out once.
create unique index bulb_entries_order_purchase_key
  on public.bulb_entries (order_id) where kind = 'purchase';
create unique index bulb_entries_first_order_key
  on public.bulb_entries (user_id) where kind = 'bonus' and reason = 'first_order';
create unique index bulb_entries_trade_in_key
  on public.bulb_entries (trade_in_id, kind) where trade_in_id is not null;

alter table public.bulb_tiers enable row level security;
alter table public.bulb_entries enable row level security;

create policy "Anyone reads the tiers"
  on public.bulb_tiers for select to anon, authenticated
  using (true);
create policy "Finance edits the tiers"
  on public.bulb_tiers for update to authenticated
  using (private.has_staff_role('{finance}'))
  with check (private.has_staff_role('{finance}'));

create policy "Members read their Bulbs; support and finance read all"
  on public.bulb_entries for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_staff_role('{support,finance}')
  );

grant update (min_spend, rate) on public.bulb_tiers to authenticated;

create trigger set_updated_at before update on public.bulb_tiers
  for each row execute function private.set_updated_at();
create trigger audit_bulb_tiers after update on public.bulb_tiers
  for each row execute function private.audit_change('tier');
create trigger audit_bulb_entries after insert or update on public.bulb_entries
  for each row execute function private.audit_change();

-- ── Tiers and balances ─────────────────────────────────────────────────────

-- What the member spent on delivered orders in the last 12 months (IQD).
create function private.bulb_spend(member uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(o.total), 0)::bigint
  from public.orders o
  where o.user_id = member
    and o.status = 'delivered'
    and o.created_at > now() - interval '12 months';
$$;

-- The tier a 12-month spend reaches.
create function private.bulb_tier_for(spend bigint)
returns public.bulb_tier
language sql
stable
security definer
set search_path = ''
as $$
  select t.tier from public.bulb_tiers t
  where t.min_spend <= spend
  order by t.min_spend desc
  limit 1;
$$;

-- The member's cashback rate in percent: their tier's, plus the Plus bonus.
create function private.bulb_rate(member uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select t.rate from public.bulb_tiers t
     where t.tier = private.bulb_tier_for(private.bulb_spend(member))),
    0
  ) + case
    when private.plus_rental_slots(member) > 0
      then coalesce((select s.bulb_plus_bonus from public.store_settings s limit 1), 0)
    else 0
  end;
$$;

-- Usable and pending Bulbs. Pending entries count as usable once their
-- time has come, so nothing needs to flip them.
create function private.bulb_balance(member uuid, out available bigint, out pending bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(e.amount) filter (
      where e.status = 'available' or (e.status = 'pending' and e.available_at <= now())
    ), 0)::bigint,
    coalesce(sum(e.amount) filter (
      where e.status = 'pending' and e.available_at > now()
    ), 0)::bigint
  from public.bulb_entries e
  where e.user_id = member;
$$;

-- The caller's Bulbs, tier and progress to the next tier.
create function private.my_bulbs()
returns table (
  available bigint,
  pending bigint,
  tier public.bulb_tier,
  rate numeric,
  spend bigint,
  next_tier public.bulb_tier,
  next_min_spend bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  member_spend bigint;
  current_tier public.bulb_tier;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  member_spend := private.bulb_spend(caller);
  current_tier := private.bulb_tier_for(member_spend);
  return query
  select b.available, b.pending, current_tier, private.bulb_rate(caller), member_spend,
    n.tier, n.min_spend
  from private.bulb_balance(caller) b
  left join lateral (
    select t.tier, t.min_spend from public.bulb_tiers t
    where t.min_spend > member_spend
    order by t.min_spend
    limit 1
  ) n on true;
end;
$$;

create function public.my_bulbs()
returns table (
  available bigint,
  pending bigint,
  tier public.bulb_tier,
  rate numeric,
  spend bigint,
  next_tier public.bulb_tier,
  next_min_spend bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_bulbs() $$;

comment on function public.my_bulbs() is
  'The caller''s usable and pending Bulbs, tier, cashback rate and progress to the next tier.';

-- A member's Bulbs and tier, for support and finance in the back office.
create function private.member_bulbs(member uuid)
returns table (
  available bigint,
  pending bigint,
  tier public.bulb_tier,
  rate numeric,
  spend bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support,finance}') then
    raise exception 'Support and finance only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select b.available, b.pending, private.bulb_tier_for(private.bulb_spend(member)),
    private.bulb_rate(member), private.bulb_spend(member)
  from private.bulb_balance(member) b;
end;
$$;

create function public.member_bulbs(member uuid)
returns table (
  available bigint,
  pending bigint,
  tier public.bulb_tier,
  rate numeric,
  spend bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.member_bulbs($1) $$;

-- What members hold, for finance: Bulbs and their value in IQD.
create function private.bulbs_outstanding()
returns table (available bigint, pending bigint, value_iqd bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    (coalesce(sum(e.amount) filter (where e.status <> 'void'), 0) * 100)::bigint
  from public.bulb_entries e;
end;
$$;

create function public.bulbs_outstanding()
returns table (available bigint, pending bigint, value_iqd bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.bulbs_outstanding() $$;

-- ── Earning ────────────────────────────────────────────────────────────────

-- Cashback on a delivered order (and the first-order bonus), pending until
-- the return window closes. Runs once per order.
create function private.earn_order_bulbs(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  pct numeric;
  earned integer;
  usable_at timestamptz := now() + interval '7 days';
begin
  select o.user_id into member from public.orders o where o.id = target;
  if member is null then
    return;
  end if;

  pct := private.bulb_rate(member);
  -- 1 Bulb = 100 IQD: IQD × rate% ÷ 100 ÷ 100.
  select floor(coalesce(sum(i.unit_price * i.quantity * coalesce(c.bulb_multiplier, 1)), 0) * pct / 10000)::integer
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

create function private.on_order_bulbs()
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
    -- The order's cashback and bonus go; anything the member spent stays.
    update public.bulb_entries
    set status = 'void'
    where order_id = new.id and kind in ('purchase', 'bonus') and status <> 'void';
  end if;
  return null;
end;
$$;

create trigger bulbs_on_order after update of status on public.orders
  for each row execute function private.on_order_bulbs();

-- A completed trade-in earns its bonus, and a store-credit payout is paid
-- in Bulbs with 20% more than the cash offer.
create function private.on_trade_in_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'completed' or old.status = 'completed' or new.user_id is null then
    return null;
  end if;
  insert into public.bulb_entries (user_id, amount, kind, trade_in_id, reason)
  values (new.user_id, 10, 'bonus', new.id, 'trade_in')
  on conflict do nothing;
  if new.payout = 'store_credit' and coalesce(new.offer_amount, 0) >= 100 then
    insert into public.bulb_entries (user_id, amount, kind, trade_in_id)
    values (new.user_id, floor(new.offer_amount * 1.2 / 100)::integer, 'trade_in', new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger bulbs_on_trade_in after update of status on public.trade_ins
  for each row execute function private.on_trade_in_bulbs();

-- ── Staff adjustments ──────────────────────────────────────────────────────

-- Adds (positive) or takes away (negative) Bulbs, with a reason. Support
-- and finance staff only; the entry is audited.
create function private.adjust_bulbs(member uuid, bulbs integer, why text)
returns public.bulb_entries
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry public.bulb_entries;
begin
  if not private.has_staff_role('{support,finance}') then
    raise exception 'Support and finance only' using errcode = 'insufficient_privilege';
  end if;
  if bulbs is null or bulbs = 0 or abs(bulbs) > 100000 then
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
$$;

create function public.adjust_bulbs(member uuid, bulbs integer, why text)
returns public.bulb_entries
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.adjust_bulbs($1, $2, $3) $$;

comment on function public.adjust_bulbs(uuid, integer, text) is
  'Adds or takes away a member''s Bulbs with a reason (support and finance; audited).';

-- The Plus bonus and the category multipliers, for finance (store settings
-- and categories are otherwise admin-only). `multipliers` maps category ids
-- to multipliers: {"<category id>": 0.5, …}.
create function private.set_bulb_rates(plus_bonus numeric, multipliers jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(multipliers, '{}')) <> 'object' then
    raise exception 'Multipliers must be an object' using errcode = 'invalid_parameter_value';
  end if;
  update public.store_settings set bulb_plus_bonus = plus_bonus;
  update public.product_categories c
  set bulb_multiplier = (m.value #>> '{}')::numeric
  from jsonb_each(coalesce(multipliers, '{}')) m
  where c.id::text = m.key;
end;
$$;

create function public.set_bulb_rates(plus_bonus numeric, multipliers jsonb default '{}')
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.set_bulb_rates($1, $2) $$;

-- ── Expiry ─────────────────────────────────────────────────────────────────

-- Run daily by the API's cron (service role). Members with Bulbs and no
-- activity (no order, no Bulbs movement) for 11 months get a reminder; at
-- 12 months their usable Bulbs expire. Returns how many reminders went out
-- and how many balances expired.
create function private.run_bulb_expiry(out reminded integer, out expired integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  with last_activity as (
    select e.user_id,
      greatest(
        max(e.created_at),
        coalesce((select max(o.created_at) from public.orders o where o.user_id = e.user_id), '-infinity')
      ) as at
    from public.bulb_entries e
    group by e.user_id
  ),
  holders as (
    select a.user_id, a.at, b.available
    from last_activity a
    cross join lateral private.bulb_balance(a.user_id) b
    where b.available > 0 and b.pending = 0
  ),
  expiring as (
    insert into public.bulb_entries (user_id, amount, kind, reason)
    select h.user_id, -h.available, 'expiry', 'inactive_12_months'
    from holders h
    where h.at < now() - interval '12 months'
    returning user_id
  ),
  reminding as (
    insert into public.notifications (user_id, kind, event, data, link)
    select h.user_id, 'system', 'bulbs_expiring',
      jsonb_build_object('bulbs', h.available, 'expires_at', h.at + interval '12 months'),
      '/pass/bulbs'
    from holders h
    where h.at < now() - interval '11 months'
      and h.at >= now() - interval '12 months'
      and not exists (
        select 1 from public.notifications n
        where n.user_id = h.user_id and n.event = 'bulbs_expiring' and n.created_at > h.at
      )
    returning user_id
  )
  select (select count(*) from reminding)::integer, (select count(*) from expiring)::integer
  into reminded, expired;
end;
$$;

create function public.run_bulb_expiry(out reminded integer, out expired integer)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.run_bulb_expiry() $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.bulb_spend(uuid) from public, anon, authenticated;
revoke all on function private.bulb_tier_for(bigint) from public, anon, authenticated;
revoke all on function private.bulb_rate(uuid) from public, anon, authenticated;
revoke all on function private.bulb_balance(uuid) from public, anon, authenticated;
revoke all on function private.earn_order_bulbs(uuid) from public, anon, authenticated;

revoke all on function private.my_bulbs() from public, anon;
grant execute on function private.my_bulbs() to authenticated, service_role;
revoke all on function public.my_bulbs() from public, anon;
grant execute on function public.my_bulbs() to authenticated, service_role;

revoke all on function private.member_bulbs(uuid) from public, anon;
grant execute on function private.member_bulbs(uuid) to authenticated, service_role;
revoke all on function public.member_bulbs(uuid) from public, anon;
grant execute on function public.member_bulbs(uuid) to authenticated, service_role;

revoke all on function private.bulbs_outstanding() from public, anon;
grant execute on function private.bulbs_outstanding() to authenticated, service_role;
revoke all on function public.bulbs_outstanding() from public, anon;
grant execute on function public.bulbs_outstanding() to authenticated, service_role;

revoke all on function private.adjust_bulbs(uuid, integer, text) from public, anon;
grant execute on function private.adjust_bulbs(uuid, integer, text) to authenticated, service_role;
revoke all on function public.adjust_bulbs(uuid, integer, text) from public, anon;
grant execute on function public.adjust_bulbs(uuid, integer, text) to authenticated, service_role;

revoke all on function private.set_bulb_rates(numeric, jsonb) from public, anon;
grant execute on function private.set_bulb_rates(numeric, jsonb) to authenticated, service_role;
revoke all on function public.set_bulb_rates(numeric, jsonb) from public, anon;
grant execute on function public.set_bulb_rates(numeric, jsonb) to authenticated, service_role;

revoke all on function private.run_bulb_expiry() from public, anon, authenticated;
grant execute on function private.run_bulb_expiry() to service_role;
revoke all on function public.run_bulb_expiry() from public, anon, authenticated;
grant execute on function public.run_bulb_expiry() to service_role;
