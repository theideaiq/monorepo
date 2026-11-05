-- PR 7, A24: shop health. A shop's 90-day score (`sellers.score`, refreshed
-- nightly by `refresh_seller_scores`) and what it is made of, for the shop
-- (Partners → Today) and Staff: order lines due in the 90 days, lines ready
-- late (or still waiting past their due time), lines canceled as out of
-- stock, returns that were the shop's fault, and auction marks Staff judged
-- wrong. The weights are `private.seller_score`'s: a return, a missing item
-- and a wrong mark count twice, a late line once.
--
-- Only people at the shop, and staff, can read it (`private.can_see_seller`);
-- anyone else gets no row.

create function private.shop_health(shop uuid)
returns table (
  lines integer,
  late integer,
  out_of_stock integer,
  shop_returns integer,
  marks_reviewed integer,
  wrong_marks integer,
  score numeric,
  score_updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with line_rows as (
    select i.seller_status, i.ready_by, i.ready_at
    from public.order_items i
    where i.seller_id = shop and i.ready_by > now() - interval '90 days'
  )
  select
    (select count(*)::integer from line_rows),
    (
      select count(*)::integer from line_rows
      where coalesce(ready_at, now()) > ready_by and seller_status <> 'out_of_stock'
    ),
    (select count(*)::integer from line_rows where seller_status = 'out_of_stock'),
    (
      select count(*)::integer from public.returns r
      where r.seller_id = shop and r.fault = 'shop'
        and r.status not in ('requested', 'disputed', 'rejected', 'cancelled')
        and r.created_at > now() - interval '90 days'
    ),
    (
      select count(*)::integer from public.auctions a
      where a.seller_id = shop and a.mark_review is not null
        and a.mark_reviewed_at > now() - interval '90 days'
    ),
    (
      select count(*)::integer from public.auctions a
      where a.seller_id = shop and a.mark_review = 'wrong'
        and a.mark_reviewed_at > now() - interval '90 days'
    ),
    s.score,
    s.score_updated_at
  from public.sellers s
  where s.id = shop and not s.is_house and private.can_see_seller(shop);
$$;

create function public.shop_health(shop uuid)
returns table (
  lines integer,
  late integer,
  out_of_stock integer,
  shop_returns integer,
  marks_reviewed integer,
  wrong_marks integer,
  score numeric,
  score_updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.shop_health(shop) $$;

comment on function public.shop_health(uuid) is
  'A shop''s 90-day score and its parts (lines, late, out of stock, shop-fault returns, reviewed and wrong auction marks), for the shop''s people and staff.';

revoke all on function private.shop_health(uuid) from public, anon;
revoke all on function public.shop_health(uuid) from public, anon;
grant execute on function private.shop_health(uuid) to authenticated;
grant execute on function public.shop_health(uuid) to authenticated;
