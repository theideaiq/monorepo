-- Variants: one product per work, one variant per version of it.
--
-- A product is the work (an album, a game, a book, a turntable): its name,
-- description, category, reviews and wishlist. A variant is a version a
-- customer chooses: a format (CD, vinyl, cassette, Blu-ray), a platform
-- (PS5, Switch), a colour or an edition, with its own label, price,
-- compare-at price, SKU, barcode, pictures and details. Condition (new,
-- open box, used) is not a variant: it belongs to each copy, so the product
-- page offers every variant's copies by condition, and rentals take a copy
-- for rent of a variant.
--
-- Every product has at least one variant. A product inserted without one
-- gets a default variant (no label) carrying its price and stock, and while
-- a product has only that one variant, writing the product's price or stock
-- writes the variant's, so single-version products work as before. With
-- several variants, price and stock are set on each variant, and the
-- product's `price` / `compare_at_price` (the cheapest live variant: the
-- "from" price) and `stock_count` / `rental_stock` (all live variants'
-- available copies) are derived.

-- ── Variant columns ────────────────────────────────────────────────────────

alter table public.product_variants rename column price_override to price;

update public.product_variants v set price = p.price
from public.products p
where p.id = v.product_id and v.price is null;

alter table public.product_variants
  alter column price set not null,
  -- e.g. "Vinyl" / "أسطوانة فينيل"; null for a product's only variant.
  add column label_ar text check (char_length(label_ar) between 1 and 60),
  add column label_en text check (char_length(label_en) between 1 and 60),
  add column compare_at_price bigint check (compare_at_price >= 0),
  add column barcode text check (char_length(barcode) between 1 and 64),
  add column images text[] not null default '{}',
  -- What differs per version (release year, label, catalogue number), shown
  -- over the product's details.
  add column details jsonb not null default '{}'::jsonb
    check (jsonb_typeof(details) = 'object'),
  -- A hidden variant isn't offered (nor counted in the product's price and
  -- stock) but keeps its copies and history.
  add column active boolean not null default true,
  -- Available copies for rent (derived, or written to set the count).
  add column rental_stock integer not null default 0 check (rental_stock >= 0),
  add column updated_at timestamptz not null default now();

alter table public.product_variants
  drop constraint product_variants_price_override_check,
  add constraint product_variants_price_check check (price >= 0);

update public.product_variants set images = array[image] where image is not null;
alter table public.product_variants drop column image;

-- Existing variants (until now only {"Format": "Vinyl"}-style attributes)
-- are labelled with their attribute values.
update public.product_variants v set
  label_en = left(a.label, 60),
  label_ar = left(a.label, 60)
from (
  select v2.id, string_agg(e.value, ' · ' order by e.key) as label
  from public.product_variants v2
  cross join lateral jsonb_each_text(v2.attributes) e
  group by v2.id
) a
where a.id = v.id and a.label <> '';

create unique index product_variants_barcode_key on public.product_variants (barcode)
  where barcode is not null;
-- Lets copies and cart lines check that their variant is the product's.
alter table public.product_variants
  add constraint product_variants_product_variant_key unique (product_id, id);

create trigger set_updated_at before update on public.product_variants
  for each row execute function private.set_updated_at();

comment on table public.product_variants is
  'The versions of a product a customer chooses (format, platform, colour, edition): label, price, SKU, barcode, pictures and details. Every product has at least one.';

-- Words the search matches besides the product's own text: its variants'
-- labels, attribute values, SKUs and barcodes (kept by sync_product_variants).
alter table public.products add column variant_text text not null default '';

-- ── Every product gets a variant ───────────────────────────────────────────

-- Backfilled without touching the copies (which exist already): the sync
-- flag keeps the count triggers from adding or retiring any.
select set_config('idea.stock_sync', 'on', true);

insert into public.product_variants (product_id, price, compare_at_price, stock_count, position)
select p.id, p.price, p.compare_at_price, 0, 0
from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id);

-- Copies, cart lines and order lines without a variant belong to the
-- product's first variant.
update public.stock_items s set variant_id = (
  select v.id from public.product_variants v
  where v.product_id = s.product_id
  order by v.position, v.created_at
  limit 1
)
where s.variant_id is null;

