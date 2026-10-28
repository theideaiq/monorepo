-- Selling (item 11), bundles: a shop lists several of its own items as one
-- offer, for example a turntable and 3 records (owner decisions of
-- 2026-10-28, section 1; shop bundles replace boxes).
--
-- * A bundle is a product of its own (created by the shop, live at once
--   and checked like any product a shop creates) whose contents are listed
--   in `bundle_items`: the variants in it and how many of each.
-- * Its contents are the shop's own items: every variant in it must be one
--   the shop has an active offer on, and a bundle can't hold a bundle.
-- * The bundle has its own offer (condition, price, copies, SKU) through
--   `set_offer()`, so carts, orders and payouts treat it like any product.
--   Its copies don't take copies of the items in it; the shop sets how many
--   bundles it has.
-- * Shops never edit a bundle once listed (like any product); they change
--   its offer or pause it with 0 copies.

-- Its own `id` key: with (bundle_id, variant_id) as the primary key,
-- PostgREST would read this table as a second, many-to-many path between
-- products and product_variants and refuse every `products → variants`
-- embed as ambiguous.
create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 20),
  position integer not null default 0,
  unique (bundle_id, variant_id)
);

comment on table public.bundle_items is
  'What a shop''s bundle holds: the variants in it and how many of each.';

create index bundle_items_variant_idx on public.bundle_items (variant_id);

alter table public.bundle_items enable row level security;

-- Visible wherever the bundle is (the products policy decides).
create policy "Bundles show what they hold"
  on public.bundle_items for select to anon, authenticated
  using (exists (select 1 from public.products p where p.id = bundle_id));

revoke all on public.bundle_items from anon, authenticated;
grant select on public.bundle_items to anon, authenticated;

-- The items a bundle is asked to hold, read from `[{variant_id, quantity}]`.
create function private.bundle_contents(items jsonb)
returns table (variant_id uuid, quantity integer, "position" integer)
language sql
immutable
set search_path = ''
as $$
  select (item ->> 'variant_id')::uuid,
         coalesce((item ->> 'quantity')::integer, 1),
         ordinality::integer - 1
  from jsonb_array_elements(items) with ordinality as e (item, ordinality);
$$;

create function private.create_bundle(
  bundle_seller uuid,
  category uuid,
  name_en text,
  name_ar text,
  images text[],
  items jsonb,
  offer_condition public.product_condition,
  offer_price bigint,
  quantity integer,
  offer_sku text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  product uuid;
  variant uuid;
  units integer;
  title_en text := left(trim(coalesce(nullif(trim(name_en), ''), name_ar)), 200);
  title_ar text := left(trim(coalesce(nullif(trim(name_ar), ''), name_en)), 200);
begin
  if not private.can_list_for(bundle_seller) then
    raise exception 'Only owners and admins of an approved shop can list' using errcode = '42501';
  end if;
  if coalesce(title_en, '') = '' then
    raise exception 'A name is required' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(images), 0) > 10 then
    raise exception 'At most 10 photos' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 20 then
    raise exception 'A bundle holds up to 20 items' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from private.bundle_contents(items) c
    where c.variant_id is null or c.quantity not between 1 and 20
  ) or (select count(distinct c.variant_id) from private.bundle_contents(items) c)
      <> (select count(*) from private.bundle_contents(items)) then
    raise exception 'Each item once, 1 to 20 of it' using errcode = 'check_violation';
  end if;
  select coalesce(sum(c.quantity), 0) into units from private.bundle_contents(items) c;
  if units < 2 then
    raise exception 'A bundle holds at least 2 items' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from private.bundle_contents(items) c
    where not exists (
      select 1 from public.seller_offers o
      where o.seller_id = bundle_seller and o.variant_id = c.variant_id and o.active
    )
  ) then
    raise exception 'A bundle holds only items the shop offers' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from private.bundle_contents(items) c
    join public.product_variants v on v.id = c.variant_id
    join public.bundle_items b on b.bundle_id = v.product_id
  ) then
    raise exception 'A bundle can''t hold a bundle' using errcode = 'check_violation';
  end if;

  insert into public.products (
    slug, name_en, name_ar, category_id, images, price, status, created_by_seller
  )
  values (
    private.listing_slug(title_en), title_en, title_ar, category, coalesce(images, '{}'),
    offer_price, 'active', bundle_seller
  )
  returning id into product;

  insert into public.bundle_items (bundle_id, variant_id, quantity, position)
  select product, c.variant_id, c.quantity, c.position from private.bundle_contents(items) c;

  -- Every product gets a default variant on insert; the offer is on it.
  update public.product_variants v set price = offer_price
  where v.product_id = product
  returning v.id into variant;

  if not private.check_product(product) then
    update public.products p set status = 'draft' where p.id = product;
  end if;

  perform private.set_offer(bundle_seller, variant, offer_condition, offer_price, quantity, offer_sku);
  return product;
end;
$$;

create function public.create_bundle(
  bundle_seller uuid,
  category uuid,
  name_en text,
  name_ar text,
  images text[],
  items jsonb,
  offer_condition public.product_condition,
  offer_price bigint,
  quantity integer,
  offer_sku text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_bundle(
    bundle_seller, category, name_en, name_ar, images, items,
    offer_condition, offer_price, quantity, offer_sku
  )
$$;

revoke all on function private.bundle_contents(jsonb) from public;
revoke all on function private.create_bundle(uuid, uuid, text, text, text[], jsonb, public.product_condition, bigint, integer, text) from public, anon;
revoke all on function public.create_bundle(uuid, uuid, text, text, text[], jsonb, public.product_condition, bigint, integer, text) from public, anon;
grant execute on function private.create_bundle(uuid, uuid, text, text, text[], jsonb, public.product_condition, bigint, integer, text) to authenticated;
grant execute on function public.create_bundle(uuid, uuid, text, text, text[], jsonb, public.product_condition, bigint, integer, text) to authenticated;
