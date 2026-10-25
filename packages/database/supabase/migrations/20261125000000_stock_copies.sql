-- Shared catalogue: one product per real thing, stock tracked per copy.
--
-- Every physical copy is a row in `stock_items`: its condition (new, open
-- box, refurbished, used), its purpose (for sale, for The IDEA Plus
-- rentals, or used by the business), where it is, what it cost and, for a
-- copy priced on its own (a used one), its price. A product can have copies
-- for sale and for rent at once, in several conditions, so the product page
-- offers "buy new", "buy used" and "rent with Plus" from one listing.
--
-- The existing counts are kept and derived from the copies, so every screen
-- that reads them keeps working:
--   - `products.stock_count`: available copies without a variant, of the
--     product's kind (for sale, or for rent for rental items);
--   - `product_variants.stock_count`: available copies of the variant for sale;
--   - `products.rental_stock`: available copies for rent (new).
-- Writing a count directly (the back office, the CSV import, the catalog
-- workflow) adds or retires available copies to match it.
--
-- Orders take specific copies (cheapest first, in the condition the
-- customer chose), cancelled orders give them back, rentals hold one copy
-- until it is returned, and a completed trade-in can become a used copy.

-- ── Types and columns ──────────────────────────────────────────────────────

create type public.stock_purpose as enum ('sale', 'rental', 'business');
create type public.stock_status as enum (
  'available', 'reserved', 'sold', 'rented', 'repair', 'retired'
);

alter table public.products
  add column rental_stock integer not null default 0 check (rental_stock >= 0),
  -- Products that are the same work in other formats (the album on vinyl, CD
  -- and cassette; the game on PS5 and Xbox) share a key.
  add column group_key text check (char_length(group_key) between 1 and 120);

create index products_group_key_idx on public.products (group_key)
  where group_key is not null;

-- The condition a cart line or an order line asks for; null means the
-- product's own condition (its main listing).
alter table public.cart_items add column condition public.product_condition;
alter table public.order_items add column condition public.product_condition;

grant insert (condition) on public.cart_items to authenticated;

drop index public.cart_items_line_idx;
create unique index cart_items_line_idx
  on public.cart_items (user_id, product_id, variant_id, condition) nulls not distinct;

-- ── Copies ──────────────────────────────────────────────────────────────────

create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  condition public.product_condition not null default 'new',
  purpose public.stock_purpose not null default 'sale',
  status public.stock_status not null default 'available',
  -- Where the copy is: the store, the warehouse, a staff member…
  location text not null default '' check (char_length(location) <= 120),
  -- What it cost The IDEA (staff only). Null when unknown.
  cost bigint check (cost >= 0),
  -- Its own price; null means the catalog price (variant, then product).
  price bigint check (price > 0),
  serial text check (char_length(serial) <= 120),
  note text check (char_length(note) <= 1000),
  trade_in_id uuid references public.trade_ins (id) on delete set null,
  order_item_id uuid references public.order_items (id) on delete set null,
  rental_id uuid references public.rentals (id) on delete set null,
  acquired_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.stock_items is
  'One row per physical copy: condition, purpose (sale, rental, business), status, location, cost and price.';

create index stock_items_product_idx on public.stock_items (product_id, purpose, status);
create index stock_items_variant_id_idx on public.stock_items (variant_id);
create index stock_items_trade_in_id_idx on public.stock_items (trade_in_id);
create index stock_items_order_item_id_idx on public.stock_items (order_item_id);
create index stock_items_rental_id_idx on public.stock_items (rental_id);

create trigger set_updated_at before update on public.stock_items
  for each row execute function private.set_updated_at();

alter table public.stock_items enable row level security;

-- Copies (with their cost) are for catalog staff only; customers see what
-- is available through product_offers().
create policy "Catalog staff manage copies"
  on public.stock_items for all to authenticated
  using ((select private.has_staff_role('{admin}')))
  with check ((select private.has_staff_role('{admin}')));

-- ── Counts derived from the copies ─────────────────────────────────────────

