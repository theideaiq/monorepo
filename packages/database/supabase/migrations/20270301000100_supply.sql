-- Supply (28 October brief, step 13): supplier shops lend copies to the
-- Plus pool and kit units to game nights. The IDEA runs the rentals and
-- bookings; the supplier is owed a fee each time one of its copies goes out
-- on a rental and each time one of its kit units goes out on a booking,
-- paid with its weekly payout and listed in Partners → Supply.
--
-- Staff set each supplier's fees (`supply_terms`, an approved shop only)
-- and record the copies and units it hands over (`stock_items.seller_id`,
-- `kit_units.seller_id`). A fee is earned when a rental holding the copy
-- starts (`rentals` status `active`) or the unit goes out (`kit_bookings`
-- status `out`), at the fee in force then; once per rental or booking.

-- ── Terms ──────────────────────────────────────────────────────────────────

create table public.supply_terms (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  rental_fee bigint not null default 0 check (rental_fee >= 0),
  kit_fee bigint not null default 0 check (kit_fee >= 0),
  active boolean not null default true,
  note text check (char_length(note) <= 1000),
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.supply_terms is
  'A supplier shop''s fees: per Plus or single rental of one of its copies and per kit booking of one of its units.';

create index supply_terms_updated_by_idx on public.supply_terms (updated_by);

create trigger set_updated_at before update on public.supply_terms
  for each row execute function private.set_updated_at();

alter table public.supply_terms enable row level security;

create policy "Supplier owners and staff read supply terms"
  on public.supply_terms for select to authenticated
  using (
    (select private.has_staff_role('{admin}'))
    or (select private.has_org_role(
      (select s.organization_id from public.sellers s where s.id = seller_id),
      '{owner,admin}'
    ))
  );

grant select on public.supply_terms to authenticated;

-- ── Kit units ──────────────────────────────────────────────────────────────

alter table public.kit_units
  add column seller_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.sellers (id);

create index kit_units_seller_id_idx on public.kit_units (seller_id);

comment on column public.kit_units.seller_id is
  'Who owns the unit: The IDEA, or a supplier shop that lends it.';

-- ── Earnings ───────────────────────────────────────────────────────────────

create table public.supply_earnings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  kind text not null check (kind in ('rental', 'kit')),
  rental_id uuid references public.rentals (id) on delete set null,
  stock_item_id uuid references public.stock_items (id) on delete set null,
  kit_booking_id uuid references public.kit_bookings (id) on delete set null,
  kit_unit_id uuid references public.kit_units (id) on delete set null,
  -- What the line says on the statement (the title or the kit).
  label text not null check (char_length(label) between 1 and 200),
  fee bigint not null check (fee >= 0),
  earned_on date not null default (now() at time zone 'Asia/Baghdad')::date,
  -- The payout line that paid it; cleared when that payout is cancelled.
  payout_line_id uuid references public.payout_lines (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.supply_earnings is
  'A fee a supplier shop earned: one of its copies rented out, or one of its kit units booked.';

create unique index supply_earnings_rental_idx on public.supply_earnings (rental_id, stock_item_id)
  where kind = 'rental';
create unique index supply_earnings_kit_idx on public.supply_earnings (kit_booking_id)
  where kind = 'kit';
create index supply_earnings_seller_idx on public.supply_earnings (seller_id, earned_on);
create index supply_earnings_rental_id_idx on public.supply_earnings (rental_id);
create index supply_earnings_stock_item_id_idx on public.supply_earnings (stock_item_id);
create index supply_earnings_kit_booking_id_idx on public.supply_earnings (kit_booking_id);
create index supply_earnings_kit_unit_id_idx on public.supply_earnings (kit_unit_id);
create index supply_earnings_payout_line_id_idx on public.supply_earnings (payout_line_id);

alter table public.supply_earnings enable row level security;

create policy "Supplier owners and staff read supply earnings"
  on public.supply_earnings for select to authenticated
  using (
    (select private.has_staff_role('{finance}'))
    or (select private.has_org_role(
      (select s.organization_id from public.sellers s where s.id = seller_id),
      '{owner,admin}'
    ))
  );

grant select on public.supply_earnings to authenticated;

-- The fee in force for a supplier, or null when it supplies nothing.
create function private.supply_fee(shop uuid, fee_kind text)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case fee_kind when 'rental' then t.rental_fee else t.kit_fee end
  from public.supply_terms t
  join public.sellers s on s.id = t.seller_id
  where t.seller_id = shop and t.active and not s.is_house and s.status = 'approved';
$$;

-- A rental going out (active) earns each supplier whose copy it holds the
-- rental fee. Copies are held from checkout, so a rental cancelled before
-- it starts earns nothing.
create function private.earn_supply_rental()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.supply_earnings (seller_id, kind, rental_id, stock_item_id, label, fee)
  select c.seller_id, 'rental', new.id, c.id, left(new.name_en, 200),
    private.supply_fee(c.seller_id, 'rental')
  from public.stock_items c
  where c.rental_id = new.id
    and coalesce(private.supply_fee(c.seller_id, 'rental'), 0) > 0
  on conflict do nothing;
  return new;
end;
$$;

create trigger earn_supply_rental
  after insert or update of status on public.rentals
  for each row
  when (new.status = 'active')
  execute function private.earn_supply_rental();

-- A supplier's kit unit going out on a booking earns the kit fee.
create function private.earn_supply_kit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  unit public.kit_units;
  fee bigint;
begin
  select * into unit from public.kit_units u where u.id = new.unit_id;
  fee := private.supply_fee(unit.seller_id, 'kit');
  if fee is null or fee = 0 then
    return new;
  end if;
  insert into public.supply_earnings (seller_id, kind, kit_booking_id, kit_unit_id, label, fee)
  values (unit.seller_id, 'kit', new.id, unit.id, left(unit.label, 200), fee)
  on conflict do nothing;
  return new;
end;
$$;

create trigger earn_supply_kit
  after update of status on public.kit_bookings
  for each row
  when (new.status = 'out' and old.status is distinct from 'out')
  execute function private.earn_supply_kit();

-- ── Payouts ────────────────────────────────────────────────────────────────

-- A supply line covers the fees earned up to the end of the period.
alter table public.payout_lines drop constraint payout_lines_check2;
alter table public.payout_lines add constraint payout_lines_covers_until_check
  check ((kind in ('pro_fee', 'supply')) = (covers_until is not null));

create or replace function private.payout_due(shop uuid, period_end date)
returns table (
  kind public.payout_line_kind,
  order_item_id uuid,
  return_id uuid,
  amount bigint,
  covers_until date
)
language sql
stable
security definer
set search_path = ''
as $$
  -- Lines whose return window closed by the end of the period, with no
  -- return still open.
  select 'sale'::public.payout_line_kind, i.id, null::uuid,
    (i.seller_payout * (i.quantity - coalesce(back.quantity, 0)) / i.quantity)::bigint,
    null::date
  from public.order_items i
  join public.orders o on o.id = i.order_id
  left join lateral (
    select sum(r.quantity) as quantity from public.returns r
    where r.order_item_id = i.id and r.status = 'refunded'
  ) back on true
  where i.seller_id = shop
    and i.seller_payout is not null
    and i.seller_status = 'picked_up'
    and i.refunded_at is null
    and o.status <> 'cancelled'
    and private.line_delivered_at(i.id) + interval '14 days' < (period_end + 1)::timestamptz
    and not exists (
      select 1 from public.returns r
      where r.order_item_id = i.id
        and r.status in ('requested', 'disputed', 'approved', 'collecting', 'received', 'refund_due')
    )
    and not exists (
      select 1 from public.payout_lines l where l.kind = 'sale' and l.order_item_id = i.id
    )
  union all
  -- Boxy's fee for collecting a return the shop was at fault for.
  select 'collection_fee', null, r.id, -r.collection_fee, null
  from public.returns r
  where r.seller_id = shop and r.fault = 'shop' and r.collection_fee > 0
    and r.status = 'refunded'
    and not exists (
      select 1 from public.payout_lines l where l.kind = 'collection_fee' and l.return_id = r.id
    )
  union all
  -- The original delivery fee refunded with a return the shop was at fault for.
  select 'delivery_fee', null, r.id, -r.delivery_refund, null
  from public.returns r
  where r.seller_id = shop and r.fault = 'shop' and r.delivery_refund > 0
    and r.status = 'refunded'
    and not exists (
      select 1 from public.payout_lines l where l.kind = 'delivery_fee' and l.return_id = r.id
    )
  union all
  -- The Pro fee, for each monthly or yearly period that has started.
  select 'pro_fee', null, null, -public.seller_plan_price(s.plan_billing),
    (period.starts + step.length)::date
  from public.sellers s
  cross join lateral (
    select case s.plan_billing when 'yearly' then interval '1 year' else interval '1 month' end as length
  ) step
  cross join lateral (
    select coalesce(
      (select max(l.covers_until) from public.payout_lines l
       join public.payouts p on p.id = l.payout_id
       where p.seller_id = s.id and l.kind = 'pro_fee'),
      s.plan_since::date
    ) as starts
  ) due
  cross join lateral generate_series(due.starts::timestamp, period_end::timestamp, step.length) period (starts)
  where s.id = shop and s.plan = 'pro'
  union all
  -- Supply fees earned by the end of the period, in one line (each fee is
  -- on the statement through `supply_earnings`).
  select 'supply', null, null, sum(e.fee)::bigint, period_end
  from public.supply_earnings e
  where e.seller_id = shop and e.payout_line_id is null and e.earned_on <= period_end
  having sum(e.fee) > 0;
$$;

create or replace function private.prepare_payouts(period_end date default current_date)
returns setof public.payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  shop public.sellers;
  total bigint;
  payout public.payouts;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if period_end > current_date then
    raise exception 'A batch can''t pay ahead' using errcode = 'check_violation';
  end if;
  for shop in
    select * from public.sellers s
    where not s.is_house and s.status = 'approved'
    order by s.name
    for update
  loop
    select coalesce(sum(d.amount), 0) into total from private.payout_due(shop.id, period_end) d;
    if total <= 0 then
      continue;
    end if;
    insert into public.payouts (seller_id, period_end, amount, prepared_by)
    values (shop.id, period_end, total, (select auth.uid()))
    returning * into payout;
    insert into public.payout_lines (payout_id, kind, order_item_id, return_id, amount, covers_until)
    select payout.id, d.kind, d.order_item_id, d.return_id, d.amount, d.covers_until
    from private.payout_due(shop.id, period_end) d;
    -- The supply fees in this payout point at its supply line.
    update public.supply_earnings e set payout_line_id = l.id
    from public.payout_lines l
    where l.payout_id = payout.id and l.kind = 'supply'
      and e.seller_id = shop.id and e.payout_line_id is null and e.earned_on <= period_end;
    return next payout;
  end loop;
end;
$$;

-- ── Staff and Partners ─────────────────────────────────────────────────────

-- Staff make an approved shop a supplier, change its fees or stop it.
create function private.set_supply_terms(
  shop uuid,
  rental_fee bigint,
  kit_fee bigint,
  active boolean default true,
  note text default null
)
returns public.supply_terms
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.supply_terms;
begin
  if not private.has_staff_role('{admin}') then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.sellers s where s.id = shop and not s.is_house and s.status = 'approved'
  ) then
    raise exception 'Only an approved shop can supply' using errcode = 'check_violation';
  end if;
  insert into public.supply_terms as t (seller_id, rental_fee, kit_fee, active, note, updated_by)
  values (shop, rental_fee, kit_fee, coalesce(active, true), nullif(trim(note), ''), (select auth.uid()))
  on conflict (seller_id) do update set
    rental_fee = excluded.rental_fee,
    kit_fee = excluded.kit_fee,
    active = excluded.active,
    note = excluded.note,
    updated_by = excluded.updated_by
  returning * into result;
  return result;
end;
$$;

create function public.set_supply_terms(
  shop uuid,
  rental_fee bigint,
  kit_fee bigint,
  active boolean default true,
  note text default null
)
returns public.supply_terms
language sql
set search_path = ''
as $$ select * from private.set_supply_terms(shop, rental_fee, kit_fee, active, note) $$;

-- Partners → Supply: the supplier's copies and kit units with where they
-- are (`stock_items` and `kit_units` are staff-only), for its members.
create function private.supply_items(shop uuid)
returns table (
  kind text,
  id uuid,
  name_ar text,
  name_en text,
  condition text,
  status text,
  rentals bigint,
  earned bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.works_at_seller(shop) or private.has_staff_role('{admin}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select 'copy'::text, c.id, p.name_ar, p.name_en, c.condition::text, c.status::text,
      (select count(*) from public.supply_earnings e where e.stock_item_id = c.id),
      (select coalesce(sum(e.fee), 0)::bigint from public.supply_earnings e where e.stock_item_id = c.id)
    from public.stock_items c
    join public.products p on p.id = c.product_id
    where c.seller_id = shop and c.purpose = 'rental'
    union all
    select 'kit', u.id, u.label, u.label, null, u.status,
      (select count(*) from public.supply_earnings e where e.kit_unit_id = u.id),
      (select coalesce(sum(e.fee), 0)::bigint from public.supply_earnings e where e.kit_unit_id = u.id)
    from public.kit_units u
    where u.seller_id = shop
    order by 1, 4;
end;
$$;

create function public.supply_items(shop uuid)
returns table (
  kind text,
  id uuid,
  name_ar text,
  name_en text,
  condition text,
  status text,
  rentals bigint,
  earned bigint
)
language sql
stable
set search_path = ''
as $$ select * from private.supply_items(shop) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.supply_fee(uuid, text) from public, anon, authenticated;
revoke all on function private.earn_supply_rental() from public, anon, authenticated;
revoke all on function private.earn_supply_kit() from public, anon, authenticated;
revoke all on function private.set_supply_terms(uuid, bigint, bigint, boolean, text) from public, anon;
revoke all on function public.set_supply_terms(uuid, bigint, bigint, boolean, text) from public, anon;
revoke all on function private.supply_items(uuid) from public, anon;
revoke all on function public.supply_items(uuid) from public, anon;

grant execute on function private.set_supply_terms(uuid, bigint, bigint, boolean, text) to authenticated;
grant execute on function public.set_supply_terms(uuid, bigint, bigint, boolean, text) to authenticated;
grant execute on function private.supply_items(uuid) to authenticated;
grant execute on function public.supply_items(uuid) to authenticated;
