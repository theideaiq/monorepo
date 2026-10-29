-- Get offers from shops: the item behind each of a shop's offers. Shops
-- never read `sell_requests` (it names the member); once a request is no
-- longer open, `open_sell_requests` leaves it out, so a shop with an offer
-- on it reads what the offer is for here: the item, its photos and area,
-- the member's first name and where the request stands.

create function private.shop_sell_offer_items(seller uuid)
returns table (
  offer_id uuid,
  request_id uuid,
  number bigint,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  first_name text,
  request_status public.sell_request_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, r.id, r.number, r.title, r.condition, r.description, r.photos,
    r.governorate, private.first_name(r.user_id), r.status
  from public.sell_offers o
  join public.sell_requests r on r.id = o.request_id
  where o.seller_id = seller and private.can_see_seller(seller)
    and o.created_at > now() - interval '30 days'
  order by o.created_at desc
  limit 100;
$$;

create function public.shop_sell_offer_items(seller uuid)
returns table (
  offer_id uuid,
  request_id uuid,
  number bigint,
  title text,
  condition public.product_condition,
  description text,
  photos text[],
  governorate text,
  first_name text,
  request_status public.sell_request_status
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.shop_sell_offer_items(seller) $$;

revoke all on function private.shop_sell_offer_items(uuid) from public, anon;
revoke all on function public.shop_sell_offer_items(uuid) from public, anon;
grant execute on function private.shop_sell_offer_items(uuid) to authenticated;
grant execute on function public.shop_sell_offer_items(uuid) to authenticated;
