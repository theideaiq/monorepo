-- The Megastore: catalog, cart and orders, and billing for individual
-- customers.
--
-- Prices are integers in IQD (whole dinars), like the rest of billing. The
-- catalog is public; staff with the admin role edit it. Customers keep their
-- cart in the database (so it follows them between the website and the
-- apps) and turn it into an order with `create_order()`, which prices every
-- line from the catalog — clients never send prices. Orders become `paid`
-- only through `complete_order_payment()`, called by apps/api after a
-- verified payment webhook.

create type public.product_kind as enum ('sale', 'rental');
create type public.product_status as enum ('draft', 'active', 'archived');
create type public.product_condition as enum ('new', 'used', 'refurbished', 'open_box');
create type public.order_status as enum (
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
);

-- ── Catalog ─────────────────────────────────────────────────────────────────

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 64),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  name_en text not null check (char_length(name_en) between 1 and 120),
  kind public.product_kind not null default 'sale',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  kind public.product_kind not null default 'sale',
  status public.product_status not null default 'draft',
  category_id uuid references public.product_categories (id) on delete set null,
  name_ar text not null check (char_length(name_ar) between 1 and 200),
  name_en text not null check (char_length(name_en) between 1 and 200),
  description_ar text check (char_length(description_ar) <= 10000),
  description_en text check (char_length(description_en) <= 10000),
  -- Sale price, or the replacement value of a rental item.
  price bigint not null check (price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price > price),
  currency char(3) not null default 'IQD',
  condition public.product_condition not null default 'new',
  stock_count integer not null default 0 check (stock_count >= 0),
  -- Storage paths in the public `catalog` bucket; the first is the cover.
  images text[] not null default '{}' check (cardinality(images) <= 12),
  -- Specifications shown on the product page, e.g. {"Storage": "1 TB"}.
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_listing_idx on public.products (status, kind, category_id, created_at desc);
create index products_featured_idx on public.products (featured) where featured and status = 'active';

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text unique check (char_length(sku) <= 64),
  -- e.g. {"Color": "Black", "Storage": "1 TB"}
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  price_override bigint check (price_override >= 0),
  stock_count integer not null default 0 check (stock_count >= 0),
  image text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_variants_product_id_idx on public.product_variants (product_id);

create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();

-- ── Cart ────────────────────────────────────────────────────────────────────

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One line per product/variant; NULL variants compare equal here.
create unique index cart_items_line_idx
  on public.cart_items (user_id, product_id, variant_id) nulls not distinct;

create trigger set_updated_at before update on public.cart_items
  for each row execute function private.set_updated_at();

-- ── Store settings ──────────────────────────────────────────────────────────

-- A single row with the delivery fees, edited in the back office.
create table public.store_settings (
  id boolean primary key default true check (id),
  shipping_fee bigint not null default 5000 check (shipping_fee >= 0),
  free_shipping_threshold bigint check (free_shipping_threshold >= 0),
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id) values (true);

create trigger set_updated_at before update on public.store_settings
  for each row execute function private.set_updated_at();

-- ── Orders ──────────────────────────────────────────────────────────────────

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Short, human-friendly number for receipts and support ("#10042").
  number bigint generated always as identity (start with 10001) unique,
  -- Kept with a null user if the account is deleted (financial record).
  user_id uuid references auth.users (id) on delete set null,
  status public.order_status not null default 'pending',
  subtotal bigint not null check (subtotal >= 0),
  shipping_fee bigint not null default 0 check (shipping_fee >= 0),
  total bigint not null check (total = subtotal + shipping_fee),
  currency char(3) not null default 'IQD',
  -- {full_name, phone, governorate, city, address, notes}
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  tracking_number text check (char_length(tracking_number) <= 120),
  staff_note text check (char_length(staff_note) <= 2000),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index orders_status_created_at_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  -- Snapshots, so the receipt survives catalog edits.
  name_ar text not null,
  name_en text not null,
  attributes jsonb not null default '{}'::jsonb,
  unit_price bigint not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);

create trigger set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