update public.cart_items c set variant_id = (
  select v.id from public.product_variants v
  where v.product_id = c.product_id
  order by v.position, v.created_at
  limit 1
)
where c.variant_id is null;

update public.order_items i set variant_id = (
  select v.id from public.product_variants v
  where v.product_id = i.product_id
  order by v.position, v.created_at
  limit 1
)
where i.variant_id is null and i.product_id is not null;

select set_config('idea.stock_sync', 'off', true);

alter table public.stock_items
  alter column variant_id set not null,
  add constraint stock_items_product_variant_fkey
    foreign key (product_id, variant_id)
    references public.product_variants (product_id, id) on delete cascade;

alter table public.cart_items
  alter column variant_id set not null,
  add constraint cart_items_product_variant_fkey
    foreign key (product_id, variant_id)
    references public.product_variants (product_id, id) on delete cascade;

-- The pair above covers the variant on its own.
alter table public.stock_items drop constraint stock_items_variant_id_fkey;
alter table public.cart_items drop constraint cart_items_variant_id_fkey;
drop index public.stock_items_variant_id_idx;
drop index public.cart_items_variant_id_idx;
create index stock_items_product_variant_idx on public.stock_items (product_id, variant_id);
create index cart_items_product_variant_idx on public.cart_items (product_id, variant_id);

-- The unique cart line no longer needs `nulls not distinct` for the
-- variant, but still for the condition.
drop index public.cart_items_line_idx;
create unique index cart_items_line_idx
  on public.cart_items (user_id, product_id, variant_id, condition) nulls not distinct;

-- A cart line or copy added without a variant takes the product's only
-- live variant; with several to choose from, one must be named.
create function private.default_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  live integer;
  only_variant uuid;
begin
  if new.variant_id is null then
    select count(*), min(v.id::text)::uuid into live, only_variant
    from public.product_variants v
    where v.product_id = new.product_id and v.active;

    if live <> 1 then
      raise exception 'Choose a variant' using errcode = 'check_violation';
    end if;
    new.variant_id := only_variant;
  end if;
  return new;
end;
$$;

create trigger default_variant
  before insert on public.cart_items
  for each row execute function private.default_variant();

create trigger default_variant
  before insert on public.stock_items
  for each row execute function private.default_variant();

-- Rentals remember which version went out.
alter table public.rentals
  add column variant_id uuid references public.product_variants (id) on delete set null;
create index rentals_variant_id_idx on public.rentals (variant_id);

-- ── Counts, price and search text derived from the variants ────────────────

-- Recomputes a variant's counts and its product's from their available
-- copies (live variants only, for the product). The flag tells the count
-- triggers that this write comes from here, not from someone setting a
-- count.
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
    )
  where p.id = target_product;

  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

-- Recomputes what a product takes from its variants: the "from" price (the
-- cheapest live variant, else the cheapest variant) with that variant's
-- compare-at price, the stock counts and the search words.
create function private.sync_product_variants(target_product uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cheapest public.product_variants;
begin
  select * into cheapest from public.product_variants v
  where v.product_id = target_product
  order by v.active desc, v.price, v.position, v.created_at
  limit 1;

  if cheapest.id is null then
    return;
  end if;

  perform set_config('idea.stock_sync', 'on', true);

  update public.products p set
    price = cheapest.price,
    compare_at_price = cheapest.compare_at_price,
    variant_text = coalesce((
      select string_agg(concat_ws(' ', v.label_en, v.label_ar, v.sku, v.barcode, (
        select string_agg(e.value, ' ') from jsonb_each_text(v.attributes) e
      )), ' ')
      from public.product_variants v
      where v.product_id = p.id and v.active
    ), '')
  where p.id = target_product
    and (
      p.price is distinct from cheapest.price
      or p.compare_at_price is distinct from cheapest.compare_at_price
      or p.variant_text is distinct from coalesce((
        select string_agg(concat_ws(' ', v.label_en, v.label_ar, v.sku, v.barcode, (
          select string_agg(e.value, ' ') from jsonb_each_text(v.attributes) e
        )), ' ')
        from public.product_variants v
        where v.product_id = p.id and v.active
      ), '')
    );

  perform set_config('idea.stock_sync', 'off', true);

  perform private.sync_stock_counts(target_product, null);
end;
$$;

create function private.on_variant_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform private.sync_product_variants(old.product_id);
  else
    perform private.sync_product_variants(new.product_id);
  end if;
  return null;
end;
$$;

create trigger on_variant_change
  after insert or delete or update of price, compare_at_price, label_ar, label_en,
    sku, barcode, attributes, active
  on public.product_variants
  for each row execute function private.on_variant_change();

-- A product keeps at least one variant (deleting the product deletes them
-- all).
create function private.keep_one_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.products p where p.id = old.product_id)
    and not exists (
      select 1 from public.product_variants v
      where v.product_id = old.product_id and v.id <> old.id
    )
  then
    raise exception 'A product needs at least one variant' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger keep_one_variant
  before delete on public.product_variants
  for each row execute function private.keep_one_variant();

