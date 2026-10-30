-- Affiliates, back in Partners (owner, 30 October 2026): an organization
-- adds Affiliate from Home, applies, and once The IDEA approves it gets a
-- code (and the link theideaiq.com/a/<code>) that takes 5% off a
-- follower's order. The rules are the ones affiliates had before v2:
--
-- * The code is a coupon (`coupons`, 5% off, once per member), so checkout
--   treats it like any other: within the giveaway cap, and only when it
--   takes more off than an invite. `affiliates.coupon_id` says whose it is.
-- * Commission on an order placed with the code, once it is delivered:
--   per category family (`affiliate_rates`, finance sets them): 8% on
--   music, books, films and board games, 3% on games, gear and trading
--   cards, 20% on Plus months. It becomes payable after the return window;
--   a cancelled or refunded order voids it (or claws it back once paid).
-- * Payouts monthly from 25,000 IQD to the method the organization chose
--   (ZainCash, FIB, Qi or bank); finance records each one.

-- ── The feature ────────────────────────────────────────────────────────────

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'team', 'developers', 'selling', 'supply', 'opportunities', 'affiliate']::text[]);

-- ── Affiliates ─────────────────────────────────────────────────────────────

create type public.affiliate_status as enum ('applied', 'approved', 'rejected', 'suspended');

create table public.affiliates (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  status public.affiliate_status not null default 'applied',
  -- Where and how it will share the code.
  pitch text not null check (char_length(pitch) between 10 and 1000),
  channel text check (char_length(channel) <= 300),
  -- Set on approval: the code (as the coupon's) and its coupon.
  code text unique check (code ~ '^[A-Z0-9]{4,20}$'),
  coupon_id uuid unique references public.coupons (id) on delete set null,
  payout_method text check (payout_method in ('zaincash', 'fib', 'qi', 'bank')),
  payout_account text check (char_length(payout_account) <= 120),
  staff_note text check (char_length(staff_note) <= 1000),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'approved' or (code is not null and coupon_id is not null))
);

comment on table public.affiliates is
  'Organizations that share The IDEA for a commission: their application, code and payout details.';

create index affiliates_status_idx on public.affiliates (status, created_at desc);
create index affiliates_decided_by_idx on public.affiliates (decided_by);

create trigger set_updated_at before update on public.affiliates
  for each row execute function private.set_updated_at();

alter table public.affiliates enable row level security;

create policy "Members and finance see affiliates" on public.affiliates
  for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.has_staff_role('{finance,marketing}'::public.staff_role[]))
  );

revoke all on public.affiliates from anon, authenticated;
grant select on public.affiliates to authenticated;

-- ── Rates ──────────────────────────────────────────────────────────────────

create table public.affiliate_rates (
  -- A top-level category's slug, or 'plus' for Plus months.
  family text primary key check (family ~ '^[a-z-]{2,40}$'),
  rate numeric(4, 2) not null check (rate >= 0 and rate <= 30),
  updated_at timestamptz not null default now()
);

comment on table public.affiliate_rates is
  'Commission per category family (top-level category slug, or plus), in percent; finance sets them.';

alter table public.affiliate_rates enable row level security;

create policy "Anyone reads affiliate rates" on public.affiliate_rates
  for select to anon, authenticated
  using (true);

create policy "Finance sets affiliate rates" on public.affiliate_rates
  for update to authenticated
  using ((select private.has_staff_role('{finance}'::public.staff_role[])))
  with check ((select private.has_staff_role('{finance}'::public.staff_role[])));

revoke all on public.affiliate_rates from anon, authenticated;
grant select on public.affiliate_rates to anon, authenticated;
grant update (rate) on public.affiliate_rates to authenticated;

insert into public.affiliate_rates (family, rate) values
  ('music', 8), ('books', 8), ('films', 8), ('board-games', 8),
  ('games', 3), ('gear', 3), ('trading-cards', 3),
  ('plus', 20);

-- ── Commissions and payouts ────────────────────────────────────────────────

create type public.affiliate_commission_status as enum ('pending', 'void', 'paid');

create table public.affiliate_payouts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.affiliates (organization_id) on delete cascade,
  amount bigint not null check (amount > 0),
  method text not null check (method in ('zaincash', 'fib', 'qi', 'bank')),
  account text check (char_length(account) <= 120),
  reference text not null check (char_length(reference) between 1 and 200),
  paid_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.affiliate_payouts is
  'What finance paid an affiliate, with the transfer reference.';

