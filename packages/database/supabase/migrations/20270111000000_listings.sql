-- Listings, Amazon-style (owner decisions 2026-10-28, section 1), part 1:
-- the schema.
--
-- * Barcodes (ISBN, EAN, UPC) identify a variant for everyone: stored as
--   digits, ISBN-10 as its ISBN-13 (already unique).
-- * A shop's offer (`seller_offers`) is its condition, price, its own SKU
--   and how many it has. `set_offer()` keeps the offer's available copies
--   (`stock_items`) at that quantity and price; sold copies stay as they are.
-- * When nothing matches, a shop creates the product (`create_listing()`):
--   it goes live at once unless it names a banned item, and every new
--   product is checked (required fields, a photo, banned items, likely
--   duplicates). What a check finds goes to Staff → Inbox
--   (`product_checks`).
-- * Shops can't edit products; they flag wrong details (`product_flags`),
--   also for Staff → Inbox.
-- * "Notify me" (`product_alerts`): a Pass asks to hear when a product with
--   no offers gets one; a new available copy tells them once.
--
-- Bundles, plan limits and commission come in later parts.

-- ── Barcodes ────────────────────────────────────────────────────────────────

-- Digits only; an ISBN-10 (9 digits and a check digit or X) becomes its
-- ISBN-13. Null for anything else.
create function private.normalize_barcode(code text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned text := upper(regexp_replace(coalesce(code, ''), '[^0-9Xx]', '', 'g'));
  base text;
  total integer := 0;
begin
  if cleaned ~ '^[0-9]{9}[0-9X]$' then
    base := '978' || left(cleaned, 9);
    for i in 1..12 loop
      total := total + substr(base, i, 1)::integer * (case when i % 2 = 0 then 3 else 1 end);
    end loop;
    return base || ((10 - total % 10) % 10)::text;
  end if;
  if cleaned ~ '^[0-9]{8,14}$' then
    return cleaned;
  end if;
  return null;
end;
$$;

create function private.normalize_variant_barcode()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.barcode is not null then
    new.barcode := private.normalize_barcode(new.barcode);
    if new.barcode is null then
      raise exception 'Invalid barcode' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger normalize_barcode before insert or update of barcode
  on public.product_variants
  for each row execute function private.normalize_variant_barcode();

-- ── Who created a product ───────────────────────────────────────────────────

alter table public.products
  add column created_by_seller uuid references public.sellers (id) on delete set null;

create index products_created_by_seller_idx on public.products (created_by_seller);

-- ── Offers ──────────────────────────────────────────────────────────────────

create table public.seller_offers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  condition public.product_condition not null default 'new',
  price bigint not null check (price >= 250),
  -- The shop's private code for it; barcodes identify the product.
  sku text check (char_length(sku) between 1 and 64),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (seller_id, variant_id, condition)
);

comment on table public.seller_offers is
  'A shop''s offer of one variant in one condition: price, its own SKU, active. Its copies are stock_items.';

create index seller_offers_variant_idx on public.seller_offers (variant_id);
create unique index seller_offers_sku_idx on public.seller_offers (seller_id, sku) where sku is not null;

create trigger set_updated_at before update on public.seller_offers
  for each row execute function private.set_updated_at();

alter table public.seller_offers enable row level security;