-- A count written directly on a variant becomes copies: for sale in the
-- product's condition, for rent new.
create or replace function private.on_variant_stock_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('idea.stock_sync', true), 'off') = 'on' then
    return null;
  end if;

  if tg_op = 'INSERT' or new.stock_count is distinct from old.stock_count then
    perform private.match_available_copies(
      new.product_id,
      new.id,
      'sale',
      (select p.condition from public.products p where p.id = new.product_id),
      new.stock_count
    );
  end if;

  if tg_op = 'INSERT' or new.rental_stock is distinct from old.rental_stock then
    perform private.match_available_copies(new.product_id, new.id, 'rental', 'new', new.rental_stock);
  end if;

  return null;
end;
$$;

drop trigger on_variant_stock_count on public.product_variants;
create trigger on_variant_stock_count
  after insert or update of stock_count, rental_stock on public.product_variants
  for each row execute function private.on_variant_stock_count();

-- A product inserted without variants gets its default variant, carrying
-- its price and stock (for sale, or for rent for rental items).
create function private.on_product_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.product_variants (
    product_id, price, compare_at_price, stock_count, rental_stock, position
  )
  values (
    new.id,
    new.price,
    new.compare_at_price,
    case when new.kind = 'rental' then 0 else new.stock_count end,
    case when new.kind = 'rental' then new.stock_count else 0 end,
    0
  );
  return null;
end;
$$;

-- While a product has one variant, its price and stock written on the
-- product go to that variant; with several, they're set per variant.
create or replace function private.on_product_stock_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  only_variant uuid;
  variants integer;
begin
  if coalesce(current_setting('idea.stock_sync', true), 'off') = 'on' then
    return null;
  end if;

  if new.stock_count is distinct from old.stock_count
    or new.price is distinct from old.price
    or new.compare_at_price is distinct from old.compare_at_price
  then
    select count(*), min(v.id::text)::uuid into variants, only_variant
    from public.product_variants v where v.product_id = new.id;

    if variants > 1 then
      raise exception 'This product has variants: set its price and stock on each variant'
        using errcode = 'check_violation';
    end if;

    update public.product_variants v set
      price = new.price,
      compare_at_price = new.compare_at_price,
      stock_count = case
        when new.kind = 'rental' or new.stock_count is not distinct from old.stock_count then v.stock_count
        else new.stock_count
      end,
      rental_stock = case
        when new.kind <> 'rental' or new.stock_count is not distinct from old.stock_count then v.rental_stock
        else new.stock_count
      end
    where v.id = only_variant;
  elsif new.kind is distinct from old.kind then
    -- The count now means the other purpose's copies.
    perform private.sync_stock_counts(new.id, null);
  end if;
  return null;
end;
$$;

drop trigger on_product_stock_count on public.products;

create trigger on_product_insert
  after insert on public.products
  for each row execute function private.on_product_insert();

create trigger on_product_stock_count
  after update of stock_count, price, compare_at_price, kind on public.products
  for each row execute function private.on_product_stock_count();

-- Products backfilled above take their variants' values.
select private.sync_product_variants(p.id) from public.products p;

-- ── What customers can get ─────────────────────────────────────────────────