create index affiliate_payouts_org_idx on public.affiliate_payouts (organization_id, created_at desc);
create index affiliate_payouts_paid_by_idx on public.affiliate_payouts (paid_by);

alter table public.affiliate_payouts enable row level security;

create policy "Members and finance see payouts" on public.affiliate_payouts
  for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.has_staff_role('{finance}'::public.staff_role[]))
  );

revoke all on public.affiliate_payouts from anon, authenticated;
grant select on public.affiliate_payouts to authenticated;

create table public.affiliate_commissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.affiliates (organization_id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  -- Negative for a clawback of a paid commission whose order was refunded.
  amount bigint not null check (amount <> 0),
  status public.affiliate_commission_status not null default 'pending',
  -- Payable from here (the return window after delivery).
  available_at timestamptz not null,
  payout_id uuid references public.affiliate_payouts (id) on delete set null,
  clawback_of uuid references public.affiliate_commissions (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.affiliate_commissions is
  'An affiliate''s commission on one order (and a clawback when a paid one''s order is refunded).';

create unique index affiliate_commissions_order_idx on public.affiliate_commissions (order_id) where clawback_of is null;
create unique index affiliate_commissions_clawback_idx on public.affiliate_commissions (clawback_of) where clawback_of is not null;
create index affiliate_commissions_org_idx on public.affiliate_commissions (organization_id, created_at desc);
create index affiliate_commissions_payout_idx on public.affiliate_commissions (payout_id);

alter table public.affiliate_commissions enable row level security;

create policy "Members and finance see commissions" on public.affiliate_commissions
  for select to authenticated
  using (
    (select private.is_org_member(organization_id))
    or (select private.has_staff_role('{finance}'::public.staff_role[]))
  );

revoke all on public.affiliate_commissions from anon, authenticated;
grant select on public.affiliate_commissions to authenticated;

-- ── Applying and deciding ──────────────────────────────────────────────────

-- An organization's owner or admin applies (again after a refusal), with
-- how it will share the code and where to be paid.
create function private.apply_affiliate(
  org uuid,
  pitch text,
  channel text,
  payout_method text,
  payout_account text
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current public.affiliates;
begin
  if not private.has_org_role(org, '{owner,admin}'::public.org_role[]) then
    raise exception 'Only the organization''s owners and admins apply' using errcode = 'insufficient_privilege';
  end if;
  select * into current from public.affiliates a where a.organization_id = org;
  if current.status in ('approved', 'suspended') then
    -- Approved: only the payout details change.
    update public.affiliates a
    set payout_method = apply_affiliate.payout_method,
        payout_account = left(apply_affiliate.payout_account, 120)
    where a.organization_id = org;
    return;
  end if;
  insert into public.affiliates (organization_id, pitch, channel, payout_method, payout_account)
  values (org, trim(pitch), nullif(trim(channel), ''), apply_affiliate.payout_method, left(apply_affiliate.payout_account, 120))
  on conflict on constraint affiliates_pkey do update
    set status = 'applied', pitch = excluded.pitch, channel = excluded.channel,
        payout_method = excluded.payout_method, payout_account = excluded.payout_account,
        staff_note = null, decided_by = null, decided_at = null;
end;
$$;

create function public.apply_affiliate(
  org uuid,
  pitch text,
  channel text default null,
  payout_method text default null,
  payout_account text default null
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.apply_affiliate(org, pitch, channel, payout_method, payout_account) $$;

-- Marketing or finance approve (with the code), refuse, suspend or
-- restore an affiliate. Approving makes the 5% coupon; suspending turns it
-- off.
create function private.decide_affiliate(
  org uuid,
  decision public.affiliate_status,
  code text default null,
  note text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  current public.affiliates;
  coupon uuid;
  name text;
begin
  if not private.has_staff_role('{marketing,finance}'::public.staff_role[]) then
    raise exception 'Only marketing and finance decide on affiliates' using errcode = 'insufficient_privilege';
  end if;
  select * into current from public.affiliates a where a.organization_id = org for update;
  if current.organization_id is null then
    raise exception 'No such affiliate' using errcode = 'no_data_found';
  end if;

  if decision = 'approved' then
    coupon := current.coupon_id;
    if coupon is null then
      if code is null or upper(code) !~ '^[A-Z0-9]{4,20}$' then
        raise exception 'A code of 4 to 20 letters and digits' using errcode = 'check_violation';
      end if;
      select o.name into name from public.organizations o where o.id = org;
      insert into public.coupons (code, description, kind, amount, uses_per_member, created_by)
      values (upper(code), left('Affiliate: ' || name, 300), 'percent', 5, 1, (select auth.uid()))
      returning id into coupon;
    else
      update public.coupons set active = true where id = coupon;
    end if;
    update public.affiliates a
    set status = 'approved',
        code = (select c.code from public.coupons c where c.id = coupon),
        coupon_id = coupon, staff_note = note,
        decided_by = (select auth.uid()), decided_at = now()
    where a.organization_id = org;
  elsif decision in ('rejected', 'suspended') then
    if current.coupon_id is not null then
      update public.coupons set active = false where id = current.coupon_id;
    end if;
    update public.affiliates a
    set status = decision, staff_note = note,
        decided_by = (select auth.uid()), decided_at = now()
    where a.organization_id = org;
  else
    raise exception 'Approve, refuse or suspend' using errcode = 'check_violation';
  end if;

  perform private.notify(m.user_id, 'system', 'affiliate_' || decision::text,
    jsonb_build_object('code', (select a.code from public.affiliates a where a.organization_id = org)),
    '/business/affiliate')
  from public.organization_members m
  where m.organization_id = org and m.role in ('owner', 'admin');
end;
$$;

create function public.decide_affiliate(
  org uuid,
  decision public.affiliate_status,
  code text default null,
  note text default null
)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.decide_affiliate(org, decision, code, note) $$;

-- ── Earning ────────────────────────────────────────────────────────────────

-- The commission on an order: each line's paid amount (its share of what
-- the order took off) times its family's rate.
create function private.affiliate_commission(target uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  with lines as (
    select
      i.unit_price * i.quantity as amount,
      case
        when i.kind = 'plus' then 'plus'
        else coalesce(parent.slug, c.slug)
      end as family
    from public.order_items i
    left join public.products p on p.id = i.product_id
    left join public.product_categories c on c.id = p.category_id
    left join public.product_categories parent on parent.id = c.parent_id
    where i.order_id = target and i.kind in ('sale', 'plus') and i.refunded_at is null
  ),
  totals as (
    select sum(amount) as goods from lines
  )
  select coalesce(floor(sum(
    lines.amount
    * (1 - least(o.discount + o.bulbs_discount, totals.goods)::numeric / nullif(totals.goods, 0))
    * coalesce(r.rate, 0) / 100
  ))::bigint, 0)
  from lines
  cross join totals
  join public.orders o on o.id = target
  left join public.affiliate_rates r on r.family = lines.family
$$;

create function private.on_order_affiliate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affiliate public.affiliates;
  earned bigint;
  paid public.affiliate_commissions;
begin
  if new.coupon_id is null or new.status is not distinct from old.status then
    return null;
  end if;
  select * into affiliate from public.affiliates a where a.coupon_id = new.coupon_id;
  if affiliate.organization_id is null then
    return null;
  end if;

  if new.status = 'delivered' and affiliate.status = 'approved' then
    earned := private.affiliate_commission(new.id);
    if earned > 0 then
      insert into public.affiliate_commissions (organization_id, order_id, amount, available_at)
      values (affiliate.organization_id, new.id, earned, now() + private.return_window())
      on conflict do nothing;
    end if;
  elsif new.status in ('cancelled', 'refunded') then
    update public.affiliate_commissions c set status = 'void'
    where c.order_id = new.id and c.clawback_of is null and c.status = 'pending';
    select * into paid from public.affiliate_commissions c
    where c.order_id = new.id and c.clawback_of is null and c.status = 'paid';
    if paid.id is not null then
      insert into public.affiliate_commissions (organization_id, order_id, amount, available_at, clawback_of)
      values (paid.organization_id, new.id, -paid.amount, now(), paid.id)
      on conflict do nothing;
    end if;
  end if;
  return null;
end;
$$;

create trigger affiliate_on_order
  after update of status on public.orders
  for each row execute function private.on_order_affiliate();

-- ── Balances and payouts ───────────────────────────────────────────────────

-- What each affiliate is owed now (payable commissions less clawbacks),
-- and what is still waiting for the return window. Finance only.
create function private.affiliate_balances()
returns table (
  organization_id uuid,
  name text,
  code text,
  payable bigint,
  waiting bigint,
  payout_method text,
  payout_account text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}'::public.staff_role[]) then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  return query
  select a.organization_id, o.name, a.code,
    coalesce(sum(c.amount) filter (where c.status = 'pending' and c.available_at <= now()), 0)::bigint,
    coalesce(sum(c.amount) filter (where c.status = 'pending' and c.available_at > now()), 0)::bigint,
    a.payout_method, a.payout_account
  from public.affiliates a
  join public.organizations o on o.id = a.organization_id
  left join public.affiliate_commissions c on c.organization_id = a.organization_id
  group by a.organization_id, o.name, a.code, a.payout_method, a.payout_account
  having coalesce(sum(c.amount) filter (where c.status = 'pending'), 0) <> 0
  order by 4 desc;
end;
$$;

create function public.affiliate_balances()
returns table (
  organization_id uuid,
  name text,
  code text,
  payable bigint,
  waiting bigint,
  payout_method text,
  payout_account text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.affiliate_balances() $$;

-- Finance records a payout of everything payable (from 25,000 IQD) with
-- the transfer reference; the commissions it covers are marked paid.
create function private.record_affiliate_payout(org uuid, reference text)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  affiliate public.affiliates;
  total bigint;
  payout uuid;
begin
  if not private.has_staff_role('{finance}'::public.staff_role[]) then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  select * into affiliate from public.affiliates a where a.organization_id = org for update;
  if affiliate.payout_method is null then
    raise exception 'No payout details yet' using errcode = 'check_violation';
  end if;
  select coalesce(sum(c.amount), 0) into total
  from public.affiliate_commissions c
  where c.organization_id = org and c.status = 'pending' and c.available_at <= now();
  if total < 25000 then
    raise exception 'Payouts start at 25,000 IQD' using errcode = 'check_violation';
  end if;
  if nullif(trim(coalesce(reference, '')), '') is null then
    raise exception 'The transfer reference' using errcode = 'check_violation';
  end if;

  insert into public.affiliate_payouts (organization_id, amount, method, account, reference, paid_by)
  values (org, total, affiliate.payout_method, affiliate.payout_account, left(trim(reference), 200), (select auth.uid()))
  returning id into payout;
  update public.affiliate_commissions c set status = 'paid', payout_id = payout
  where c.organization_id = org and c.status = 'pending' and c.available_at <= now();

  perform private.notify(m.user_id, 'system', 'affiliate_paid',
    jsonb_build_object('amount', total), '/business/affiliate')
  from public.organization_members m
  where m.organization_id = org and m.role in ('owner', 'admin');
  return payout;
end;
$$;

create function public.record_affiliate_payout(org uuid, reference text)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$ select private.record_affiliate_payout(org, reference) $$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.affiliate_commission(uuid) from public, anon, authenticated;
revoke all on function private.on_order_affiliate() from public, anon, authenticated;

revoke all on function private.apply_affiliate(uuid, text, text, text, text) from public, anon;
grant execute on function private.apply_affiliate(uuid, text, text, text, text) to authenticated;
revoke all on function public.apply_affiliate(uuid, text, text, text, text) from public, anon;
grant execute on function public.apply_affiliate(uuid, text, text, text, text) to authenticated;

revoke all on function private.decide_affiliate(uuid, public.affiliate_status, text, text) from public, anon;
grant execute on function private.decide_affiliate(uuid, public.affiliate_status, text, text) to authenticated;
revoke all on function public.decide_affiliate(uuid, public.affiliate_status, text, text) from public, anon;
grant execute on function public.decide_affiliate(uuid, public.affiliate_status, text, text) to authenticated;

revoke all on function private.affiliate_balances() from public, anon;
grant execute on function private.affiliate_balances() to authenticated;
revoke all on function public.affiliate_balances() from public, anon;
grant execute on function public.affiliate_balances() to authenticated;

revoke all on function private.record_affiliate_payout(uuid, text) from public, anon;
grant execute on function private.record_affiliate_payout(uuid, text) to authenticated;
revoke all on function public.record_affiliate_payout(uuid, text) from public, anon;
grant execute on function public.record_affiliate_payout(uuid, text) to authenticated;
