-- Affiliates: creators and partners staff approve get a link
-- (theideaiq.com/a/<code>) and the same code to type at checkout. Their
-- followers get 5% off; the affiliate earns a commission once the order is
-- delivered and its return window (7 days) has passed: 8% on media (vinyl,
-- CDs, books), 3% on tech and consoles (set per category by finance), and 20%
-- of a new Plus member's first 3 months.
--
-- Attribution: the last link or code a member used in the past 30 days; a
-- code typed at checkout replaces a link. One discount per order: when a
-- friend's invite is worth more, the invite applies and no commission is
-- earned. Commissions on refunded orders or payments are voided, or clawed
-- back from the next payout when already paid.
--
-- Payouts are monthly from 25,000 IQD, paid by finance through ZainCash, FIB,
-- Qi or a bank transfer, or as Bulbs with 20% more value.

-- ── Affiliates ─────────────────────────────────────────────────────────────

create type public.affiliate_status as enum ('applied', 'approved', 'rejected', 'suspended');
create type public.affiliate_payout_method as enum ('zaincash', 'fib', 'qi', 'bank', 'bulbs');
create type public.affiliate_commission_kind as enum ('order', 'plus', 'clawback');
create type public.affiliate_commission_status as enum ('pending', 'void', 'paid');

create table public.affiliates (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- Set by staff on approval: the link and checkout code.
  code text unique check (code ~ '^[A-Z0-9]{4,20}$'),
  status public.affiliate_status not null default 'applied',
  -- Where and how they'll share it.
  pitch text not null check (char_length(pitch) between 1 and 1000),
  channel text check (char_length(channel) <= 300),
  payout_method public.affiliate_payout_method not null default 'bulbs',
  -- A wallet phone number or IBAN; not needed for Bulbs.
  payout_account text check (char_length(payout_account) <= 120),
  staff_note text check (char_length(staff_note) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'approved' or code is not null)
);

comment on table public.affiliates is
  'Affiliate applications and approved affiliates. Written through functions only.';

create index affiliates_status_idx on public.affiliates (status, created_at desc);
create index affiliates_decided_by_idx on public.affiliates (decided_by);

create trigger set_updated_at before update on public.affiliates
  for each row execute function private.set_updated_at();

-- The last affiliate link or code each member used.
create table public.affiliate_attributions (
  member_id uuid primary key references auth.users (id) on delete cascade,
  affiliate_id uuid not null references public.affiliates (user_id) on delete cascade,
  via text not null check (via in ('link', 'code')),
  touched_at timestamptz not null default now(),
  check (member_id <> affiliate_id)
);

create index affiliate_attributions_affiliate_idx on public.affiliate_attributions (affiliate_id);

create table public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (user_id) on delete cascade,
  amount bigint not null check (amount > 0),
  method public.affiliate_payout_method not null,
  account text check (char_length(account) <= 120),
  -- The transfer reference, for a wallet or bank payout.
  reference text check (char_length(reference) <= 200),
  -- Bulbs credited, for a Bulbs payout.
  bulbs integer check (bulbs > 0),
  paid_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((method = 'bulbs') = (bulbs is not null))
);