-- The available copies of a product's live variants, grouped by variant,
-- condition and purpose (for sale or for rent), with the lowest price for
-- sale. Never shows costs or single copies.
create or replace function private.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    s.variant_id,
    s.condition,
    s.purpose,
    count(*)::integer,
    min(coalesce(s.price, v.price)) filter (where s.purpose = 'sale')
  from public.stock_items s
  join public.products p on p.id = s.product_id
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = offer_product
    and v.active
    and s.status = 'available'
    and s.purpose in ('sale', 'rental')
    and (p.status = 'active' or private.is_staff())
  group by s.variant_id, s.condition, s.purpose
  order by s.purpose, s.condition;
$$;

-- The copies an order line would get: available copies for sale of the
-- variant in the wanted condition, cheapest first (a copy priced on its own,
-- else the variant's price).
create or replace function private.copies_for_line(
  line_product uuid,
  line_variant uuid,
  line_condition public.product_condition,
  wanted integer
)
returns table (stock_item uuid, price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, coalesce(s.price, v.price)
  from public.stock_items s
  join public.products p on p.id = s.product_id
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = line_product
    and s.variant_id = line_variant
    and v.active
    and s.purpose = 'sale'
    and s.status = 'available'
    and s.condition = coalesce(line_condition, p.condition)
  order by 2, s.created_at
  limit wanted;
$$;

-- ── Search covers the variants ─────────────────────────────────────────────

drop index public.products_search_idx;

create function private.product_search_text(
  name_ar text,
  name_en text,
  description_ar text,
  description_en text,
  details jsonb,
  variant_text text
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select private.normalize_search(
    coalesce(name_en, '') || ' ' || coalesce(name_ar, '') || ' '
    || coalesce(variant_text, '') || ' '
    || coalesce(
      (select string_agg(d.value, ' ') from jsonb_each_text(
        case when jsonb_typeof(details) = 'object' then details else '{}'::jsonb end
      ) d),
      ''
    ) || ' '
    || coalesce(description_en, '') || ' ' || coalesce(description_ar, '')
  );
$$;

create index products_search_idx on public.products using gin (
  private.product_search_text(name_ar, name_en, description_ar, description_en, details, variant_text)
  extensions.gin_trgm_ops
);

create or replace function public.search_products(
  search_term text,
  search_kind public.product_kind default null,
  search_category text default null
)
returns setof public.products
language sql
stable
security invoker
set search_path = ''
as $$
  with term as (
    select
      private.normalize_search(left(search_term, 100)) as q,
      replace(replace(replace(
        private.normalize_search(left(search_term, 100)),
        '\', '\\'), '%', '\%'), '_', '\_') as pattern
  )
  select p.*
  from public.products p
  cross join term t
  left join public.product_categories c on c.id = p.category_id
  cross join lateral (
    select
      private.product_search_text(
        p.name_ar, p.name_en, p.description_ar, p.description_en, p.details, p.variant_text
      ) as doc,
      private.normalize_search(p.name_en) as en,
      private.normalize_search(p.name_ar) as ar
  ) s
  where t.q <> ''
    and p.status = 'active'
    and (search_kind is null or p.kind = search_kind)
    and (search_category is null or c.slug = search_category)
    and (
      s.doc like '%' || t.pattern || '%'
      or t.q operator(extensions.<%) s.doc
      or not exists (
        select 1 from regexp_split_to_table(t.q, ' ') w (word)
        where strpos(s.doc, w.word) = 0
      )
    )
  order by
    case
      when s.en = t.q or s.ar = t.q then 0
      when starts_with(s.en, t.q) or starts_with(s.ar, t.q) then 1
      when strpos(s.en, t.q) > 0 or strpos(s.ar, t.q) > 0 then 2
      when strpos(s.doc, t.q) > 0 then 3
      when not exists (
        select 1 from regexp_split_to_table(t.q, ' ') w (word)
        where strpos(s.doc, w.word) = 0
      ) then 4
      else 5
    end,
    extensions.word_similarity(t.q, s.doc) desc,
    p.featured desc,
    p.created_at desc,
    p.id;
$$;

drop function private.product_search_text(text, text, text, text, jsonb);

-- ── Rentals take a copy of a variant ───────────────────────────────────────

-- Any product with copies for rent can be rented, within the member's free
-- slots and plan tier. The request holds one copy of the chosen variant
-- (any variant with a copy free when none is chosen).
create function private.request_rental(rental_product uuid, rental_variant uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  open_rentals integer;
  copy public.stock_items;
  created public.rentals;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select * into item from public.products
  where id = rental_product and status = 'active'
    and (
      kind = 'rental'
      or exists (
        select 1 from public.stock_items s
        where s.product_id = rental_product and s.purpose = 'rental'
          and s.status in ('available', 'rented')
      )
    )
  for update;

  if not found then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  if rental_variant is not null and not exists (
    select 1 from public.product_variants v
    where v.id = rental_variant and v.product_id = item.id and v.active
  ) then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  select count(*) into open_rentals from public.rentals
  where user_id = caller and status in ('requested', 'active', 'overdue');

  if open_rentals >= private.plus_rental_slots(caller) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  if item.rental_tier is not null and private.plus_tier(caller) < item.rental_tier then
    raise exception 'This item needs a higher plan' using errcode = 'check_violation';
  end if;

  select s.* into copy from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = item.id
    and (rental_variant is null or s.variant_id = rental_variant)
    and v.active
    and s.purpose = 'rental'
    and s.status = 'available'
  order by s.created_at
  limit 1
  for update of s skip locked;

  if copy.id is null then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  insert into public.rentals (user_id, product_id, variant_id, name_ar, name_en)
  values (caller, item.id, copy.variant_id, item.name_ar, item.name_en)
  returning * into created;

  update public.stock_items set status = 'rented', rental_id = created.id
  where id = copy.id;

  return created;
end;
$$;

drop function public.request_rental(uuid);
drop function private.request_rental(uuid);

create function public.request_rental(rental_product uuid, rental_variant uuid default null)
returns public.rentals
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.request_rental($1, $2) $$;

comment on function public.request_rental(uuid, uuid) is
  'Requests a rental of a product (a copy of the chosen variant, or of any variant) for the caller, within their plan.';

-- ── Trade-ins become used copies ───────────────────────────────────────────

-- Completes an accepted trade-in. With `create_product`, the item becomes a
-- draft product with one copy (its condition from the request, its cost the
-- payout) linked to the trade-in. Returns the product id (null without one).
create or replace function private.complete_trade_in(trade_in uuid, create_product boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.trade_ins;
  created uuid;
  copy_condition public.product_condition;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Only support completes trade-ins' using errcode = 'insufficient_privilege';
  end if;

  select * into request from public.trade_ins where id = trade_in for update;
  if not found then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if request.status <> 'accepted' then
    raise exception 'Trade-in can''t change from % to completed', request.status
      using errcode = 'check_violation';
  end if;

  if create_product then
    copy_condition := case request.condition
      when 'sealed' then 'new'::public.product_condition
      when 'like_new' then 'open_box'::public.product_condition
      else 'used'::public.product_condition
    end;

    insert into public.products (
      slug, kind, status, name_ar, name_en, description_ar, description_en,
      price, condition, stock_count
    )
    values (
      'trade-in-' || request.number,
      'sale',
      'draft',
      request.title,
      request.title,
      request.description,
      request.description,
      0,
      copy_condition,
      0
    )
    returning id into created;

    insert into public.stock_items (product_id, variant_id, condition, purpose, cost, trade_in_id, note)
    select
      created,
      v.id,
      copy_condition,
      'sale',
      request.offer_amount,
      request.id,
      'From trade-in ' || request.number
    from public.product_variants v
    where v.product_id = created;
  end if;

  update public.trade_ins
  set status = 'completed',
      product_id = coalesce(created, product_id),
      reviewed_by = (select auth.uid())
  where id = request.id;

  return created;
end;
$$;

-- ── Import with variants ───────────────────────────────────────────────────

-- Upserts products by slug. An item may carry `variants`: each upserted by
-- its SKU, else its English label, within the product (a product created
-- with variants starts from the first, not from a default variant). Without
-- `variants`, the item's price and stock go to the product's only variant.
create or replace function private.import_products(items jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  item jsonb;
  version jsonb;
  target uuid;
  existing uuid;
  category uuid;
  fresh boolean;
  first_version boolean;
  inserted_count integer := 0;
  updated_count integer := 0;
begin
  -- The same check as the products policies: catalog staff (admins and
  -- superadmins) on an authenticator-app session.
  if not private.has_staff_role('{admin}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(items) is distinct from 'array' or jsonb_array_length(items) > 500 then
    raise exception 'Expected an array of at most 500 products'
      using errcode = 'invalid_parameter_value';
  end if;

  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or coalesce(item ->> 'slug', '') = ''
      or (item ? 'details' and jsonb_typeof(item -> 'details') is distinct from 'object')
      or (item ? 'images' and jsonb_typeof(item -> 'images') is distinct from 'array')
      or (item ? 'variants' and (
        jsonb_typeof(item -> 'variants') is distinct from 'array'
        or jsonb_array_length(item -> 'variants') = 0
        or jsonb_array_length(item -> 'variants') > 50
        or exists (
          select 1 from jsonb_array_elements(item -> 'variants') v (value)
          where jsonb_typeof(v.value) is distinct from 'object'
            or (coalesce(v.value ->> 'sku', '') = '' and coalesce(v.value ->> 'label_en', '') = '')
            or (v.value ? 'attributes' and jsonb_typeof(v.value -> 'attributes') is distinct from 'object')
            or (v.value ? 'details' and jsonb_typeof(v.value -> 'details') is distinct from 'object')
            or (v.value ? 'images' and jsonb_typeof(v.value -> 'images') is distinct from 'array')
        )
      ))
    then
      raise exception 'Invalid product' using errcode = 'invalid_parameter_value';
    end if;

    category := null;
    if item ? 'category' then
      select c.id into category
      from public.product_categories c
      where c.slug = item ->> 'category';
      if category is null then
        raise exception 'Unknown category %', item ->> 'category'
          using errcode = 'foreign_key_violation';
      end if;
    end if;

    select p.id into target
    from public.products p
    where p.slug = item ->> 'slug'
    for update;

    fresh := target is null;

    if fresh then
      insert into public.products (
        slug, kind, status, category_id, name_ar, name_en,
        description_ar, description_en, price, compare_at_price,
        condition, stock_count, images, details
      ) values (
        item ->> 'slug',
        coalesce((item ->> 'kind')::public.product_kind, 'sale'),
        coalesce((item ->> 'status')::public.product_status, 'draft'),
        category,
        item ->> 'name_ar',
        item ->> 'name_en',
        item ->> 'description_ar',
        item ->> 'description_en',
        coalesce((item ->> 'price')::bigint, (item -> 'variants' -> 0 ->> 'price')::bigint),
        (item ->> 'compare_at_price')::bigint,
        coalesce((item ->> 'condition')::public.product_condition, 'new'),
        case when item ? 'variants' then 0 else coalesce((item ->> 'stock_count')::integer, 0) end,
        array(select jsonb_array_elements_text(coalesce(item -> 'images', '[]'::jsonb))),
        coalesce(item -> 'details', '{}'::jsonb)
      )
      returning id into target;
      inserted_count := inserted_count + 1;
    else
      update public.products p set
        kind = coalesce((item ->> 'kind')::public.product_kind, p.kind),
        status = coalesce((item ->> 'status')::public.product_status, p.status),
        category_id = case when item ? 'category' then category else p.category_id end,
        name_ar = coalesce(item ->> 'name_ar', p.name_ar),
        name_en = coalesce(item ->> 'name_en', p.name_en),
        description_ar = coalesce(item ->> 'description_ar', p.description_ar),
        description_en = coalesce(item ->> 'description_en', p.description_en),
        price = case when item ? 'variants' then p.price
          else coalesce((item ->> 'price')::bigint, p.price) end,
        compare_at_price = case when item ? 'variants' then p.compare_at_price
          else coalesce((item ->> 'compare_at_price')::bigint, p.compare_at_price) end,
        condition = coalesce((item ->> 'condition')::public.product_condition, p.condition),
        stock_count = case when item ? 'variants' then p.stock_count
          else coalesce((item ->> 'stock_count')::integer, p.stock_count) end,
        images = case
          when item ? 'images' then array(select jsonb_array_elements_text(item -> 'images'))
          else p.images
        end,
        details = p.details || coalesce(item -> 'details', '{}'::jsonb)
      where p.id = target;
      updated_count := updated_count + 1;
    end if;

    -- A new product, or one still on its unlabelled default variant: the
    -- first variant of the item fills that variant in.
    first_version := fresh or (
      select count(*) = 1 and bool_and(v.label_en is null and v.sku is null)
      from public.product_variants v where v.product_id = target
    );
    for version in select value from jsonb_array_elements(coalesce(item -> 'variants', '[]'::jsonb)) loop
      existing := null;
      if first_version then
        -- The default variant created with the product becomes the first.
        select v.id into existing from public.product_variants v where v.product_id = target;
        first_version := false;
      else
        select v.id into existing from public.product_variants v
        where v.product_id = target
          and (
            (coalesce(version ->> 'sku', '') <> '' and v.sku = version ->> 'sku')
            or (coalesce(version ->> 'sku', '') = '' and v.label_en = version ->> 'label_en')
          );
      end if;

      if existing is null then
        insert into public.product_variants (
          product_id, label_ar, label_en, attributes, price, compare_at_price,
          sku, barcode, images, details, stock_count, rental_stock, position
        ) values (
          target,
          coalesce(version ->> 'label_ar', version ->> 'label_en'),
          version ->> 'label_en',
          coalesce(version -> 'attributes', '{}'::jsonb),
          coalesce((version ->> 'price')::bigint, (item ->> 'price')::bigint, 0),
          (version ->> 'compare_at_price')::bigint,
          nullif(version ->> 'sku', ''),
          nullif(version ->> 'barcode', ''),
          array(select jsonb_array_elements_text(coalesce(version -> 'images', '[]'::jsonb))),
          coalesce(version -> 'details', '{}'::jsonb),
          coalesce((version ->> 'stock_count')::integer, 0),
          coalesce((version ->> 'rental_stock')::integer, 0),
          coalesce((version ->> 'position')::integer,
            (select count(*)::integer from public.product_variants v where v.product_id = target))
        );
      else
        update public.product_variants v set
          label_ar = coalesce(version ->> 'label_ar', v.label_ar, version ->> 'label_en'),
          label_en = coalesce(version ->> 'label_en', v.label_en),
          attributes = case when version ? 'attributes' then version -> 'attributes' else v.attributes end,
          price = coalesce((version ->> 'price')::bigint, v.price),
          compare_at_price = case when version ? 'compare_at_price'
            then (version ->> 'compare_at_price')::bigint else v.compare_at_price end,
          sku = coalesce(nullif(version ->> 'sku', ''), v.sku),
          barcode = coalesce(nullif(version ->> 'barcode', ''), v.barcode),
          images = case when version ? 'images'
            then array(select jsonb_array_elements_text(version -> 'images')) else v.images end,
          details = v.details || coalesce(version -> 'details', '{}'::jsonb),
          stock_count = coalesce((version ->> 'stock_count')::integer, v.stock_count),
          rental_stock = coalesce((version ->> 'rental_stock')::integer, v.rental_stock),
          position = coalesce((version ->> 'position')::integer, v.position)
        where v.id = existing;
      end if;
    end loop;
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count);
end;
$$;

comment on function public.import_products(jsonb) is
  'Upserts up to 500 products by slug, with their variants by SKU or English label (catalog staff only). Fields missing from an item keep their value; details are merged.';

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.sync_product_variants(uuid) from public, anon, authenticated;
revoke all on function private.on_variant_change() from public, anon, authenticated;
revoke all on function private.keep_one_variant() from public, anon, authenticated;
revoke all on function private.default_variant() from public, anon, authenticated;
revoke all on function private.on_product_insert() from public, anon, authenticated;

revoke all on function private.product_search_text(text, text, text, text, jsonb, text) from public;
grant execute on function private.product_search_text(text, text, text, text, jsonb, text)
  to anon, authenticated, service_role;

revoke all on function private.request_rental(uuid, uuid) from public, anon;
grant execute on function private.request_rental(uuid, uuid) to authenticated;
revoke all on function public.request_rental(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.request_rental(uuid, uuid) to authenticated;