-- ── Billing for individual customers ────────────────────────────────────────
-- Subscriptions (IDEA Plus) and payments (store orders) can belong to a
-- single user instead of an organization.

alter table public.subscriptions
  alter column organization_id drop not null,
  add column user_id uuid references auth.users (id) on delete cascade,
  add constraint subscriptions_one_owner check (num_nonnulls(organization_id, user_id) = 1);

create unique index subscriptions_one_live_per_user
  on public.subscriptions (user_id)
  where status in ('incomplete', 'active', 'past_due');

alter table public.payments
  add column order_id uuid references public.orders (id) on delete set null;

create index payments_order_id_idx on public.payments (order_id);
create index payments_user_id_created_at_idx on public.payments (user_id, created_at desc);

-- Plans belong to a product line; Plus plans also say how many items a
-- member may rent at once.
alter table public.plans
  add column audience text not null default 'business' check (audience in ('business', 'plus')),
  add column rental_slots integer check (rental_slots > 0),
  add column features_ar text[] not null default '{}',
  add column features_en text[] not null default '{}',
  add column position integer not null default 0,
  add constraint plans_plus_slots check (audience <> 'plus' or rental_slots is not null);

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- Turns the caller's cart into a pending order, priced from the catalog.
-- Raises if the cart is empty or an item is unavailable or out of stock.
create function public.create_order(shipping jsonb)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  settings public.store_settings;
  line record;
  order_subtotal bigint := 0;
  fee bigint;
  created public.orders;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or coalesce(trim(shipping ->> 'governorate'), '') = ''
    or coalesce(trim(shipping ->> 'address'), '') = ''
    or char_length(shipping::text) > 4000
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.cart_items where user_id = caller) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock.
  for line in
    select
      c.quantity,
      p.status,
      p.kind,
      coalesce(v.price_override, p.price) as unit_price,
      case when v.id is null then p.stock_count else v.stock_count end as stock
    from public.cart_items c
    join public.products p on p.id = c.product_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = caller
    for update of p
  loop
    if line.status <> 'active' or line.kind <> 'sale' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;
    if line.quantity > line.stock then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;
    order_subtotal := order_subtotal + line.unit_price * line.quantity;
  end loop;

  select * into settings from public.store_settings;
  fee := case
    when settings.free_shipping_threshold is not null
      and order_subtotal >= settings.free_shipping_threshold then 0
    else settings.shipping_fee
  end;

  insert into public.orders (user_id, subtotal, shipping_fee, total, shipping_address)
  values (
    caller,
    order_subtotal,
    fee,
    order_subtotal + fee,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', left(trim(shipping ->> 'governorate'), 60),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    )
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id,
    p.id,
    v.id,
    p.name_ar,
    p.name_en,
    coalesce(v.attributes, '{}'::jsonb),
    coalesce(v.price_override, p.price),
    c.quantity
  from public.cart_items c
  join public.products p on p.id = c.product_id
  left join public.product_variants v on v.id = c.variant_id
  where c.user_id = caller;

  delete from public.cart_items where user_id = caller;

  return created;
end;
$$;

-- Lets a customer cancel their own order before it is paid.
create function public.cancel_order(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
  set status = 'cancelled'
  where id = order_id and user_id = (select auth.uid()) and status = 'pending';

  if not found then
    raise exception 'Order not found or no longer cancellable' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Marks an order paid and takes its items out of stock. Server only: called
-- by the billing service after a verified, re-read payment. Idempotent.
create function public.complete_order_payment(order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.orders;
begin
  select * into target from public.orders o where o.id = order_id for update;

  if not found or target.status not in ('pending', 'cancelled') then
    return;
  end if;

  update public.orders
  set status = 'paid', paid_at = now()
  where id = target.id;

  update public.product_variants v
  set stock_count = greatest(v.stock_count - i.quantity, 0)
  from public.order_items i
  where i.order_id = target.id and i.variant_id = v.id;

  update public.products p
  set stock_count = greatest(p.stock_count - i.quantity, 0)
  from public.order_items i
  where i.order_id = target.id and i.variant_id is null and i.product_id = p.id;
end;
$$;

-- Staff move orders forward through fulfilment; only the payment webhook
-- (service role) marks them paid, and refunds go through the payments flow.
create function private.guard_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    -- Direct updates by signed-in users; RPCs and server code run as other roles.
    and current_user = 'authenticated'
    and not (
      (old.status = 'pending' and new.status = 'cancelled')
      or (old.status = 'paid' and new.status in ('processing', 'shipped'))
      or (old.status = 'processing' and new.status = 'shipped')
      or (old.status = 'shipped' and new.status = 'delivered')
    )
  then
    raise exception 'Order status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_order_status before update on public.orders
  for each row execute function private.guard_order_status();

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.cart_items enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Categories are public"
  on public.product_categories for select to anon, authenticated
  using (true);

create policy "Admins manage categories"
  on public.product_categories for all to authenticated
  using (private.has_staff_role('{admin}'))
  with check (private.has_staff_role('{admin}'));

create policy "Active products are public; staff see all"
  on public.products for select to anon, authenticated
  using (status = 'active' or private.is_staff());

create policy "Admins manage products"
  on public.products for all to authenticated
  using (private.has_staff_role('{admin}'))
  with check (private.has_staff_role('{admin}'));

create policy "Variants of visible products are public"
  on public.product_variants for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.status = 'active' or private.is_staff())
    )
  );