create index affiliate_payouts_affiliate_idx on public.affiliate_payouts (affiliate_id, created_at desc);
create index affiliate_payouts_paid_by_idx on public.affiliate_payouts (paid_by);

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (user_id) on delete cascade,
  kind public.affiliate_commission_kind not null,
  -- IQD; negative for a clawback.
  amount bigint not null check (amount <> 0),
  status public.affiliate_commission_status not null default 'pending',
  -- Pending commissions can be paid out from this time (after returns).
  available_at timestamptz not null default now(),
  order_id uuid references public.orders (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  payout_id uuid references public.affiliate_payouts (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((kind = 'clawback') = (amount < 0)),
  check (num_nonnulls(order_id, payment_id) <= 1),
  check ((status = 'paid') = (payout_id is not null))
);

comment on table public.affiliate_commissions is
  'What each affiliate earned, voided or had clawed back. Written only by the server.';

create index affiliate_commissions_affiliate_idx on public.affiliate_commissions (affiliate_id, created_at desc);
create index affiliate_commissions_payment_idx on public.affiliate_commissions (payment_id);
create index affiliate_commissions_payout_idx on public.affiliate_commissions (payout_id);
-- Each order and payment earns once and is clawed back once.
create unique index affiliate_commissions_order_key
  on public.affiliate_commissions (order_id) where kind = 'order';
create unique index affiliate_commissions_payment_key
  on public.affiliate_commissions (payment_id) where kind = 'plus';
create unique index affiliate_commissions_order_clawback_key
  on public.affiliate_commissions (order_id) where kind = 'clawback';
create unique index affiliate_commissions_payment_clawback_key
  on public.affiliate_commissions (payment_id) where kind = 'clawback';

alter table public.orders
  add column affiliate_id uuid references public.affiliates (user_id) on delete set null,
  add constraint orders_affiliate_discount
    check (affiliate_id is null or discount_source = 'affiliate');

create index orders_affiliate_idx on public.orders (affiliate_id);

comment on column public.orders.affiliate_id is
  'The affiliate whose link or code gave this order its discount.';

alter table public.subscriptions
  add column affiliate_id uuid references public.affiliates (user_id) on delete set null;

create index subscriptions_affiliate_idx on public.subscriptions (affiliate_id);

comment on column public.subscriptions.affiliate_id is
  'The affiliate who brought this new Plus member (20% of the first 3 months).';

-- Commission rates by category (percent of the price after the follower's
-- discount).
alter table public.product_categories
  add column affiliate_rate numeric(5, 2) not null default 3
    check (affiliate_rate between 0 and 50);

update public.product_categories set affiliate_rate = 8
where slug in ('vinyl', 'cds-and-cassettes', 'books');

-- ── Row Level Security ─────────────────────────────────────────────────────

alter table public.affiliates enable row level security;
alter table public.affiliate_attributions enable row level security;
alter table public.affiliate_payouts enable row level security;
alter table public.affiliate_commissions enable row level security;

create policy "Affiliates see themselves; marketing and finance see all"
  on public.affiliates for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{marketing,finance}'));

create policy "Members see their own attribution; marketing and finance see all"
  on public.affiliate_attributions for select to authenticated
  using (member_id = (select auth.uid()) or private.has_staff_role('{marketing,finance}'));

create policy "Affiliates see their payouts; marketing and finance see all"
  on public.affiliate_payouts for select to authenticated
  using (affiliate_id = (select auth.uid()) or private.has_staff_role('{marketing,finance}'));

create policy "Affiliates see their commissions; marketing and finance see all"
  on public.affiliate_commissions for select to authenticated
  using (affiliate_id = (select auth.uid()) or private.has_staff_role('{marketing,finance}'));

revoke all on public.affiliates, public.affiliate_attributions,
  public.affiliate_payouts, public.affiliate_commissions from anon, authenticated;
grant select on public.affiliates, public.affiliate_attributions,
  public.affiliate_payouts, public.affiliate_commissions to authenticated;
grant all on public.affiliates, public.affiliate_attributions,
  public.affiliate_payouts, public.affiliate_commissions to service_role;

-- ── Helpers ────────────────────────────────────────────────────────────────

-- The approved affiliate a member's orders count for: their last link or
-- code in the past 30 days.
create function private.order_affiliate(member uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.affiliate_id
  from public.affiliate_attributions a
  join public.affiliates f on f.user_id = a.affiliate_id
  where a.member_id = member
    and a.touched_at > now() - interval '30 days'
    and f.status = 'approved'
    and a.affiliate_id <> member;
$$;

-- An affiliate's commissions: ready to pay, still in the return window, paid.
create function private.affiliate_balance(
  affiliate uuid,
  out available bigint,
  out pending bigint,
  out paid bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(c.amount) filter (where c.status = 'pending' and c.available_at <= now()), 0)::bigint,
    coalesce(sum(c.amount) filter (where c.status = 'pending' and c.available_at > now()), 0)::bigint,
    coalesce(sum(c.amount) filter (where c.status = 'paid'), 0)::bigint
  from public.affiliate_commissions c
  where c.affiliate_id = affiliate;
$$;

-- Whether an order shares a phone number or address with the affiliate's
-- own orders or phone (buying through their own link).
create function private.order_shares_contact(target uuid, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.orders mine, public.orders o
    where o.id = target
      and mine.user_id = member
      and (
        nullif(mine.shipping_address ->> 'phone', '') = o.shipping_address ->> 'phone'
        or (
          nullif(trim(mine.shipping_address ->> 'address'), '') is not null
          and lower(trim(mine.shipping_address ->> 'address')) = lower(trim(o.shipping_address ->> 'address'))
        )
      )
  ) or exists (
    select 1 from auth.users u, public.orders o
    where o.id = target
      and u.id = member
      and u.phone is not null
      and '+' || u.phone = o.shipping_address ->> 'phone'
  );
$$;

-- ── Members ────────────────────────────────────────────────────────────────

-- The caller applies (or applies again after a rejection).
create function private.apply_affiliate(pitch text, channel text default null)
returns public.affiliates
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  current public.affiliates;
  saved public.affiliates;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(trim(pitch), '') = '' then
    raise exception 'Tell us where you''ll share it' using errcode = 'check_violation';
  end if;

  select * into current from public.affiliates a where a.user_id = caller for update;
  if current.status in ('approved', 'suspended') then
    raise exception 'Already an affiliate' using errcode = 'check_violation';
  end if;

  insert into public.affiliates (user_id, pitch, channel)
  values (caller, left(trim(pitch), 1000), nullif(left(trim(coalesce(channel, '')), 300), ''))
  on conflict (user_id) do update
    set pitch = excluded.pitch, channel = excluded.channel, status = 'applied',
      decided_by = null, decided_at = null
  returning * into saved;
  return saved;
end;
$$;

create function public.apply_affiliate(pitch text, channel text default null)
returns public.affiliates
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.apply_affiliate($1, $2) $$;

-- How the caller wants to be paid.
create function private.set_affiliate_payout(
  method public.affiliate_payout_method,
  account text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  cleaned text := nullif(left(trim(coalesce(account, '')), 120), '');
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if method is null or (method <> 'bulbs' and cleaned is null) then
    raise exception 'Payout account required' using errcode = 'check_violation';
  end if;
  update public.affiliates a
  set payout_method = method, payout_account = case when method = 'bulbs' then null else cleaned end
  where a.user_id = caller;
  if not found then
    raise exception 'Not an affiliate' using errcode = 'no_data_found';
  end if;
end;
$$;

create function public.set_affiliate_payout(
  method public.affiliate_payout_method,
  account text default null
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.set_affiliate_payout($1, $2) $$;

-- The caller followed an affiliate's link or typed their code. Returns the
-- code and the affiliate's first name.
create function private.touch_affiliate(affiliate_code text, via text default 'link')
returns table (code text, name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  found_affiliate public.affiliates;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if via is null or via not in ('link', 'code') then
    raise exception 'Invalid code' using errcode = 'check_violation';
  end if;

  select * into found_affiliate from public.affiliates a
  where a.code = upper(trim(coalesce(affiliate_code, ''))) and a.status = 'approved';
  if found_affiliate.user_id is null or found_affiliate.user_id = caller then
    raise exception 'Invalid code' using errcode = 'check_violation';
  end if;

  insert into public.affiliate_attributions (member_id, affiliate_id, via, touched_at)
  values (caller, found_affiliate.user_id, via, now())
  on conflict (member_id) do update
    set affiliate_id = excluded.affiliate_id, via = excluded.via, touched_at = excluded.touched_at;

  return query
  select found_affiliate.code, split_part(coalesce(p.full_name, ''), ' ', 1)
  from public.profiles p where p.id = found_affiliate.user_id;
end;
$$;

create function public.touch_affiliate(affiliate_code text, via text default 'link')
returns table (code text, name text)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.touch_affiliate($1, $2) $$;

-- The affiliate the caller's next order counts for, if any.
create function private.my_affiliate_referrer()
returns table (code text, name text, via text, expires_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select f.code, split_part(coalesce(p.full_name, ''), ' ', 1), a.via, a.touched_at + interval '30 days'
  from public.affiliate_attributions a
  join public.affiliates f on f.user_id = a.affiliate_id
  left join public.profiles p on p.id = f.user_id
  where a.member_id = (select auth.uid())
    and f.user_id = private.order_affiliate(a.member_id);
$$;

create function public.my_affiliate_referrer()
returns table (code text, name text, via text, expires_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_affiliate_referrer() $$;

-- The caller's affiliate status and balance (no row if they never applied).
create function private.my_affiliate()
returns table (
  status public.affiliate_status,
  code text,
  payout_method public.affiliate_payout_method,
  payout_account text,
  available bigint,
  pending bigint,
  paid bigint,
  orders bigint,
  plus_members bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select a.status, a.code, a.payout_method, a.payout_account,
    b.available, b.pending, b.paid,
    (select count(*) from public.affiliate_commissions c
     where c.affiliate_id = a.user_id and c.kind = 'order' and c.status <> 'void'),
    (select count(*) from public.subscriptions s where s.affiliate_id = a.user_id)
  from public.affiliates a
  cross join lateral private.affiliate_balance(a.user_id) b
  where a.user_id = (select auth.uid());
$$;

create function public.my_affiliate()
returns table (
  status public.affiliate_status,
  code text,
  payout_method public.affiliate_payout_method,
  payout_account text,
  available bigint,
  pending bigint,
  paid bigint,
  orders bigint,
  plus_members bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_affiliate() $$;

-- ── Staff ──────────────────────────────────────────────────────────────────

-- Marketing approves (with the code), rejects or suspends an affiliate.
create function private.decide_affiliate(
  member uuid,
  decision public.affiliate_status,
  code text default null,
  note text default null
)
returns public.affiliates
language plpgsql
security definer
set search_path = ''
as $$
declare
  current public.affiliates;
  wanted text := nullif(upper(trim(coalesce(code, ''))), '');
  saved public.affiliates;
begin
  if not private.has_staff_role('{marketing}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if decision is null or decision = 'applied' then
    raise exception 'Invalid decision' using errcode = 'check_violation';
  end if;

  select * into current from public.affiliates a where a.user_id = member for update;
  if current.user_id is null then
    raise exception 'Affiliate not found' using errcode = 'no_data_found';
  end if;

  wanted := coalesce(wanted, current.code);
  if decision = 'approved' and (wanted is null or wanted !~ '^[A-Z0-9]{4,20}$') then
    raise exception 'Invalid code' using errcode = 'check_violation';
  end if;
  if wanted is not null and exists (
    select 1 from public.affiliates a where a.code = wanted and a.user_id <> member
  ) then
    raise exception 'Code taken' using errcode = 'unique_violation';
  end if;

  update public.affiliates a
  set status = decision,
    code = case when decision = 'approved' then wanted else a.code end,
    staff_note = nullif(left(trim(coalesce(note, '')), 1000), ''),
    decided_by = (select auth.uid()),
    decided_at = now()
  where a.user_id = member
  returning * into saved;

  if decision = 'approved' and current.status is distinct from 'approved' then
    perform private.notify(member, 'system', 'affiliate_approved',
      jsonb_build_object('code', saved.code), '/pass/affiliate');
  end if;
  return saved;
end;
$$;

create function public.decide_affiliate(
  member uuid,
  decision public.affiliate_status,
  code text default null,
  note text default null
)
returns public.affiliates
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.decide_affiliate($1, $2, $3, $4) $$;

-- Every affiliate with their balance, for marketing and finance.
create function private.affiliate_balances()
returns table (affiliate_id uuid, available bigint, pending bigint, paid bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{marketing,finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
  select a.user_id, b.available, b.pending, b.paid
  from public.affiliates a
  cross join lateral private.affiliate_balance(a.user_id) b;
end;
$$;

create function public.affiliate_balances()
returns table (affiliate_id uuid, available bigint, pending bigint, paid bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.affiliate_balances() $$;

-- Finance pays an affiliate everything ready (at least 25,000 IQD) by their
-- chosen method, after sending the transfer; a Bulbs payout is credited now
-- with 20% more value.
create function private.record_affiliate_payout(affiliate uuid, reference text default null)
returns public.affiliate_payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  payee public.affiliates;
  due bigint;
  bulbs integer;
  payout public.affiliate_payouts;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  select * into payee from public.affiliates a where a.user_id = affiliate for update;
  if payee.user_id is null then
    raise exception 'Affiliate not found' using errcode = 'no_data_found';
  end if;

  select b.available into due from private.affiliate_balance(affiliate) b;
  if due < 25000 then
    raise exception 'Below the payout minimum' using errcode = 'check_violation';
  end if;
  if payee.payout_method <> 'bulbs' and coalesce(trim(reference), '') = '' then
    raise exception 'Transfer reference required' using errcode = 'check_violation';
  end if;

  if payee.payout_method = 'bulbs' then
    -- 1 Bulb = 100 IQD, with 20% more value.
    bulbs := floor(due * 1.2 / 100)::integer;
  end if;

  insert into public.affiliate_payouts (affiliate_id, amount, method, account, reference, bulbs, paid_by)
  values (
    affiliate, due, payee.payout_method, payee.payout_account,
    nullif(left(trim(coalesce(reference, '')), 200), ''), bulbs, (select auth.uid())
  )
  returning * into payout;

  update public.affiliate_commissions c
  set status = 'paid', payout_id = payout.id
  where c.affiliate_id = affiliate and c.status = 'pending' and c.available_at <= now();

  if bulbs is not null then
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (affiliate, bulbs, 'bonus', 'affiliate_payout');
  end if;

  perform private.notify(affiliate, 'system', 'affiliate_paid',
    jsonb_build_object('amount', due, 'bulbs', bulbs), '/pass/affiliate');
  return payout;
end;
$$;

create function public.record_affiliate_payout(affiliate uuid, reference text default null)
returns public.affiliate_payouts
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.record_affiliate_payout($1, $2) $$;

-- Finance sets the commission rate of each category ({category id: percent}).
create function private.set_affiliate_rates(rates jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry record;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(rates) is distinct from 'object' then
    raise exception 'Invalid rates' using errcode = 'check_violation';
  end if;
  for entry in select key, value from jsonb_each(rates) loop
    update public.product_categories c
    set affiliate_rate = (entry.value #>> '{}')::numeric
    where c.id = entry.key::uuid;
  end loop;
end;
$$;

create function public.set_affiliate_rates(rates jsonb)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.set_affiliate_rates($1) $$;

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
  source text;
  affiliate uuid;
  follower bigint;
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
    source := 'invite';
  end if;

  -- An affiliate's link or code (the last one in 30 days) takes 5% off.
  -- One discount per order: the larger wins, the invite on a tie.
  affiliate := private.order_affiliate(caller);
  if affiliate is not null then
    follower := floor(order_subtotal * 0.05)::bigint;
    if follower > promo then
      promo := follower;
      source := 'affiliate';
    else
      affiliate := null;
    end if;
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
    user_id, status, subtotal, shipping_fee, discount, discount_source, affiliate_id,
    bulbs_used, bulbs_discount, total, shipping_address, fulfilment,
    payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    order_subtotal,
    fee,
    promo,
    case when promo > 0 then source end,
    affiliate,
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

-- ── Earning and clawing back ───────────────────────────────────────────────

-- A delivered order earns its affiliate the category rate on the price after
-- the follower's discount, ready after the 7-day return window. Nothing when
-- the order shares a phone number or address with the affiliate.
create function private.earn_affiliate_commission(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivered public.orders;
  earned bigint;
begin
  select * into delivered from public.orders o where o.id = target;
  if delivered.affiliate_id is null or delivered.subtotal = 0
    or private.order_shares_contact(target, delivered.affiliate_id)
  then
    return;
  end if;

  select floor(
    coalesce(sum(i.unit_price * i.quantity * coalesce(c.affiliate_rate, 3)), 0)
    * (delivered.subtotal - delivered.discount) / delivered.subtotal / 100
  )::bigint
  into earned
  from public.order_items i
  left join public.products p on p.id = i.product_id
  left join public.product_categories c on c.id = p.category_id
  where i.order_id = target;

  if earned > 0 then
    insert into public.affiliate_commissions (affiliate_id, kind, amount, available_at, order_id)
    values (delivered.affiliate_id, 'order', earned, now() + interval '7 days', target)
    on conflict do nothing;
  end if;
end;
$$;

-- A refund takes the commission back: voided while unpaid, otherwise
-- deducted from the next payout.
create function private.claw_back_commission(target_order uuid, target_payment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  earned public.affiliate_commissions;
begin
  select * into earned from public.affiliate_commissions c
  where c.kind in ('order', 'plus')
    and (c.order_id = target_order or c.payment_id = target_payment)
  for update;
  if earned.id is null or earned.status = 'void' then
    return;
  end if;
  if earned.status = 'pending' then
    update public.affiliate_commissions set status = 'void' where id = earned.id;
  else
    insert into public.affiliate_commissions (affiliate_id, kind, amount, order_id, payment_id)
    values (earned.affiliate_id, 'clawback', -earned.amount, earned.order_id, earned.payment_id)
    on conflict do nothing;
  end if;
end;
$$;

create function private.on_order_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.affiliate_id is null or new.status is not distinct from old.status then
    return null;
  end if;
  if new.status = 'delivered' then
    perform private.earn_affiliate_commission(new.id);
  elsif new.status in ('cancelled', 'refunded') then
    perform private.claw_back_commission(new.id, null);
  end if;
  return null;
end;
$$;

create trigger affiliate_on_order
  after update of status on public.orders
  for each row execute function private.on_order_affiliate();

-- A new Plus member brought by an affiliate (last link or code in the 30
-- days before their first Plus payment) earns the affiliate 20% of their
-- first 3 months: the first 3 monthly payments, or a quarter of a yearly one.
create function private.on_payment_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions;
  plan public.plans;
  paid_before integer;
  earned bigint;
begin
  if new.subscription_id is null then
    return null;
  end if;

  if new.status = 'refunded' and tg_op = 'UPDATE' and old.status is distinct from 'refunded' then
    perform private.claw_back_commission(null, new.id);
    return null;
  end if;
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return null;
  end if;

  select * into sub from public.subscriptions s where s.id = new.subscription_id for update;
  select * into plan from public.plans p where p.id = sub.plan_id;
  if sub.user_id is null or plan.audience is distinct from 'plus' then
    return null;
  end if;

  -- Payments of this membership paid before this one.
  select count(*) into paid_before from public.payments p
  where p.subscription_id = sub.id and p.status in ('paid', 'refunded') and p.id <> new.id
    and (coalesce(p.paid_at, p.created_at), p.id) < (coalesce(new.paid_at, new.created_at), new.id);

  -- Attribute within the first 3 months of the member's first Plus membership.
  if sub.affiliate_id is null and paid_before < 3 and not exists (
    select 1 from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    join public.payments pay on pay.subscription_id = s.id
    where s.user_id = sub.user_id and s.id <> sub.id
      and p.audience = 'plus' and pay.status in ('paid', 'refunded')
  ) then
    sub.affiliate_id := private.order_affiliate(sub.user_id);
    if sub.affiliate_id is not null then
      update public.subscriptions set affiliate_id = sub.affiliate_id where id = sub.id;
    end if;
  end if;

  if sub.affiliate_id is null then
    return null;
  end if;

  earned := case
    when plan.billing_interval = 'month' and paid_before < 3 then floor(new.amount * 0.20)
    when plan.billing_interval = 'year' and paid_before = 0 then floor(new.amount * 0.20 / 4)
    else 0
  end;
  if earned > 0 then
    insert into public.affiliate_commissions (affiliate_id, kind, amount, available_at, payment_id)
    values (sub.affiliate_id, 'plus', earned, now() + interval '7 days', new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger affiliate_on_payment
  after insert or update of status on public.payments
  for each row execute function private.on_payment_affiliate();

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.order_affiliate(uuid) from public, anon, authenticated;
revoke all on function private.affiliate_balance(uuid) from public, anon, authenticated;
revoke all on function private.order_shares_contact(uuid, uuid) from public, anon, authenticated;
revoke all on function private.earn_affiliate_commission(uuid) from public, anon, authenticated;
revoke all on function private.claw_back_commission(uuid, uuid) from public, anon, authenticated;
revoke all on function private.on_order_affiliate() from public, anon, authenticated;
revoke all on function private.on_payment_affiliate() from public, anon, authenticated;

revoke all on function private.apply_affiliate(text, text) from public, anon;
grant execute on function private.apply_affiliate(text, text) to authenticated, service_role;
revoke all on function public.apply_affiliate(text, text) from public, anon;
grant execute on function public.apply_affiliate(text, text) to authenticated, service_role;

revoke all on function private.set_affiliate_payout(public.affiliate_payout_method, text) from public, anon;
grant execute on function private.set_affiliate_payout(public.affiliate_payout_method, text) to authenticated, service_role;
revoke all on function public.set_affiliate_payout(public.affiliate_payout_method, text) from public, anon;
grant execute on function public.set_affiliate_payout(public.affiliate_payout_method, text) to authenticated, service_role;

revoke all on function private.touch_affiliate(text, text) from public, anon;
grant execute on function private.touch_affiliate(text, text) to authenticated, service_role;
revoke all on function public.touch_affiliate(text, text) from public, anon;
grant execute on function public.touch_affiliate(text, text) to authenticated, service_role;

revoke all on function private.my_affiliate_referrer() from public, anon;
grant execute on function private.my_affiliate_referrer() to authenticated, service_role;
revoke all on function public.my_affiliate_referrer() from public, anon;
grant execute on function public.my_affiliate_referrer() to authenticated, service_role;

revoke all on function private.my_affiliate() from public, anon;
grant execute on function private.my_affiliate() to authenticated, service_role;
revoke all on function public.my_affiliate() from public, anon;
grant execute on function public.my_affiliate() to authenticated, service_role;

revoke all on function private.decide_affiliate(uuid, public.affiliate_status, text, text) from public, anon;
grant execute on function private.decide_affiliate(uuid, public.affiliate_status, text, text) to authenticated, service_role;
revoke all on function public.decide_affiliate(uuid, public.affiliate_status, text, text) from public, anon;
grant execute on function public.decide_affiliate(uuid, public.affiliate_status, text, text) to authenticated, service_role;

revoke all on function private.affiliate_balances() from public, anon;
grant execute on function private.affiliate_balances() to authenticated, service_role;
revoke all on function public.affiliate_balances() from public, anon;
grant execute on function public.affiliate_balances() to authenticated, service_role;

revoke all on function private.record_affiliate_payout(uuid, text) from public, anon;
grant execute on function private.record_affiliate_payout(uuid, text) to authenticated, service_role;
revoke all on function public.record_affiliate_payout(uuid, text) from public, anon;
grant execute on function public.record_affiliate_payout(uuid, text) to authenticated, service_role;

revoke all on function private.set_affiliate_rates(jsonb) from public, anon;
grant execute on function private.set_affiliate_rates(jsonb) to authenticated, service_role;
revoke all on function public.set_affiliate_rates(jsonb) from public, anon;
grant execute on function public.set_affiliate_rates(jsonb) to authenticated, service_role;
