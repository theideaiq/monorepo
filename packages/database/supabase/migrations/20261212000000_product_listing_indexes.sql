-- Product listings use their indexes.
--
-- The storefront asks for active products of one kind, newest first
-- (status, kind, order by created_at desc), with and without `featured`;
-- the sitemap asks for active products by last update; the back office
-- lists every product newest first. `products_listing_idx` put category_id
-- before created_at, so it couldn't serve the sort without a category
-- filter (category pages filter through the join, not on category_id),
-- and Postgres sorted the whole table instead.

drop index public.products_listing_idx;
create index products_listing_idx
  on public.products (status, kind, created_at desc);

create index products_sitemap_idx
  on public.products (status, updated_at desc);

create index products_created_at_idx
  on public.products (created_at desc);

-- Read the staff check once per query, not once per row.
alter policy "Active products are public; staff see all" on public.products
  using (status = 'active' or (select private.is_staff()));
