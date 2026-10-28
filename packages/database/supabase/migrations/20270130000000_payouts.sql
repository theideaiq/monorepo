-- Selling: weekly payouts to shops (owner's master brief, step 6,
-- section 8). Wayl has no payout API, so finance prepares a batch in Staff,
-- transfers each amount by bank, ZainCash or Qi, and marks it paid.
--
-- * A shop's line is owed once its return window has closed (14 days after
--   delivery) and none of its returns is still open: its payout after
--   commission (`order_items.seller_payout`), less the share of any
--   quantity refunded on a return.
-- * Bulbs a customer spent on a shop's item are The IDEA's discount: the
--   shop is paid as if the price was paid in full (section 16).
-- * Deducted from the same payout: Boxy's fee for a return collected at the
--   shop's fault, and the Pro fee (monthly or yearly) once due.
-- * A batch only pays a shop that is owed more than it owes; anything else
--   waits for the next batch. Each payout keeps a statement line per item.

create type public.payout_status as enum ('pending', 'paid', 'cancelled');
create type public.payout_line_kind as enum ('sale', 'collection_fee', 'pro_fee');

create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 1001) unique,
  seller_id uuid not null references public.sellers (id),
  status public.payout_status not null default 'pending',
  -- Items owed up to this day are in this payout.
  period_end date not null,
  amount bigint not null check (amount > 0),
  method text check (method in ('bank', 'zaincash', 'qi')),
  reference text check (char_length(reference) <= 200),
  prepared_by uuid references auth.users (id) on delete set null,
  paid_at timestamptz,
  paid_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'paid' or (paid_at is not null and method is not null and reference is not null))
);

comment on table public.payouts is
  'What The IDEA pays a shop in one batch; finance transfers it and marks it paid. Written only by functions.';

create table public.payout_lines (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null references public.payouts (id) on delete cascade,
  kind public.payout_line_kind not null,
  order_item_id uuid references public.order_items (id) on delete set null,
  return_id uuid references public.returns (id) on delete set null,
  -- Positive for what the shop is owed, negative for what it owes.
  amount bigint not null,
  -- The Pro fee's period ends here.
  covers_until date,
  created_at timestamptz not null default now(),
  check ((kind = 'sale') = (order_item_id is not null)),
  check ((kind = 'collection_fee') = (return_id is not null)),
  check ((kind = 'pro_fee') = (covers_until is not null))
);

comment on table public.payout_lines is
  'A payout''s statement: each line paid, each collection fee and Pro fee deducted.';

-- Each line and each fee is paid or deducted once (a cancelled payout's
-- lines are deleted, so they come back for the next batch).
create unique index payout_lines_sale_idx on public.payout_lines (order_item_id) where kind = 'sale';
create unique index payout_lines_fee_idx on public.payout_lines (return_id) where kind = 'collection_fee';
create index payout_lines_payout_idx on public.payout_lines (payout_id);
create index payouts_seller_idx on public.payouts (seller_id, created_at desc);
create index payouts_status_idx on public.payouts (status) where status = 'pending';
create index payouts_prepared_by_idx on public.payouts (prepared_by);
create index payouts_paid_by_idx on public.payouts (paid_by);

create trigger set_updated_at before update on public.payouts
  for each row execute function private.set_updated_at();

alter table public.payouts enable row level security;
alter table public.payout_lines enable row level security;

create policy "Shops and staff see payouts" on public.payouts
  for select to authenticated
  using ((select private.can_see_seller(seller_id)));

create policy "Shops and staff see payout lines" on public.payout_lines
  for select to authenticated
  using (exists (
    select 1 from public.payouts p
    where p.id = payout_id and (select private.can_see_seller(p.seller_id))
  ));

revoke all on public.payouts, public.payout_lines from anon, authenticated;
grant select on public.payouts, public.payout_lines to authenticated;
grant all on public.payouts, public.payout_lines to service_role;

-- What a shop is owed up to a day, line by line, not yet in a payout.
create function private.payout_due(shop uuid, period_end date)
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
  where s.id = shop and s.plan = 'pro';
$$;

-- Finance prepares a batch: one pending payout per shop owed more than it
-- owes, with its statement.
create function private.prepare_payouts(period_end date default current_date)
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
    return next payout;
  end loop;
end;
$$;

create function public.prepare_payouts(period_end date default current_date)
returns setof public.payouts
language sql
security invoker
set search_path = ''
as $$ select * from private.prepare_payouts(period_end) $$;

-- Finance transferred it: how, and the transfer's reference.
create function private.mark_payout_paid(target uuid, method text, reference text)
returns public.payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  payout public.payouts;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if nullif(trim(reference), '') is null then
    raise exception 'Add the transfer''s reference' using errcode = 'check_violation';
  end if;
  update public.payouts set
    status = 'paid',
    method = mark_payout_paid.method,
    reference = trim(mark_payout_paid.reference),
    paid_at = now(),
    paid_by = (select auth.uid())
  where id = target and status = 'pending'
  returning * into payout;
  if payout.id is null then
    raise exception 'This payout isn''t waiting to be paid' using errcode = 'check_violation';
  end if;
  return payout;
end;
$$;

create function public.mark_payout_paid(target uuid, method text, reference text)
returns public.payouts
language sql
security invoker
set search_path = ''
as $$ select private.mark_payout_paid(target, method, reference) $$;

-- A payout prepared by mistake: its lines go back to the next batch.
create function private.cancel_payout(target uuid)
returns public.payouts
language plpgsql
security definer
set search_path = ''
as $$
declare
  payout public.payouts;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.payouts set status = 'cancelled'
  where id = target and status = 'pending'
  returning * into payout;
  if payout.id is null then
    raise exception 'Only a pending payout can be cancelled' using errcode = 'check_violation';
  end if;
  delete from public.payout_lines where payout_id = target;
  return payout;
end;
$$;

create function public.cancel_payout(target uuid)
returns public.payouts
language sql
security invoker
set search_path = ''
as $$ select private.cancel_payout(target) $$;

-- The table's amount check would reject a cancelled payout's zero, so the
-- amount stays as prepared; its lines are gone.

revoke all on function private.payout_due(uuid, date) from public, anon, authenticated;
revoke all on function private.prepare_payouts(date) from public, anon;
revoke all on function public.prepare_payouts(date) from public, anon;
grant execute on function private.prepare_payouts(date) to authenticated;
grant execute on function public.prepare_payouts(date) to authenticated;
revoke all on function private.mark_payout_paid(uuid, text, text) from public, anon;
revoke all on function public.mark_payout_paid(uuid, text, text) from public, anon;
grant execute on function private.mark_payout_paid(uuid, text, text) to authenticated;
grant execute on function public.mark_payout_paid(uuid, text, text) to authenticated;
revoke all on function private.cancel_payout(uuid) from public, anon;
revoke all on function public.cancel_payout(uuid) from public, anon;
grant execute on function private.cancel_payout(uuid) to authenticated;
grant execute on function public.cancel_payout(uuid) to authenticated;
