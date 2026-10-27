-- Program revision v1, step 5d: boxes.
--
-- A box is a Store product built from parts (`box_parts`):
--   fixed parts  a product version and how many (a turntable, a cleaning kit)
--   pick slots   how many copies staff choose from a category (and format),
--                worth together at least the box's stated `min_value`
-- A box is in stock while its parts are: its stock count is worked out from
-- the parts' copies, never kept as copies of its own. The customer picks a
-- theme (`box_themes`) when the box has them; staff pack the box from that
-- theme (`pack_box()`). An order takes the fixed parts' copies when it's
-- paid or confirmed, like any other line; the picked copies are taken at
-- packing. An active box costs 10–15% less than its parts (the fixed parts'
-- prices plus `min_value`), and like every price ends in …4,750 or …9,750:
--   Vinyl starter 379,750 (parts 434,500)   Mystery vinyl 154,750 (180,000)
--   Reading       54,750 (63,000)            Eid           114,750 (130,000)
--   Ramadan nights 89,750 (100,000)          Back to university 44,750 (50,000)
--
-- Launch boxes: Vinyl starter (turntable, cleaning kit, 3 records), Mystery
-- vinyl (3 records in a chosen genre) and Reading (3 books on a theme). The
-- seasonal boxes (Eid, Ramadan nights, Back to university) start as drafts.

-- ── Boxes, parts and themes ────────────────────────────────────────────────

create table public.boxes (
  product_id uuid primary key references public.products (id) on delete cascade,
  -- What the picked copies are worth together, at least (per box).
  min_value bigint not null default 0 check (min_value >= 0),
  -- Seasonal boxes are switched on for their season.
  season text check (season in ('eid', 'ramadan', 'university')),
  updated_at timestamptz not null default now()
);

comment on table public.boxes is
  'Store products built from parts: in stock while their parts are, packed by staff from the theme the customer picks.';

create table public.box_parts (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes (product_id) on delete cascade,
  -- A fixed part: this product version.
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid,
  -- A pick slot: copies from this category (and format, e.g. Vinyl).
  category_id uuid references public.product_categories (id) on delete cascade,
  format text check (char_length(format) between 1 and 40),
  quantity integer not null default 1 check (quantity between 1 and 10),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (product_id, variant_id) references public.product_variants (product_id, id) on delete cascade,
  check ((variant_id is not null and product_id is not null and category_id is null and format is null)
    or (variant_id is null and product_id is null and category_id is not null)),
  check (product_id is distinct from box_id)
);

comment on table public.box_parts is
  'What a box holds: fixed product versions, or slots staff fill from a category (and format).';

create index box_parts_box_idx on public.box_parts (box_id, position);
create index box_parts_product_idx on public.box_parts (product_id, variant_id);
create index box_parts_category_idx on public.box_parts (category_id);

create table public.box_themes (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes (product_id) on delete cascade,
  name_ar text not null check (char_length(name_ar) between 1 and 80),
  name_en text not null check (char_length(name_en) between 1 and 80),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.box_themes is
  'The themes (genres, subjects) a customer picks from for a box; staff pack the box to it.';

create index box_themes_box_idx on public.box_themes (box_id, position);

alter table public.boxes enable row level security;
alter table public.box_parts enable row level security;
alter table public.box_themes enable row level security;

create policy "Boxes are public" on public.boxes
  for select to anon, authenticated using (true);
create policy "Admins add boxes" on public.boxes
  for insert to authenticated
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins edit boxes" on public.boxes
  for update to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins remove boxes" on public.boxes
  for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

create policy "Box parts are public" on public.box_parts
  for select to anon, authenticated using (true);
create policy "Admins add box parts" on public.box_parts
  for insert to authenticated
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins edit box parts" on public.box_parts
  for update to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins remove box parts" on public.box_parts
  for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

create policy "Box themes are public" on public.box_themes
  for select to anon, authenticated using (true);
create policy "Admins add box themes" on public.box_themes
  for insert to authenticated
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins edit box themes" on public.box_themes
  for update to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));
create policy "Admins remove box themes" on public.box_themes
  for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

grant select on public.boxes, public.box_parts, public.box_themes to anon, authenticated;
grant insert, update, delete on public.boxes, public.box_parts, public.box_themes to authenticated;

create trigger set_updated_at before update on public.boxes
  for each row execute function private.set_updated_at();

