-- Return refunds through Wayl (owner's master brief, section 6, step 6):
-- a return paid online is refunded through Wayl's refunds API the day it
-- falls due, instead of finance doing it by hand. apps/api claims the due
-- refunds, calls Wayl, then records the refund; a failed call releases the
-- claim so the next run tries again. Off until finance has tested a partial
-- refund in Wayl's test mode (`store_settings.wayl_return_refunds`); until
-- then, and for cash orders always, finance refunds and marks it in Staff.

alter table public.store_settings
  add column wayl_return_refunds boolean not null default false;

comment on column public.store_settings.wayl_return_refunds is
  'Refund returns of orders paid online through Wayl automatically. Off until a partial refund has been tested in Wayl''s test mode.';

alter table public.returns
  add column refund_claimed_at timestamptz;

comment on column public.returns.refund_claimed_at is
  'When apps/api took the refund to send it through Wayl; a claim older than an hour is taken again.';

-- The due refunds of online orders, claimed so that two runs never send
-- the same refund: the return, the order's Wayl payment and what is left
-- to refund on it, and the text Wayl needs for its reason.
create function public.claim_return_refunds(max_rows integer default 20)
returns table (
  return_id uuid,
  number bigint,
  amount bigint,
  payment_reference text,
  refundable bigint,
  order_number text,
  item_name text,
  reason public.return_reason
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select st.wayl_return_refunds from public.store_settings st) then
    return;
  end if;
  return query
  with due as (
    select r.id
    from public.returns r
    join public.orders o on o.id = r.order_id
    where r.status = 'refund_due' and r.refund_amount > 0
      and o.payment_method = 'online'
      and (r.refund_claimed_at is null or r.refund_claimed_at < now() - interval '1 hour')
    order by r.refund_due_at
    limit greatest(max_rows, 0)
    for update of r skip locked
  ), claimed as (
    update public.returns r set refund_claimed_at = now()
    from due where r.id = due.id
    returning r.*
  )
  select c.id, c.number, c.refund_amount, p.reference_id, p.amount - p.refunded_amount,
    o.number::text, i.name_en, c.reason
  from claimed c
  join public.orders o on o.id = c.order_id
  join public.order_items i on i.id = c.order_item_id
  cross join lateral (
    select x.reference_id, x.amount, x.refunded_amount
    from public.payments x
    where x.order_id = c.order_id and x.provider = 'wayl' and x.paid_at is not null
    order by x.paid_at desc
    limit 1
  ) p;
end;
$$;

-- Wayl took the refund: the return is refunded and the payment remembers
-- how much of it went back.
create function public.record_return_refund(target uuid, reference text)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
begin
  update public.returns set
    status = 'refunded',
    refunded_at = now(),
    refund_reference = left(reference, 200),
    refund_claimed_at = null
  where id = target and status = 'refund_due'
  returning * into ret;
  if ret.id is null then
    return null;
  end if;
  update public.payments p set refunded_amount = p.refunded_amount + ret.refund_amount
  where p.id = (
    select x.id from public.payments x
    where x.order_id = ret.order_id and x.provider = 'wayl' and x.paid_at is not null
    order by x.paid_at desc
    limit 1
  );
  return ret;
end;
$$;

-- Wayl refused or couldn't be reached: the next run tries again (and
-- finance can still refund it by hand meanwhile).
create function public.release_return_refund(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.returns set refund_claimed_at = null
  where id = target and status = 'refund_due';
$$;

revoke all on function public.claim_return_refunds(integer) from public, anon, authenticated;
revoke all on function public.record_return_refund(uuid, text) from public, anon, authenticated;
revoke all on function public.release_return_refund(uuid) from public, anon, authenticated;
grant execute on function public.claim_return_refunds(integer) to service_role;
grant execute on function public.record_return_refund(uuid, text) to service_role;
grant execute on function public.release_return_refund(uuid) to service_role;
