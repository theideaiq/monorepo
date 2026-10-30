-- One catalogue for The IDEA Store and The IDEA Plus (owner, 30 Oct).
--
-- * Every game, book and film is bought in the Store and is in Plus too,
--   plan tiers unchanged: a category is in Plus (`in_plus`: Games, Board
--   games, Books with its subcategories, Films), and every product in one
--   is `rentable` (listed in Plus, queueable) whether or not a copy for
--   rent is in yet. Copies for rent still make any product rentable.
-- * Rent-only items become ordinary products: bought once copies for sale
--   come in, rented through Plus meanwhile.
-- * Pictures are mandatory: products without one leave the shelves (back
--   to draft), none goes live without one, a live product that loses its
--   last picture goes back to draft, and a shop's new product without a
--   photo waits as a draft.

-- ── Plus categories ────────────────────────────────────────────────────────

alter table public.product_categories
  add column in_plus boolean not null default false;

comment on column public.product_categories.in_plus is
  'Its products (and those of its subcategories) are in The IDEA Plus as well as the Store.';

update public.product_categories set in_plus = true
where slug in ('games', 'board-games', 'books', 'films');

-- A category in Plus, itself or through its parent.
create function private.category_in_plus(category uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select c.in_plus or coalesce(parent.in_plus, false)
    from public.product_categories c
    left join public.product_categories parent on parent.id = c.parent_id
    where c.id = category
  ), false)
$$;

revoke all on function private.category_in_plus(uuid) from public, anon, authenticated;

-- ── Rentable: a Plus category, a rent-only item or a copy for rent ─────────

create or replace function private.sync_stock_counts(target_product uuid, target_variant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('idea.stock_sync', 'on', true);

  if target_variant is not null then
    update public.product_variants v set
      stock_count = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'sale'
      ),
      rental_stock = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'rental'
      )
    where v.id = target_variant;
  end if;

  update public.products p set
    stock_count = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id
        and v.active
        and s.status = 'available'
        and s.purpose = case when p.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose
    ),
    rental_stock = (
      select count(*) from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.status = 'available' and s.purpose = 'rental'
    ),
    rentable = p.kind = 'rental'
      or private.category_in_plus(p.category_id)
      or exists (
        select 1 from public.stock_items s
        join public.product_variants v on v.id = s.variant_id
        where s.product_id = p.id and v.active and s.purpose = 'rental'
          and s.status in ('available', 'reserved', 'rented', 'repair')
      )
  where p.id = target_product;

  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

comment on column public.products.rentable is
  'In The IDEA Plus (listed, queueable): its category is in Plus, it is a rent-only item, or it has copies for rent. Kept by sync_stock_counts.';

-- A product added to, or moved between, categories.
create function private.on_product_category()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.sync_stock_counts(new.id, null);
  return null;
end;
$$;

create trigger on_product_category
  after insert or update of category_id on public.products
  for each row execute function private.on_product_category();

-- A category put in or taken out of Plus, or moved under another.
create function private.on_category_in_plus()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  product uuid;
begin
  for product in
    select p.id from public.products p
    left join public.product_categories c on c.id = p.category_id
    where p.category_id = new.id or c.parent_id = new.id
  loop
    perform private.sync_stock_counts(product, null);
  end loop;
  return null;
end;
$$;

create trigger on_category_in_plus
  after update of in_plus, parent_id on public.product_categories
  for each row execute function private.on_category_in_plus();

revoke all on function private.on_product_category() from public, anon, authenticated;
revoke all on function private.on_category_in_plus() from public, anon, authenticated;

-- Rent-only items become ordinary products (the kind change recounts them).
update public.products set kind = 'sale' where kind = 'rental';

do $$
declare
  product uuid;
begin
  for product in
    select p.id from public.products p where private.category_in_plus(p.category_id)
  loop
    perform private.sync_stock_counts(product, null);
  end loop;
end;
$$;

-- ── Pictures ───────────────────────────────────────────────────────────────

-- A product with a picture of its own or on one of its variants.
create function private.has_photo(product uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    where p.id = product and cardinality(p.images) > 0
  ) or exists (
    select 1 from public.product_variants v
    where v.product_id = product and cardinality(v.images) > 0
  )
$$;

revoke all on function private.has_photo(uuid) from public, anon, authenticated;

-- Publishing needs a picture; a live product left without one goes back to
-- draft.
create function private.require_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'active' or cardinality(new.images) > 0
    or exists (
      select 1 from public.product_variants v
      where v.product_id = new.id and cardinality(v.images) > 0
    )
  then
    return new;
  end if;
  if old.status <> 'active' then
    raise exception 'Add a picture before publishing' using errcode = 'check_violation';
  end if;
  if new.images is distinct from old.images then
    new.status := 'draft';
  end if;
  return new;
end;
$$;

revoke all on function private.require_photo() from public, anon, authenticated;

create trigger require_photo
  before update of status, images on public.products
  for each row execute function private.require_photo();

update public.products p set status = 'draft'
where p.status = 'active' and not private.has_photo(p.id);

-- A shop's product goes live after its checks only with a photo.
create or replace function private.check_product(checked uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
  twin uuid;
  banned boolean;
  photo boolean := private.has_photo(checked);
begin
  select * into item from public.products p where p.id = checked;

  if item.category_id is null or coalesce(trim(item.name_en), '') = ''
    or coalesce(trim(item.name_ar), '') = '' then
    insert into public.product_checks (product_id, reason) values (checked, 'missing_fields')
    on conflict do nothing;
  end if;

  if not photo then
    insert into public.product_checks (product_id, reason) values (checked, 'missing_photo')
    on conflict do nothing;
  end if;

  select exists (
    select 1 from public.banned_terms b
    where lower(item.name_en || ' ' || item.name_ar || ' ' || coalesce(item.description_en, ''))
      like '%' || lower(b.term) || '%'
  ) into banned;
  if banned then
    insert into public.product_checks (product_id, reason) values (checked, 'banned')
    on conflict do nothing;
  end if;

  select p.id into twin from public.products p
  where p.id <> checked and p.status <> 'archived'
    and p.category_id is not distinct from item.category_id
    and regexp_replace(lower(p.name_en), '[^a-z0-9]+', '', 'g')
      = regexp_replace(lower(item.name_en), '[^a-z0-9]+', '', 'g')
  limit 1;
  if twin is not null then
    insert into public.product_checks (product_id, reason, other_product_id)
    values (checked, 'duplicate', twin)
    on conflict do nothing;
  end if;

  return photo and not banned;
end;
$$;