-- The theme the customer picked, on the cart line and the order line, and
-- when staff packed the box.
alter table public.cart_items
  add column box_theme_id uuid references public.box_themes (id) on delete set null;
alter table public.order_items
  add column box_theme_id uuid references public.box_themes (id) on delete set null,
  add column packed_at timestamptz,
  add column packed_by uuid references auth.users (id) on delete set null;

grant insert (box_theme_id), update (box_theme_id) on public.cart_items to authenticated;

create index cart_items_box_theme_idx on public.cart_items (box_theme_id);
create index order_items_box_theme_idx on public.order_items (box_theme_id);
create index order_items_packed_by_idx on public.order_items (packed_by);

-- ── Stock from the parts ───────────────────────────────────────────────────

create function private.is_box(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.boxes b where b.product_id = target);
$$;

-- The copies a pick slot can be filled from: available for sale, of an
-- active product in the slot's category (and format), cheapest first.
create function private.box_slot_copies(slot uuid)
returns table (stock_item uuid, product_id uuid, price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.product_id, coalesce(s.price, v.price)
  from public.box_parts bp
  join public.products p on p.category_id = bp.category_id
  join public.product_variants v on v.product_id = p.id
  join public.stock_items s on s.variant_id = v.id
  where bp.id = slot
    and p.status = 'active'
    and v.active
    and s.purpose = 'sale'
    and s.status = 'available'
    and (bp.format is null or lower(v.attributes ->> 'Format') = lower(bp.format))
  order by 3, s.created_at;
$$;

-- How many of a box can be made now: the fewest any part allows (no parts,
-- none). Each pick slot is counted on its own.
create function private.box_stock(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(min(available / bp.quantity), 0)::integer
  from public.box_parts bp
  cross join lateral (
    select case
      when bp.variant_id is not null then (
        select count(*) from public.stock_items s
        join public.products p on p.id = s.product_id
        join public.product_variants v on v.id = s.variant_id
        where s.variant_id = bp.variant_id
          and p.status = 'active'
          and v.active
          and s.purpose = 'sale'
          and s.status = 'available'
          and s.condition = p.condition
      )
      else (select count(*) from private.box_slot_copies(bp.id))
    end as available
  ) a
  where bp.box_id = target;
$$;

-- What a box's parts are worth: the fixed parts' prices plus what the picked
-- copies are worth at least.
create function private.box_value(target uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select sum(v.price * bp.quantity)
    from public.box_parts bp
    join public.product_variants v on v.id = bp.variant_id
    where bp.box_id = target
  ), 0) + coalesce((select b.min_value from public.boxes b where b.product_id = target), 0);
$$;

-- An active box costs 10–15% less than its parts.
create function private.box_price_ok(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p.price between ceil(private.box_value(target) * 0.85) and floor(private.box_value(target) * 0.90)
  from public.products p
  where p.id = target;
$$;

-- Writes a box's stock count (on the box and its versions) from its parts.
create function private.sync_box_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  available integer := private.box_stock(target);
begin
  perform set_config('idea.stock_sync', 'on', true);
  update public.product_variants v set stock_count = available, rental_stock = 0
  where v.product_id = target and (v.stock_count <> available or v.rental_stock <> 0);
  update public.products p set stock_count = available, rental_stock = 0
  where p.id = target and (p.stock_count <> available or p.rental_stock <> 0);
  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

-- Recounts the boxes a product goes into (as a fixed part or through a
-- pick slot of its category).
create function private.sync_boxes_with(changed uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  box uuid;
begin
  for box in
    select distinct bp.box_id
    from public.box_parts bp
    where bp.product_id = changed
      or bp.category_id = (select p.category_id from public.products p where p.id = changed)
  loop
    perform private.sync_box_stock(box);
  end loop;
end;
$$;

-- As before (counts and whether the product can be rented), then a box's
-- count comes from its parts and the boxes a product goes into are
-- recounted.
create or replace function private.sync_stock_counts(target_product uuid, target_variant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_box(target_product) then
    perform private.sync_box_stock(target_product);
    return;
  end if;

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
    rentable = p.kind = 'rental' or exists (
      select 1 from public.stock_items s
      join public.product_variants v on v.id = s.variant_id
      where s.product_id = p.id and v.active and s.purpose = 'rental'
        and s.status in ('available', 'reserved', 'rented', 'repair')
    )
  where p.id = target_product;

  perform set_config('idea.stock_sync', 'off', true);

  perform private.sync_boxes_with(target_product);
end;
$$;

-- A box has no copies of its own.
create function private.no_box_copies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_box(new.product_id) then
    raise exception 'A box''s stock comes from its parts' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

-- After the foreign keys, so a copy of a product that doesn't exist reads as
-- that.
create trigger no_box_copies
  after insert or update of product_id on public.stock_items
  for each row execute function private.no_box_copies();

-- A box's product is for sale, and an active box is priced 10–15% below
-- its parts.
create function private.check_box(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  product public.products;
begin
  select * into product from public.products p where p.id = target;
  if product.id is null then
    return;
  end if;
  if product.kind <> 'sale' or product.rentable then
    raise exception 'A box is for sale only' using errcode = 'check_violation';
  end if;
  if product.status = 'active' and not exists (select 1 from public.box_parts bp where bp.box_id = target) then
    raise exception 'A box needs its parts' using errcode = 'check_violation';
  end if;
  if product.status = 'active' and not private.box_price_ok(target) then
    raise exception 'A box costs 10–15%% less than its parts' using errcode = 'check_violation';
  end if;
end;
$$;

create function private.on_box_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  box uuid;
begin
  if tg_table_name = 'boxes' then
    box := coalesce(new.product_id, old.product_id);
  else
    box := coalesce(new.box_id, old.box_id);
  end if;
  if private.is_box(box) then
    perform private.check_box(box);
    perform private.sync_box_stock(box);
  end if;
  return null;
end;
$$;

create trigger on_box_change
  after insert or update on public.boxes
  for each row execute function private.on_box_change();

create trigger on_box_part_change
  after insert or update or delete on public.box_parts
  for each row execute function private.on_box_change();

create function private.on_box_product_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_box(new.id) then
    perform private.check_box(new.id);
    if new.status is distinct from old.status then
      perform private.sync_box_stock(new.id);
    end if;
  elsif new.status is distinct from old.status or new.category_id is distinct from old.category_id then
    perform private.sync_boxes_with(new.id);
    if old.category_id is distinct from new.category_id and old.category_id is not null then
      perform private.sync_box_stock(bp.box_id)
      from (select distinct box_id from public.box_parts where category_id = old.category_id) bp;
    end if;
  end if;
  return null;
end;
$$;

create trigger on_box_product_change
  after update of price, status, kind, rentable, category_id on public.products
  for each row execute function private.on_box_product_change();

-- ── Checkout ───────────────────────────────────────────────────────────────

-- As before; a box line gets as many (copy-less) units as the box can be
-- made, at its version's price.
create or replace function private.copies_for_line(
  line_product uuid,
  line_variant uuid,
  line_condition public.product_condition,
  wanted integer
)
returns table (stock_item uuid, price bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.is_box(line_product) then
    return query
    select null::uuid, v.price
    from public.product_variants v
    cross join generate_series(1, least(wanted, private.box_stock(line_product)))
    where v.id = line_variant and v.product_id = line_product and v.active;
    return;
  end if;

  return query
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
end;
$$;

-- A cart line's theme is one of its box's active themes.
create function private.check_cart_box_theme()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.box_theme_id is not null and not exists (
    select 1 from public.box_themes t
    where t.id = new.box_theme_id and t.box_id = new.product_id and t.active
  ) then
    raise exception 'Pick one of the box''s themes' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_box_theme
  before insert or update of box_theme_id, product_id on public.cart_items
  for each row execute function private.check_cart_box_theme();

-- A box's order line takes the theme from the cart line it comes from; a
-- box with themes can't be ordered without one.
create function private.on_box_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind <> 'sale' or not private.is_box(new.product_id) then
    return new;
  end if;
  if new.box_theme_id is null then
    select c.box_theme_id into new.box_theme_id
    from public.cart_items c
    join public.orders o on o.user_id = c.user_id
    where o.id = new.order_id and c.product_id = new.product_id and c.variant_id = new.variant_id
    limit 1;
  end if;
  if new.box_theme_id is null and exists (
    select 1 from public.box_themes t where t.box_id = new.product_id and t.active
  ) then
    raise exception 'Pick a theme for the box' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger on_box_order_item
  before insert on public.order_items
  for each row execute function private.on_box_order_item();

-- As before; a box line takes its fixed parts' copies (the picked ones are
-- taken when staff pack it).
create or replace function private.take_order_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
  part public.box_parts;
begin
  for item in select * from public.order_items where order_id = target loop
    if item.kind = 'sale' and private.is_box(item.product_id) then
      for part in
        select * from public.box_parts bp where bp.box_id = item.product_id and bp.variant_id is not null
      loop
        update public.stock_items set status = 'sold', order_item_id = item.id
        where id in (
          select c.stock_item
          from private.copies_for_line(part.product_id, part.variant_id, null, part.quantity * item.quantity) c
        );
      end loop;
    elsif item.kind = 'sale' then
      update public.stock_items set status = 'sold', order_item_id = item.id
      where id in (
        select c.stock_item
        from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity) c
      );
    elsif item.kind = 'keep' then
      update public.stock_items
      set status = 'sold', order_item_id = item.id, rental_id = null
      where rental_id = item.rental_id and status = 'rented';
      update public.rentals set status = 'kept', returned_at = now()
      where id = item.rental_id and status in ('active', 'overdue');
    end if;
  end loop;
end;
$$;

-- ── Packing ────────────────────────────────────────────────────────────────

-- Staff pack a paid (or confirmed) box: the copies they picked for its
-- slots are taken, worth together at least the box's stated value; any
-- fixed part the order couldn't take yet is taken now.
create function private.pack_box(target uuid, picks uuid[])
returns public.order_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
  box public.boxes;
  part public.box_parts;
  wanted integer;
  taken integer;
  added integer;
  picked_value bigint;
  saved public.order_items;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;

  select i.* into item from public.order_items i
  join public.orders o on o.id = i.order_id
  where i.id = target and i.kind = 'sale' and o.status in ('confirmed', 'paid', 'processing')
  for update of i;
  select * into box from public.boxes b where b.product_id = item.product_id;
  if item.id is null or box.product_id is null then
    raise exception 'Box not found' using errcode = 'no_data_found';
  end if;
  if item.packed_at is not null then
    raise exception 'The box is already packed' using errcode = 'check_violation';
  end if;

  picks := coalesce((select array_agg(distinct p) from unnest(picks) p), '{}');

  -- Every pick is an available copy one of the slots can take, and each
  -- slot gets its share.
  if exists (
    select 1 from unnest(picks) p
    where not exists (
      select 1 from public.box_parts bp, private.box_slot_copies(bp.id) c
      where bp.box_id = box.product_id and bp.variant_id is null and c.stock_item = p
    )
  ) then
    raise exception 'A picked copy doesn''t fit the box' using errcode = 'check_violation';
  end if;
  select coalesce(sum(bp.quantity), 0) * item.quantity into wanted
  from public.box_parts bp where bp.box_id = box.product_id and bp.variant_id is null;
  if cardinality(picks) <> wanted or exists (
    select 1 from public.box_parts bp
    where bp.box_id = box.product_id and bp.variant_id is null
      and (select count(*) from private.box_slot_copies(bp.id) c where c.stock_item = any (picks))
        < bp.quantity * item.quantity
  ) then
    raise exception 'Pick % copies for the box', wanted using errcode = 'check_violation';
  end if;

  select coalesce(sum(coalesce(s.price, v.price)), 0) into picked_value
  from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  where s.id = any (picks);
  if picked_value < box.min_value * item.quantity then
    raise exception 'The picked copies are worth less than the box promises' using errcode = 'check_violation';
  end if;

  -- Fixed parts the order couldn't take yet.
  for part in
    select * from public.box_parts bp where bp.box_id = box.product_id and bp.variant_id is not null
  loop
    select count(*) into taken from public.stock_items s
    where s.order_item_id = item.id and s.variant_id = part.variant_id and s.status = 'sold';
    if taken < part.quantity * item.quantity then
      update public.stock_items set status = 'sold', order_item_id = item.id
      where id in (
        select c.stock_item
        from private.copies_for_line(part.product_id, part.variant_id, null, part.quantity * item.quantity - taken) c
      );
      get diagnostics added = row_count;
      if taken + added < part.quantity * item.quantity then
        raise exception 'Not enough stock for the box''s parts' using errcode = 'check_violation';
      end if;
    end if;
  end loop;

  update public.stock_items set status = 'sold', order_item_id = item.id
  where id = any (picks) and status = 'available' and purpose = 'sale';

  update public.order_items i set packed_at = now(), packed_by = auth.uid()
  where i.id = item.id
  returning * into saved;
  return saved;
end;
$$;

create function public.pack_box(target uuid, picks uuid[])
returns public.order_items
language sql
security invoker
set search_path = ''
as $$ select private.pack_box(target, picks) $$;

-- The copies staff can pick for a slot.
create function public.box_slot_copies(slot uuid)
returns table (stock_item uuid, product_id uuid, price bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query select * from private.box_slot_copies(slot);
end;
$$;

-- ── Launch and seasonal boxes ──────────────────────────────────────────────

-- Adds the launch and seasonal boxes, filling in what's missing (the
-- category, parts and themes) on boxes already there; the local seed runs
-- it again once its categories exist.
create function private.add_launch_boxes()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  audio uuid := (select id from public.product_categories where slug = 'audio');
  music uuid := (select id from public.product_categories where slug = 'music');
  books uuid := (select id from public.product_categories where slug = 'books');
  games uuid := (select id from public.product_categories where slug = 'games');
  box record;
  made uuid;
begin
  for box in
    select * from (values
      ('vinyl-starter-box', audio, 379750::bigint, 150000::bigint, null::text,
        'صندوق بداية الفينيل', 'Vinyl starter box',
        'كل ما تحتاجه لتبدأ: مشغل أسطوانات Audio-Technica AT-LP60X، وطقم تنظيف، وثلاث أسطوانات نختارها من النوع الذي تحبه.',
        'Everything to start with: an Audio-Technica AT-LP60X turntable, a cleaning kit and three records we pick in the genre you like.',
        'vinyl'),
      ('mystery-vinyl-box', music, 154750, 180000, null,
        'صندوق الفينيل المفاجئ', 'Mystery vinyl box',
        'ثلاث أسطوانات فينيل نختارها لك من النوع الذي تحبه، لا تقل قيمتها عن 180,000 د.ع.',
        'Three vinyl records we pick for you in the genre you like, worth at least 180,000 IQD.',
        'vinyl'),
      ('reading-box', books, 54750, 63000, null,
        'صندوق القراءة', 'Reading box',
        'ثلاثة كتب نختارها لك في الموضوع الذي تحبه، لا تقل قيمتها عن 63,000 د.ع.',
        'Three books we pick for you on the subject you like, worth at least 63,000 IQD.',
        'books'),
      ('eid-box', games, 114750, 130000, 'eid',
        'صندوق العيد', 'Eid box',
        'هدية العيد: لعبة وأسطوانة فينيل نختارهما لك، لا تقل قيمتهما عن 130,000 د.ع.',
        'An Eid gift: a game and a vinyl record we pick for you, worth at least 130,000 IQD.',
        null),
      ('ramadan-nights-box', books, 89750, 100000, 'ramadan',
        'صندوق ليالي رمضان', 'Ramadan nights box',
        'لسهرات رمضان: كتابان وأسطوانة فينيل نختارها لك، لا تقل قيمتها عن 100,000 د.ع.',
        'For Ramadan evenings: two books and a vinyl record we pick for you, worth at least 100,000 IQD.',
        null),
      ('back-to-university-box', books, 44750, 50000, 'university',
        'صندوق العودة إلى الجامعة', 'Back to university box',
        'للعام الدراسي الجديد: كتابان وقرص CD نختارها لك، لا تقل قيمتها عن 50,000 د.ع.',
        'For the new university year: two books and a CD we pick for you, worth at least 50,000 IQD.',
        null)
    ) as v (slug, category, price, min_value, season, name_ar, name_en, description_ar, description_en, themes)
  loop
    select p.id into made from public.products p where p.slug = box.slug;
    if made is null then
      insert into public.products (
        slug, kind, status, category_id, name_ar, name_en, description_ar, description_en, price, condition
      )
      values (
        box.slug, 'sale', 'draft', box.category, box.name_ar, box.name_en,
        box.description_ar, box.description_en, box.price, 'new'
      )
      returning id into made;
      insert into public.boxes (product_id, min_value, season) values (made, box.min_value, box.season);
    elsif not private.is_box(made) then
      continue;
    end if;

    update public.products set category_id = box.category
    where id = made and category_id is null and box.category is not null;

    -- Fixed parts (where the catalogue has them) and pick slots.
    if box.slug = 'vinyl-starter-box'
      and not exists (select 1 from public.box_parts bp where bp.box_id = made)
    then
      insert into public.box_parts (box_id, product_id, variant_id, quantity, position)
      select made, p.id, v.id, 1, row_number() over (order by p.slug)
      from public.products p
      join lateral (
        select v.id from public.product_variants v
        where v.product_id = p.id order by v.active desc, v.position limit 1
      ) v on true
      where p.slug in ('audio-technica-at-lp60x', 'vinyl-record-cleaning-kit');
    end if;

    insert into public.box_parts (box_id, category_id, format, quantity, position)
    select made, s.category, s.format, s.quantity, 10 + s.position
    from (values
      ('vinyl-starter-box', music, 'Vinyl', 3, 1),
      ('mystery-vinyl-box', music, 'Vinyl', 3, 1),
      ('reading-box', books, null, 3, 1),
      ('eid-box', games, null, 1, 1),
      ('eid-box', music, 'Vinyl', 1, 2),
      ('ramadan-nights-box', books, null, 2, 1),
      ('ramadan-nights-box', music, 'Vinyl', 1, 2),
      ('back-to-university-box', books, null, 2, 1),
      ('back-to-university-box', music, 'CD', 1, 2)
    ) as s (slug, category, format, quantity, position)
    where s.slug = box.slug and s.category is not null
      and not exists (select 1 from public.box_parts bp where bp.box_id = made and bp.variant_id is null);

    insert into public.box_themes (box_id, name_ar, name_en, position)
    select made, t.name_ar, t.name_en, t.position
    from (values
      ('vinyl', 'روك', 'Rock', 1),
      ('vinyl', 'جاز', 'Jazz', 2),
      ('vinyl', 'سول وفانك', 'Soul and funk', 3),
      ('vinyl', 'كلاسيكيات عربية', 'Arabic classics', 4),
      ('vinyl', 'فاجئني', 'Surprise me', 5),
      ('books', 'روايات', 'Novels', 1),
      ('books', 'أدب عربي', 'Arabic literature', 2),
      ('books', 'أفكار وتاريخ', 'Ideas and history', 3),
      ('books', 'فاجئني', 'Surprise me', 4)
    ) as t (themes, name_ar, name_en, position)
    where t.themes = box.themes
      and not exists (select 1 from public.box_themes bt where bt.box_id = made);

    -- The launch boxes go live when their parts price them right; the
    -- seasonal ones wait for their season.
    if box.season is null
      and private.box_price_ok(made)
      and exists (select 1 from public.box_parts bp where bp.box_id = made)
    then
      update public.products set status = 'active' where id = made and status = 'draft';
    end if;
  end loop;
end;
$$;

select private.add_launch_boxes();

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.is_box(uuid) from public;
revoke all on function private.box_slot_copies(uuid) from public, anon;
revoke all on function private.box_stock(uuid) from public;
revoke all on function private.box_value(uuid) from public;
revoke all on function private.box_price_ok(uuid) from public;
revoke all on function private.sync_box_stock(uuid) from public, anon, authenticated;
revoke all on function private.sync_boxes_with(uuid) from public, anon, authenticated;
revoke all on function private.no_box_copies() from public, anon, authenticated;
revoke all on function private.check_box(uuid) from public, anon, authenticated;
revoke all on function private.on_box_change() from public, anon, authenticated;
revoke all on function private.on_box_product_change() from public, anon, authenticated;
revoke all on function private.check_cart_box_theme() from public, anon, authenticated;
revoke all on function private.on_box_order_item() from public, anon, authenticated;
revoke all on function private.add_launch_boxes() from public, anon, authenticated;
revoke all on function private.pack_box(uuid, uuid[]) from public, anon;
revoke all on function public.pack_box(uuid, uuid[]) from public, anon;
revoke all on function public.box_slot_copies(uuid) from public, anon;

grant execute on function private.is_box(uuid) to anon, authenticated;
grant execute on function private.box_slot_copies(uuid) to authenticated;
grant execute on function private.box_stock(uuid) to anon, authenticated;
grant execute on function private.box_value(uuid) to anon, authenticated;
grant execute on function private.box_price_ok(uuid) to anon, authenticated;
grant execute on function private.pack_box(uuid, uuid[]) to authenticated;
grant execute on function public.pack_box(uuid, uuid[]) to authenticated;
grant execute on function public.box_slot_copies(uuid) to authenticated;