-- A shop's members see its offers; staff see all.
create function private.can_see_seller(seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_staff() or exists (
    select 1 from public.sellers s
    where s.id = seller and s.organization_id is not null
      and private.is_org_member(s.organization_id)
  );
$$;

-- Owners and admins of an approved shop manage its listings.
create function private.can_list_for(seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sellers s
    where s.id = seller and s.status = 'approved' and s.organization_id is not null
      and private.has_org_role(s.organization_id, '{owner,admin}')
  );
$$;

create policy "Shops and staff read offers"
  on public.seller_offers for select to authenticated
  using ((select private.can_see_seller(seller_id)));

revoke all on public.seller_offers from anon, authenticated;
grant select on public.seller_offers to authenticated;

-- Creates or changes an offer and keeps its available copies at `quantity`
-- (0 to 999) and its price. Copies already reserved, sold or rented are
-- left alone.
create function private.set_offer(
  offer_seller uuid,
  offer_variant uuid,
  offer_condition public.product_condition,
  offer_price bigint,
  quantity integer,
  offer_sku text default null
)
returns public.seller_offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.seller_offers;
  product uuid;
  have integer;
begin
  if not private.can_list_for(offer_seller) then
    raise exception 'Only owners and admins of an approved shop can list' using errcode = '42501';
  end if;
  if quantity is null or quantity < 0 or quantity > 999 then
    raise exception 'Quantity must be 0 to 999' using errcode = 'check_violation';
  end if;
  select v.product_id into product from public.product_variants v where v.id = offer_variant;
  if product is null then
    raise exception 'Product not found' using errcode = 'no_data_found';
  end if;

  insert into public.seller_offers (seller_id, variant_id, condition, price, sku, active)
  values (offer_seller, offer_variant, offer_condition, offer_price, nullif(trim(offer_sku), ''), true)
  on conflict (seller_id, variant_id, condition) do update
    set price = excluded.price, sku = excluded.sku, active = true
  returning * into saved;

  update public.stock_items s set price = offer_price
  where s.seller_id = offer_seller and s.variant_id = offer_variant
    and s.condition = offer_condition and s.purpose = 'sale' and s.status = 'available';

  select count(*) into have from public.stock_items s
  where s.seller_id = offer_seller and s.variant_id = offer_variant
    and s.condition = offer_condition and s.purpose = 'sale' and s.status = 'available';

  if have < quantity then
    insert into public.stock_items (product_id, variant_id, condition, purpose, status, price, seller_id)
    select product, offer_variant, offer_condition, 'sale', 'available', offer_price, offer_seller
    from generate_series(1, quantity - have);
  elsif have > quantity then
    update public.stock_items s set status = 'retired'
    where s.id in (
      select s2.id from public.stock_items s2
      where s2.seller_id = offer_seller and s2.variant_id = offer_variant
        and s2.condition = offer_condition and s2.purpose = 'sale' and s2.status = 'available'
      order by s2.created_at desc
      limit have - quantity
    );
  end if;

  return saved;
end;
$$;

create function public.set_offer(
  offer_seller uuid,
  offer_variant uuid,
  offer_condition public.product_condition,
  offer_price bigint,
  quantity integer,
  offer_sku text default null
)
returns public.seller_offers
language sql
security invoker
set search_path = ''
as $$ select private.set_offer(offer_seller, offer_variant, offer_condition, offer_price, quantity, offer_sku) $$;

-- The variant a barcode belongs to, with its product (active or the
-- shop's own draft), or nothing.
create function private.find_by_barcode(code text)
returns table (product_id uuid, variant_id uuid, slug text, name_en text, name_ar text, status public.product_status)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, v.id, p.slug, p.name_en, p.name_ar, p.status
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.barcode = private.normalize_barcode(code)
    and (p.status = 'active' or private.is_staff()
      or (p.created_by_seller is not null and private.can_see_seller(p.created_by_seller)));
$$;

create function public.find_by_barcode(code text)
returns table (product_id uuid, variant_id uuid, slug text, name_en text, name_ar text, status public.product_status)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.find_by_barcode(code) $$;

-- ── Checks on new products ──────────────────────────────────────────────────

create type public.product_check_reason as enum ('missing_fields', 'missing_photo', 'banned', 'duplicate');

-- Words staff don't allow in product names (weapons, drugs, counterfeits…).
create table public.banned_terms (
  term text primary key check (char_length(trim(term)) between 2 and 60),
  created_at timestamptz not null default now()
);

alter table public.banned_terms enable row level security;

create policy "Staff manage banned terms"
  on public.banned_terms for all to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));

revoke all on public.banned_terms from anon, authenticated;
grant select, insert, delete on public.banned_terms to authenticated;

create table public.product_checks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  reason public.product_check_reason not null,
  -- The likely duplicate, for reason = 'duplicate'.
  other_product_id uuid references public.products (id) on delete cascade,
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (product_id, reason)
);

comment on table public.product_checks is
  'What the automatic checks found on a new product, for Staff → Inbox to merge or fix.';

create index product_checks_open_idx on public.product_checks (created_at) where resolved_at is null;
create index product_checks_other_idx on public.product_checks (other_product_id);
create index product_checks_resolved_by_idx on public.product_checks (resolved_by);