create policy "Admins manage variants"
  on public.product_variants for all to authenticated
  using (private.has_staff_role('{admin}'))
  with check (private.has_staff_role('{admin}'));

create policy "Users manage their own cart"
  on public.cart_items for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Store settings are public"
  on public.store_settings for select to anon, authenticated
  using (true);

create policy "Admins edit store settings"
  on public.store_settings for update to authenticated
  using (private.has_staff_role('{admin}'))
  with check (private.has_staff_role('{admin}'));

create policy "Customers see their orders; staff see all"
  on public.orders for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_staff_role('{support,finance}')
  );

create policy "Support updates order fulfilment"
  on public.orders for update to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create policy "Order items follow their order"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.user_id = (select auth.uid()) or private.has_staff_role('{support,finance}'))
    )
  );

-- Individual subscriptions and payments.
create policy "Users see their own subscription"
  on public.subscriptions for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{support,finance}'));

create policy "Users see their own payments"
  on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{finance}'));

create policy "Admins manage plans"
  on public.plans for all to authenticated
  using (private.has_staff_role('{admin}'))
  with check (private.has_staff_role('{admin}'));

create policy "Staff see every plan"
  on public.plans for select to authenticated
  using (private.is_staff());

create trigger audit_products after insert or update or delete on public.products
  for each row execute function private.audit_change();
create trigger audit_orders after update on public.orders
  for each row execute function private.audit_change();
create trigger audit_store_settings after update on public.store_settings
  for each row execute function private.audit_change();

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.product_categories, public.products, public.product_variants,
  public.cart_items, public.store_settings, public.orders, public.order_items
  from anon, authenticated;

grant select on public.product_categories, public.products, public.product_variants,
  public.store_settings to anon, authenticated;

grant insert, update, delete on public.product_categories, public.products,
  public.product_variants to authenticated;
grant update (shipping_fee, free_shipping_threshold) on public.store_settings to authenticated;

grant select, delete on public.cart_items to authenticated;
grant insert (product_id, variant_id, quantity, user_id) on public.cart_items to authenticated;
grant update (quantity) on public.cart_items to authenticated;

grant select on public.orders, public.order_items to authenticated;
grant update (status, tracking_number, staff_note) on public.orders to authenticated;

grant insert, update, delete on public.plans to authenticated;

grant all on public.product_categories, public.products, public.product_variants,
  public.cart_items, public.store_settings, public.orders, public.order_items
  to service_role;

revoke all on function public.create_order(jsonb) from public, anon;
revoke all on function public.cancel_order(uuid) from public, anon;
revoke all on function public.complete_order_payment(uuid) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to authenticated;
grant execute on function public.cancel_order(uuid) to authenticated;
grant execute on function public.complete_order_payment(uuid) to service_role;