-- Recomputes a product's counts (and a variant's) from its available
-- copies. The flag tells the count triggers below that this write comes
-- from here, not from someone setting a count.
create function private.sync_stock_counts(target_product uuid, target_variant uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('idea.stock_sync', 'on', true);

  update public.products p set
    stock_count = (
      select count(*) from public.stock_items s
      where s.product_id = p.id
        and s.variant_id is null
        and s.status = 'available'
        and s.purpose = case when p.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose
    ),
    rental_stock = (
      select count(*) from public.stock_items s
      where s.product_id = p.id and s.status = 'available' and s.purpose = 'rental'
    )
  where p.id = target_product;

  if target_variant is not null then
    update public.product_variants v set
      stock_count = (
        select count(*) from public.stock_items s
        where s.variant_id = v.id and s.status = 'available' and s.purpose = 'sale'
      )
    where v.id = target_variant;
  end if;

  perform set_config('idea.stock_sync', 'off', true);
end;
$$;

create function private.on_stock_item_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform private.sync_stock_counts(old.product_id, old.variant_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform private.sync_stock_counts(new.product_id, new.variant_id);
  end if;
  return null;
end;
$$;

create trigger on_stock_item_change
  after insert or update or delete on public.stock_items
  for each row execute function private.on_stock_item_change();

-- Makes the available copies of one product (or variant) and purpose match
-- `target`: adds copies in `condition`, or retires available ones (bulk
-- copies without a cost first, newest first).
create function private.match_available_copies(
  target_product uuid,
  target_variant uuid,
  target_purpose public.stock_purpose,
  copy_condition public.product_condition,
  target integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
begin
  select count(*) into current_count from public.stock_items s
  where s.product_id = target_product
    and s.variant_id is not distinct from target_variant
    and s.purpose = target_purpose
    and s.status = 'available';

  if greatest(target, 0) > current_count then
    insert into public.stock_items (product_id, variant_id, condition, purpose)
    select target_product, target_variant, copy_condition, target_purpose
    from generate_series(1, greatest(target, 0) - current_count);
  elsif greatest(target, 0) < current_count then
    update public.stock_items set
      status = 'retired',
      note = coalesce(note, 'Stock count lowered')
    where id in (
      select s.id from public.stock_items s
      where s.product_id = target_product
        and s.variant_id is not distinct from target_variant
        and s.purpose = target_purpose
        and s.status = 'available'
      order by (s.cost is null) desc, s.created_at desc
      limit current_count - greatest(target, 0)
    );
  end if;
end;
$$;

-- A count written directly on a product becomes copies.
create function private.on_product_stock_count()
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
      new.id,
      null,
      case when new.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose,
      new.condition,
      new.stock_count
    );
  elsif new.kind is distinct from old.kind then
    -- The count now means the other purpose's copies.
    perform private.sync_stock_counts(new.id, null);
  end if;
  return null;
end;
$$;

create trigger on_product_stock_count
  after insert or update of stock_count, kind on public.products
  for each row execute function private.on_product_stock_count();

-- A count written directly on a variant becomes copies for sale.
create function private.on_variant_stock_count()
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
  return null;
end;
$$;

create trigger on_variant_stock_count
  after insert or update of stock_count on public.product_variants
  for each row execute function private.on_variant_stock_count();

-- ── Copies for the stock that exists today ─────────────────────────────────

insert into public.stock_items (product_id, condition, purpose)
select p.id, p.condition,
  case when p.kind = 'rental' then 'rental' else 'sale' end::public.stock_purpose
from public.products p
cross join lateral generate_series(1, p.stock_count);

insert into public.stock_items (product_id, variant_id, condition, purpose)
select v.product_id, v.id, p.condition, 'sale'
from public.product_variants v
join public.products p on p.id = v.product_id
cross join lateral generate_series(1, v.stock_count);

-- Copies out with a member (or set aside for a requested rental).
insert into public.stock_items (product_id, condition, purpose, status, rental_id)
select r.product_id, p.condition, 'rental', 'rented', r.id
from public.rentals r
join public.products p on p.id = r.product_id
where r.status in ('requested', 'active', 'overdue');

-- ── What customers can get ─────────────────────────────────────────────────

-- The available copies of a product, grouped by variant, condition and
-- purpose (for sale or for rent), with the lowest price for sale. Never
-- shows costs or single copies.
create function private.product_offers(offer_product uuid)
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
    min(coalesce(s.price, v.price_override, p.price)) filter (where s.purpose = 'sale')
  from public.stock_items s
  join public.products p on p.id = s.product_id
  left join public.product_variants v on v.id = s.variant_id
  where s.product_id = offer_product
    and s.status = 'available'
    and s.purpose in ('sale', 'rental')
    and (p.status = 'active' or private.is_staff())
  group by s.variant_id, s.condition, s.purpose
  order by s.purpose, s.condition;
$$;

create function public.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.product_offers($1) $$;

comment on function public.product_offers(uuid) is
  'Available copies of a product by variant, condition and purpose, with the lowest sale price.';

-- ── Orders take copies ─────────────────────────────────────────────────────

-- The copies an order line would get: available copies for sale of the
-- product (and variant) in the wanted condition, cheapest first.
create function private.copies_for_line(
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
  select s.id, coalesce(s.price, v.price_override, p.price)
  from public.stock_items s
  join public.products p on p.id = s.product_id
  left join public.product_variants v on v.id = s.variant_id
  where s.product_id = line_product
    and s.variant_id is not distinct from line_variant
    and s.purpose = 'sale'
    and s.status = 'available'
    and s.condition = coalesce(line_condition, p.condition)
  order by 2, s.created_at
  limit wanted;
$$;

-- Takes an order's copies out of stock (online orders when paid, cash
-- orders when placed).
create or replace function private.take_order_stock(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
begin
  for item in select * from public.order_items where order_id = target loop
    update public.stock_items set status = 'sold', order_item_id = item.id
    where id in (
      select c.stock_item
      from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity) c
    );
  end loop;
end;
$$;

-- Puts a cancelled order's copies back in stock.
create or replace function private.return_order_stock(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.stock_items set status = 'available', order_item_id = null
  where status in ('sold', 'reserved')
    and order_item_id in (select i.id from public.order_items i where i.order_id = target);
$$;

-- Turns the caller's cart into an order, priced from the copies and the
-- delivery zone. Raises if the cart is empty, an item is unavailable or out
-- of stock, the zone doesn't exist or the chosen option is switched off.
-- Each line costs the price of the copies it will get (copies priced on
-- their own, such as used ones, else the catalog price).
create or replace function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_order.fulfilment = 'pickup';
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  settings public.store_settings;
  zone public.delivery_zones;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  order_subtotal bigint := 0;
  fee bigint := 0;
  created public.orders;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  if create_order.fulfilment is null or create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or (
      not pickup
      and (
        coalesce(trim(shipping ->> 'address'), '') = ''
        -- Without a chosen zone, the governorate finds it.
        or (wanted = '' and delivery_zone is null)
      )
    )
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  select * into settings from public.store_settings;

  if pickup then
    if not settings.pickup_enabled
      or coalesce(nullif(trim(settings.pickup_address_ar), ''), nullif(trim(settings.pickup_address_en), '')) is null
    then
      raise exception 'Store pickup is not available' using errcode = 'check_violation';
    end if;
  else
    if delivery_zone is not null then
      select * into zone from public.delivery_zones z
      where z.id = delivery_zone and z.active;
    else
      select * into zone from public.delivery_zones z
      where z.active and (z.governorate = wanted or lower(z.name_en) = wanted)
      order by z.position
      limit 1;
    end if;
    if zone.id is null then
      raise exception 'Delivery zone not available' using errcode = 'check_violation';
    end if;
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.cart_items where user_id = caller) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock.
  for line in
    select
      c.product_id,
      c.variant_id,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = caller
    for update of p
  loop
    if line.status <> 'active' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    order_subtotal := order_subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  -- Pickup is free; delivery costs the zone's fee unless the subtotal
  -- reaches the free-delivery threshold.
  fee := case
    when pickup then 0
    when settings.free_shipping_threshold is not null
      and order_subtotal >= settings.free_shipping_threshold then 0
    else zone.fee
  end;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, shipping_address,
    fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    order_subtotal,
    fee,
    order_subtotal + fee,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case
        when pickup then ''
        -- A zone that isn't a whole governorate is named instead.
        else coalesce(zone.governorate, nullif(left(trim(shipping ->> 'governorate'), 60), ''), zone.name_en)
      end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    create_order.fulfilment,
    create_order.payment_method,
    zone.id
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, condition, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.condition, l.name_ar, l.name_en,
    l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(lines) as l (
    product_id uuid,
    variant_id uuid,
    condition public.product_condition,
    quantity integer,
    unit_price bigint,
    name_ar text,
    name_en text,
    attributes jsonb
  );

  delete from public.cart_items where user_id = caller;

  -- A cash order is confirmed now: its copies are set aside and the
  -- customer is told (online orders wait for the payment webhook).
  if cash then
    perform private.take_order_stock(created.id);
    perform private.notify(
      caller,
      'order',
      'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;

  return created;
end;
$$;

-- ── Rentals hold a copy ────────────────────────────────────────────────────

-- Any product with copies for rent can be rented (not only rental items),
-- within the member's free slots and plan tier. The request holds one copy.
create or replace function private.request_rental(rental_product uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  open_rentals integer;
  copy uuid;
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

  select count(*) into open_rentals from public.rentals
  where user_id = caller and status in ('requested', 'active', 'overdue');

  if open_rentals >= private.plus_rental_slots(caller) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  if item.rental_tier is not null and private.plus_tier(caller) < item.rental_tier then
    raise exception 'This item needs a higher plan' using errcode = 'check_violation';
  end if;

  select s.id into copy from public.stock_items s
  where s.product_id = item.id and s.purpose = 'rental' and s.status = 'available'
  order by s.created_at
  limit 1
  for update skip locked;

  if copy is null then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  insert into public.rentals (user_id, product_id, name_ar, name_en)
  values (caller, item.id, item.name_ar, item.name_en)
  returning * into created;

  update public.stock_items set status = 'rented', rental_id = created.id
  where id = copy;

  return created;
end;
$$;

-- Keeps the copy and timestamps consistent when staff change a rental's
-- status: a returned or cancelled rental frees its copy.
create or replace function private.on_rental_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'requested' and new.status in ('active', 'cancelled'))
    or (old.status = 'active' and new.status in ('returned', 'overdue'))
    or (old.status = 'overdue' and new.status in ('returned', 'active'))
  ) then
    raise exception 'Rental status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'active' and old.status = 'requested' then
    new.started_at := coalesce(new.started_at, now());
    new.due_at := coalesce(new.due_at, new.started_at + interval '14 days');
  end if;

  if new.status in ('returned', 'cancelled') then
    if new.status = 'returned' then
      new.returned_at := coalesce(new.returned_at, now());
    end if;
    update public.stock_items set status = 'available', rental_id = null
    where rental_id = new.id and status = 'rented';
  end if;

  return new;
end;
$$;

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

    insert into public.stock_items (product_id, condition, purpose, cost, trade_in_id, note)
    values (
      created,
      copy_condition,
      'sale',
      request.offer_amount,
      request.id,
      'From trade-in ' || request.number
    );
  end if;

  update public.trade_ins
  set status = 'completed',
      product_id = coalesce(created, product_id),
      reviewed_by = (select auth.uid())
  where id = request.id;

  return created;
end;
$$;

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.sync_stock_counts(uuid, uuid) from public, anon, authenticated;
revoke all on function private.on_stock_item_change() from public, anon, authenticated;
revoke all on function private.match_available_copies(uuid, uuid, public.stock_purpose, public.product_condition, integer)
  from public, anon, authenticated;
revoke all on function private.on_product_stock_count() from public, anon, authenticated;
revoke all on function private.on_variant_stock_count() from public, anon, authenticated;
revoke all on function private.copies_for_line(uuid, uuid, public.product_condition, integer)
  from public, anon, authenticated;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;
