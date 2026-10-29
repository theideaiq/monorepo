-- Returns: the original delivery fee is refunded when the return isn't
-- the customer's doing (faulty, wrong, not as described, never arrived),
-- as the returns policy says. Once per order: the first such return to
-- fall due carries what's left of the order's delivery fee
-- (`returns.delivery_refund`). A shop at fault pays it back from its
-- next payout (a `delivery_fee` line); The IDEA pays for its own stock and
-- its own mistakes. A change of mind gets no delivery fee back, and its
-- collection fee still comes out of the refund.

alter table public.returns
  add column delivery_refund bigint not null default 0 check (delivery_refund >= 0);

comment on column public.returns.delivery_refund is
  'The original delivery fee refunded with this return (in refund_amount), when it wasn''t the customer''s doing.';

-- What's left of the order's delivery fee for a return that isn't the
-- customer's doing: nothing once another return of the order carried it.
create function private.return_delivery_refund(ret public.returns)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select case when ret.fault is null or ret.fault = 'customer' then 0 else greatest(
    o.shipping_fee - coalesce((
      select sum(r.delivery_refund) from public.returns r
      where r.order_id = ret.order_id and r.id <> ret.id
    ), 0),
    0
  ) end
  from public.orders o
  where o.id = ret.order_id;
$$;

revoke all on function private.return_delivery_refund(public.returns) from public, anon, authenticated;

-- The refund falls due: the goods' share as before, plus the delivery fee
-- when it wasn't the customer's doing.
create or replace function private.make_refund_due(target uuid)
returns public.returns
language plpgsql
security definer
set search_path = ''
as $$
declare
  ret public.returns;
  refund record;
  delivery bigint;
  earned integer;
  line_share numeric;
begin
  select * into ret from public.returns r where r.id = target for update;
  select * into refund from private.return_refund(ret);
  delivery := coalesce(private.return_delivery_refund(ret), 0);

  update public.returns set
    status = 'refund_due',
    refund_amount = refund.amount + delivery,
    delivery_refund = delivery,
    refund_bulbs = refund.bulbs,
    refund_due_at = now()
  where id = target
  returning * into ret;

  if ret.user_id is not null then
    if refund.bulbs > 0 then
      insert into public.bulb_entries (user_id, amount, kind, order_id, reason)
      values (ret.user_id, refund.bulbs, 'return', ret.order_id, 'return ' || ret.number);
    end if;
    -- The cashback earned on what came back.
    select coalesce(sum(e.amount), 0)::integer into earned from public.bulb_entries e
    where e.order_id = ret.order_id and e.kind = 'purchase' and e.status <> 'void';
    select (i.unit_price * ret.quantity)::numeric / nullif(o.subtotal, 0) into line_share
    from public.order_items i join public.orders o on o.id = i.order_id
    where i.id = ret.order_item_id;
    earned := round(earned * coalesce(line_share, 0))::integer;
    if earned > 0 then
      insert into public.bulb_entries (user_id, amount, kind, order_id, reason)
      values (ret.user_id, -earned, 'return', ret.order_id, 'cashback on return ' || ret.number);
    end if;
  end if;
  return ret;
end;
$$;

-- ── Payouts ────────────────────────────────────────────────────────────────

alter table public.payout_lines
  drop constraint payout_lines_check1,
  add constraint payout_lines_return_check
    check ((kind in ('collection_fee', 'delivery_fee')) = (return_id is not null));

create unique index payout_lines_delivery_idx on public.payout_lines (return_id) where kind = 'delivery_fee';

-- What a shop is owed, now less the delivery fees it pays back.
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
  where s.id = shop and s.plan = 'pro';
$$;