alter table public.product_checks enable row level security;

create policy "Staff work on product checks"
  on public.product_checks for all to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

revoke all on public.product_checks from anon, authenticated;
grant select, update on public.product_checks to authenticated;

-- Runs the checks on a product; returns whether it may stay live (no
-- banned item).
create function private.check_product(checked uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
  twin uuid;
  banned boolean;
begin
  select * into item from public.products p where p.id = checked;

  if item.category_id is null or coalesce(trim(item.name_en), '') = ''
    or coalesce(trim(item.name_ar), '') = '' then
    insert into public.product_checks (product_id, reason) values (checked, 'missing_fields')
    on conflict do nothing;
  end if;

  if cardinality(item.images) = 0 and not exists (
    select 1 from public.product_variants v where v.product_id = checked and cardinality(v.images) > 0
  ) then
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

  return not banned;
end;
$$;

revoke all on function private.check_product(uuid) from public;

-- A URL slug from the name, made unique.
create function private.listing_slug(name text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  base text := trim(both '-' from regexp_replace(lower(coalesce(name, '')), '[^a-z0-9]+', '-', 'g'));
  candidate text;
begin
  if base = '' then
    base := 'item';
  end if;
  base := left(base, 60);
  candidate := base;
  while exists (select 1 from public.products p where p.slug = candidate) loop
    candidate := base || '-' || substr(md5(random()::text), 1, 6);
  end loop;
  return candidate;
end;
$$;

-- A shop creates a product nobody has listed yet, with its offer. It goes
-- live at once (draft if it names a banned item) and is checked. Raises
-- 'Product exists' when the barcode is already in the catalogue: the shop
-- must pick that one.
create function private.create_listing(
  listing_seller uuid,
  category uuid,
  name_en text,
  name_ar text,
  barcode text,
  images text[],
  details jsonb,
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
  code text := private.normalize_barcode(barcode);
  product uuid;
  variant uuid;
  live boolean;
  title_en text := left(trim(coalesce(nullif(trim(name_en), ''), name_ar)), 200);
  title_ar text := left(trim(coalesce(nullif(trim(name_ar), ''), name_en)), 200);
begin
  if not private.can_list_for(listing_seller) then
    raise exception 'Only owners and admins of an approved shop can list' using errcode = '42501';
  end if;
  if coalesce(title_en, '') = '' then
    raise exception 'A name is required' using errcode = 'check_violation';
  end if;
  if barcode is not null and trim(barcode) <> '' and code is null then
    raise exception 'Invalid barcode' using errcode = 'check_violation';
  end if;
  if code is not null and exists (select 1 from public.product_variants v where v.barcode = code) then
    raise exception 'Product exists' using errcode = 'unique_violation';
  end if;
  if coalesce(cardinality(images), 0) > 10 then
    raise exception 'At most 10 photos' using errcode = 'check_violation';
  end if;

  insert into public.products (
    slug, name_en, name_ar, category_id, images, details, price, status, created_by_seller
  )
  values (
    private.listing_slug(title_en), title_en, title_ar, category, coalesce(images, '{}'),
    coalesce(details, '{}'), offer_price, 'active', listing_seller
  )
  returning id into product;

  -- Every product gets a default variant on insert; it carries the barcode.
  update public.product_variants v set barcode = code, price = offer_price
  where v.product_id = product
  returning v.id into variant;

  live := private.check_product(product);
  if not live then
    update public.products p set status = 'draft' where p.id = product;
  end if;

  perform private.set_offer(listing_seller, variant, offer_condition, offer_price, quantity, offer_sku);
  return product;
end;
$$;

create function public.create_listing(
  listing_seller uuid,
  category uuid,
  name_en text,
  name_ar text,
  barcode text,
  images text[],
  details jsonb,
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
  select private.create_listing(
    listing_seller, category, name_en, name_ar, barcode, images, details,
    offer_condition, offer_price, quantity, offer_sku
  )
$$;

-- ── Flags on wrong details ──────────────────────────────────────────────────

create table public.product_flags (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  seller_id uuid not null references public.sellers (id) on delete cascade,
  flagged_by uuid references auth.users (id) on delete set null,
  note text not null check (char_length(trim(note)) between 3 and 1000),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.product_flags is
  'A shop says a product''s details are wrong; staff fix them (shops never edit products).';

create index product_flags_product_idx on public.product_flags (product_id);
create index product_flags_seller_idx on public.product_flags (seller_id);
create index product_flags_flagged_by_idx on public.product_flags (flagged_by);
create index product_flags_resolved_by_idx on public.product_flags (resolved_by);
create index product_flags_open_idx on public.product_flags (created_at) where resolved_at is null;

alter table public.product_flags enable row level security;

create policy "Shops and staff read flags"
  on public.product_flags for select to authenticated
  using ((select private.can_see_seller(seller_id)));

create policy "Shop members flag products"
  on public.product_flags for insert to authenticated
  with check (
    flagged_by = (select auth.uid())
    and resolved_at is null
    and exists (
      select 1 from public.sellers s
      where s.id = seller_id and s.status = 'approved' and s.organization_id is not null
        and (select private.is_org_member(s.organization_id))
    )
  );

create policy "Staff resolve flags"
  on public.product_flags for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

revoke all on public.product_flags from anon, authenticated;
grant select, insert (product_id, seller_id, flagged_by, note) on public.product_flags to authenticated;
grant update (resolved_at, resolved_by) on public.product_flags to authenticated;

-- ── Notify me ───────────────────────────────────────────────────────────────

create table public.product_alerts (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index product_alerts_product_idx on public.product_alerts (product_id);

alter table public.product_alerts enable row level security;

create policy "Owners manage their alerts"
  on public.product_alerts for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.product_alerts from anon, authenticated;
grant select, insert, delete on public.product_alerts to authenticated;

-- A copy for sale became available: tell everyone waiting, once.
create function private.notify_product_alerts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
begin
  if new.status <> 'available' or new.purpose <> 'sale' then
    return new;
  end if;
  if not exists (select 1 from public.product_alerts a where a.product_id = new.product_id) then
    return new;
  end if;
  select * into item from public.products p where p.id = new.product_id;
  if item.status <> 'active' then
    return new;
  end if;

  with told as (
    delete from public.product_alerts a where a.product_id = new.product_id
    returning a.user_id
  )
  insert into public.notifications (user_id, kind, event, data, link)
  select told.user_id, 'system', 'product_available',
    jsonb_build_object('product_id', item.id, 'name_en', item.name_en, 'name_ar', item.name_ar),
    '/store/' || item.slug
  from told;
  return new;
end;
$$;

create trigger notify_product_alerts after insert or update of status on public.stock_items
  for each row execute function private.notify_product_alerts();

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.normalize_barcode(text) from public;
revoke all on function private.can_see_seller(uuid) from public;
revoke all on function private.can_list_for(uuid) from public;
revoke all on function private.set_offer(uuid, uuid, public.product_condition, bigint, integer, text) from public, anon;
revoke all on function public.set_offer(uuid, uuid, public.product_condition, bigint, integer, text) from public, anon;
revoke all on function private.find_by_barcode(text) from public, anon;
revoke all on function public.find_by_barcode(text) from public, anon;
revoke all on function private.listing_slug(text) from public;
revoke all on function private.create_listing(uuid, uuid, text, text, text, text[], jsonb, public.product_condition, bigint, integer, text) from public, anon;
revoke all on function public.create_listing(uuid, uuid, text, text, text, text[], jsonb, public.product_condition, bigint, integer, text) from public, anon;

grant execute on function private.normalize_barcode(text) to authenticated;
grant execute on function private.can_see_seller(uuid) to authenticated;
grant execute on function private.can_list_for(uuid) to authenticated;
grant execute on function private.set_offer(uuid, uuid, public.product_condition, bigint, integer, text) to authenticated;
grant execute on function public.set_offer(uuid, uuid, public.product_condition, bigint, integer, text) to authenticated;
grant execute on function private.find_by_barcode(text) to authenticated;
grant execute on function public.find_by_barcode(text) to authenticated;
grant execute on function private.create_listing(uuid, uuid, text, text, text, text[], jsonb, public.product_condition, bigint, integer, text) to authenticated;
grant execute on function public.create_listing(uuid, uuid, text, text, text, text[], jsonb, public.product_condition, bigint, integer, text) to authenticated;
