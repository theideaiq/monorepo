-- Listings, part 1b: what Partners → Selling → Listings shows. Shops can't
-- read copies (`stock_items` is staff-only), so `seller_listings()` gives a
-- shop's members each offer with its product and how many copies are
-- available and sold.

create function private.seller_listings(listing_seller uuid)
returns table (
  offer_id uuid,
  product_id uuid,
  variant_id uuid,
  slug text,
  name_en text,
  name_ar text,
  product_status public.product_status,
  barcode text,
  condition public.product_condition,
  price bigint,
  sku text,
  active boolean,
  available integer,
  sold integer,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id, p.id, v.id, p.slug, p.name_en, p.name_ar, p.status, v.barcode,
    o.condition, o.price, o.sku, o.active,
    count(s.id) filter (where s.status = 'available')::integer,
    count(s.id) filter (where s.status = 'sold')::integer,
    o.updated_at
  from public.seller_offers o
  join public.product_variants v on v.id = o.variant_id
  join public.products p on p.id = v.product_id
  left join public.stock_items s
    on s.seller_id = o.seller_id and s.variant_id = o.variant_id
    and s.condition = o.condition and s.purpose = 'sale'
  where o.seller_id = listing_seller
    and private.can_see_seller(listing_seller)
  group by o.id, p.id, v.id
  order by o.updated_at desc;
$$;

create function public.seller_listings(listing_seller uuid)
returns table (
  offer_id uuid,
  product_id uuid,
  variant_id uuid,
  slug text,
  name_en text,
  name_ar text,
  product_status public.product_status,
  barcode text,
  condition public.product_condition,
  price bigint,
  sku text,
  active boolean,
  available integer,
  sold integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.seller_listings(listing_seller) $$;

revoke all on function private.seller_listings(uuid) from public, anon;
revoke all on function public.seller_listings(uuid) from public, anon;
grant execute on function private.seller_listings(uuid) to authenticated;
grant execute on function public.seller_listings(uuid) to authenticated;
