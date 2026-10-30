-- Digital codes (owner's master brief, section 15): gift cards and store
-- codes from a supplier (Reloadly first; LikeCard and Golden Codes later),
-- sold on the website only.
--
-- * Brands and denominations: a brand is one store in one region
--   ("PlayStation · US store"), each denomination its face value and the
--   supplier's product. Its price in IQD is the supplier's USD cost at
--   The IDEA's rate plus a margin (Staff sets both; a denomination can
--   carry its own margin), rounded up to 250. Members see brands,
--   denominations and prices, never costs or supplier ids.
-- * Which store a member's account is on, per platform, remembered from
--   the first purchase (`digital_store_regions`).
-- * The cart holds codes (`cart_digital`). Checkout prices them, online
--   only, for a Pass with a verified phone, without Bulbs, discounts or
--   cashback; a Pass in its first days buys up to a lower limit.
-- * `digital_codes`: one row per code bought. Once paid, a code is to buy
--   (or held for Staff, on a large first order); the API's job takes
--   codes to buy from the supplier and stores each one. A member reveals
--   a code with a deliberate tap (`reveal_digital_code`); the code and
--   PIN are never readable from the table. A code the supplier marks
--   invalid is replaced by a new one. Every step is logged in
--   `digital_code_events`.
-- * Supplier API keys live only in apps/api.

-- ── Settings ───────────────────────────────────────────────────────────────

alter table public.store_settings
  add column digital_iqd_per_usd numeric(10, 2) not null default 1310 check (digital_iqd_per_usd > 0),
  add column digital_margin_rate numeric(5, 2) not null default 8 check (digital_margin_rate between 0 and 100),
  add column digital_new_pass_days integer not null default 30 check (digital_new_pass_days >= 0),
  add column digital_new_pass_limit bigint not null default 50000 check (digital_new_pass_limit >= 0),
  add column digital_hold_above bigint not null default 100000 check (digital_hold_above >= 0);

comment on column public.store_settings.digital_iqd_per_usd is
  'Digital codes: IQD per USD for supplier costs.';
comment on column public.store_settings.digital_margin_rate is
  'Digital codes: the margin on the supplier cost, in percent (a denomination may set its own).';
comment on column public.store_settings.digital_new_pass_days is
  'Digital codes: how many days a Pass counts as new.';
comment on column public.store_settings.digital_new_pass_limit is
  'Digital codes: the most a new Pass buys in codes, in IQD.';
comment on column public.store_settings.digital_hold_above is
  'Digital codes: a first order of codes above this (IQD) waits for Staff.';

-- ── Brands and denominations ───────────────────────────────────────────────

create table public.digital_brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name_en text not null check (char_length(name_en) between 1 and 120),
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  kind text not null check (kind in ('gaming', 'streaming', 'app_store', 'books', 'music', 'other')),
  -- The store a code works in, which a member's account must be on
  -- (playstation, xbox, nintendo, steam, apple, google, …).
  platform text check (platform ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  region text not null check (region ~ '^[A-Z]{2}$|^GLOBAL$'),
  region_en text not null check (char_length(region_en) between 1 and 60),
  region_ar text not null check (char_length(region_ar) between 1 and 60),
  image_path text check (char_length(image_path) <= 500),
  redeem_en text check (char_length(redeem_en) <= 4000),
  redeem_ar text check (char_length(redeem_ar) <= 4000),
  active boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.digital_brands is
  'A store or service in one region whose codes The IDEA sells ("PlayStation · US store").';

create table public.digital_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.digital_brands (id) on delete cascade,
  supplier text not null check (supplier in ('reloadly', 'likecard', 'golden_codes')),
  supplier_product_id text not null check (char_length(supplier_product_id) between 1 and 120),
  face_value numeric(10, 2) not null check (face_value > 0),
  face_currency char(3) not null check (face_currency ~ '^[A-Z]{3}$'),
  cost_usd numeric(10, 2) not null check (cost_usd > 0),
  margin_rate numeric(5, 2) check (margin_rate between 0 and 100),
  -- Set by a trigger from the cost, the rate and the margin.
  price bigint not null default 0 check (price >= 0),
  active boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (supplier, supplier_product_id, face_value)
);

comment on table public.digital_products is
  'A denomination of a brand, from a supplier, priced in IQD from its cost.';

create index digital_products_brand_idx on public.digital_products (brand_id);

create trigger set_updated_at before update on public.digital_brands
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.digital_products
  for each row execute function private.set_updated_at();

-- The IQD price of a cost in USD, with a margin, rounded up to 250.
create function private.digital_price(cost_usd numeric, margin_rate numeric)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select (ceil(
    cost_usd * s.digital_iqd_per_usd * (1 + coalesce(margin_rate, s.digital_margin_rate) / 100) / 250
  ) * 250)::bigint
  from public.store_settings s;
$$;

create function private.set_digital_price()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.price := private.digital_price(new.cost_usd, new.margin_rate);
  return new;
end;
$$;

create trigger set_digital_price before insert or update on public.digital_products
  for each row execute function private.set_digital_price();

-- A new rate or margin reprices every denomination.
create function private.reprice_digital()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.digital_iqd_per_usd is distinct from old.digital_iqd_per_usd
    or new.digital_margin_rate is distinct from old.digital_margin_rate
  then
    update public.digital_products set price = 0;
  end if;
  return null;
end;
$$;

create trigger reprice_digital after update on public.store_settings
  for each row execute function private.reprice_digital();

-- A denomination's name on an order line: "PlayStation · US store · USD 20".
create function private.digital_name(brand public.digital_brands, product public.digital_products, lang text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when lang = 'ar' then brand.name_ar else brand.name_en end
    || ' · ' || case when lang = 'ar' then brand.region_ar else brand.region_en end
    || ' · ' || product.face_currency || ' ' || trim_scale(product.face_value)::text;
$$;

alter table public.digital_brands enable row level security;
alter table public.digital_products enable row level security;

create policy "Everyone sees active brands, staff see all" on public.digital_brands
  for select to anon, authenticated using (active or (select private.is_staff()));
create policy "Editors and finance add brands" on public.digital_brands
  for insert to authenticated
  with check ((select private.has_staff_role('{admin,editor,finance}'::public.staff_role[])));
create policy "Editors and finance edit brands" on public.digital_brands
  for update to authenticated
  using ((select private.has_staff_role('{admin,editor,finance}'::public.staff_role[])))
  with check ((select private.has_staff_role('{admin,editor,finance}'::public.staff_role[])));
create policy "Editors and finance remove brands" on public.digital_brands
  for delete to authenticated
  using ((select private.has_staff_role('{admin,editor,finance}'::public.staff_role[])));

create policy "Everyone sees active denominations, staff see all" on public.digital_products
  for select to anon, authenticated using (
    (active and exists (select 1 from public.digital_brands b where b.id = brand_id and b.active))
    or (select private.is_staff())
  );
-- Costs and margins are set by staff (finance) and the supplier sync.
create policy "Finance edits denominations" on public.digital_products
  for update to authenticated
  using ((select private.has_staff_role('{admin,finance}'::public.staff_role[])))
  with check ((select private.has_staff_role('{admin,finance}'::public.staff_role[])));

revoke all on public.digital_brands from anon, authenticated;
grant select on public.digital_brands to anon, authenticated;
grant insert, update, delete on public.digital_brands to authenticated;
grant all on public.digital_brands to service_role;

-- Members see prices, never costs or the supplier's ids.
revoke all on public.digital_products from anon, authenticated;
grant select (id, brand_id, face_value, face_currency, price, active, position) on public.digital_products
  to anon, authenticated;
grant update (margin_rate, active, position) on public.digital_products to authenticated;
grant all on public.digital_products to service_role;

-- Staff see the whole denomination, with its cost.
create function private.staff_digital_products()
returns setof public.digital_products
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.digital_products p
  where (select private.has_staff_role('{admin,finance,editor,support}'::public.staff_role[]))
  order by p.brand_id, p.position, p.face_value;
$$;

-- ── Which store a member's account is on ───────────────────────────────────

create table public.digital_store_regions (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  region text not null check (region ~ '^[A-Z]{2}$|^GLOBAL$'),
  updated_at timestamptz not null default now(),
  primary key (user_id, platform)
);

comment on table public.digital_store_regions is
  'The store region a member''s account is on, per platform, asked once at checkout.';

create trigger set_updated_at before update on public.digital_store_regions
  for each row execute function private.set_updated_at();

alter table public.digital_store_regions enable row level security;

create policy "Members see their store regions" on public.digital_store_regions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members add their store regions" on public.digital_store_regions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members change their store regions" on public.digital_store_regions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members remove their store regions" on public.digital_store_regions
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.digital_store_regions from anon, authenticated;
grant select, insert, update, delete on public.digital_store_regions to authenticated;
grant all on public.digital_store_regions to service_role;

-- ── The cart ───────────────────────────────────────────────────────────────

create table public.cart_digital (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.digital_products (id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

comment on table public.cart_digital is 'Digital codes in a member''s cart.';

create index cart_digital_product_idx on public.cart_digital (product_id);

-- Only codes on sale go in the cart.
create function private.check_cart_digital()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.digital_products p
    join public.digital_brands b on b.id = p.brand_id
    where p.id = new.product_id and p.active and b.active
  ) then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  return new;
end;
$$;

create trigger check_cart_digital before insert or update of product_id on public.cart_digital
  for each row execute function private.check_cart_digital();

alter table public.cart_digital enable row level security;

create policy "Members see their codes in the cart" on public.cart_digital
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members add codes to the cart" on public.cart_digital
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Members change codes in the cart" on public.cart_digital
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Members remove codes from the cart" on public.cart_digital
  for delete to authenticated using (user_id = (select auth.uid()));

revoke all on public.cart_digital from anon, authenticated;
grant select, insert, update, delete on public.cart_digital to authenticated;
grant all on public.cart_digital to service_role;

-- ── Order lines and codes ──────────────────────────────────────────────────

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check check (
  kind = any (array['sale', 'rental', 'deposit', 'keep', 'swap', 'kit', 'survey', 'plus', 'program', 'digital'])
);
alter table public.order_items
  add column digital_product_id uuid references public.digital_products (id) on delete set null;
create index order_items_digital_product_idx on public.order_items (digital_product_id);

create table public.digital_codes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid references public.digital_products (id) on delete set null,
  supplier text not null check (supplier in ('reloadly', 'likecard', 'golden_codes')),
  -- unpaid → pending (to buy) or held (for Staff) → buying → delivered,
  -- or failed; a delivered code may turn out invalid and be replaced.
  status text not null default 'unpaid' check (
    status in ('unpaid', 'held', 'pending', 'buying', 'delivered', 'failed', 'invalid', 'cancelled')
  ),
  -- Never readable by members or staff from the table.
  code text check (char_length(code) <= 500),
  pin text check (char_length(pin) <= 200),
  serial text check (char_length(serial) <= 200),
  transaction_id text check (char_length(transaction_id) <= 200),
  failure text check (char_length(failure) <= 1000),
  replaces_id uuid references public.digital_codes (id) on delete set null,
  bought_at timestamptz,
  delivered_at timestamptz,
  revealed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'delivered' or code is not null)
);

comment on table public.digital_codes is
  'A digital code bought in an order. Its code and PIN are read only through reveal_digital_code.';

create index digital_codes_order_idx on public.digital_codes (order_id);
create index digital_codes_order_item_idx on public.digital_codes (order_item_id);
create index digital_codes_user_idx on public.digital_codes (user_id);
create index digital_codes_product_idx on public.digital_codes (product_id);
create index digital_codes_replaces_idx on public.digital_codes (replaces_id);
create index digital_codes_to_buy_idx on public.digital_codes (created_at) where status = 'pending';

create trigger set_updated_at before update on public.digital_codes
  for each row execute function private.set_updated_at();

create table public.digital_code_events (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.digital_codes (id) on delete cascade,
  event text not null check (event in (
    'ordered', 'paid', 'held', 'released', 'buying', 'delivered', 'failed', 'revealed',
    'invalid', 'replaced', 'cancelled'
  )),
  actor_id uuid references auth.users (id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.digital_code_events is 'Every step of every digital code, for fraud checks and support.';

create index digital_code_events_code_idx on public.digital_code_events (code_id);
create index digital_code_events_actor_idx on public.digital_code_events (actor_id);

create function private.log_digital_code(code uuid, event text, data jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.digital_code_events (code_id, event, actor_id, data)
  values (code, event, (select auth.uid()), coalesce(data, '{}'::jsonb));
$$;

-- Each new code is logged as ordered.
create function private.on_digital_code_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_digital_code(new.id, 'ordered', jsonb_build_object('order_id', new.order_id));
  return null;
end;
$$;

create trigger log_digital_code_created after insert on public.digital_codes
  for each row execute function private.on_digital_code_created();

alter table public.digital_codes enable row level security;
alter table public.digital_code_events enable row level security;

create policy "Members see their codes, staff see all" on public.digital_codes
  for select to authenticated using (
    user_id = (select auth.uid())
    or (select private.has_staff_role('{admin,finance,support}'::public.staff_role[]))
  );
create policy "Staff see code events" on public.digital_code_events
  for select to authenticated
  using ((select private.has_staff_role('{admin,finance,support}'::public.staff_role[])));

revoke all on public.digital_codes from anon, authenticated;
grant select (
  id, order_id, order_item_id, user_id, product_id, status, failure, replaces_id,
  bought_at, delivered_at, revealed_at, created_at
) on public.digital_codes to authenticated;
grant all on public.digital_codes to service_role;

revoke all on public.digital_code_events from anon, authenticated;
grant select on public.digital_code_events to authenticated;
grant all on public.digital_code_events to service_role;

-- ── Paying, holding and cancelling ─────────────────────────────────────────

-- Paid: the order's codes are to buy, or wait for Staff when it is the
-- member's first order of codes and above the hold. Cancelled or
-- refunded before buying: they are cancelled.
create function private.on_digital_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hold boolean;
  item record;
begin
  if new.status is not distinct from old.status
    or not exists (select 1 from public.digital_codes c where c.order_id = new.id)
  then
    return null;
  end if;

  if new.status = 'paid' then
    hold := not exists (
      select 1 from public.digital_codes c
      where c.user_id = new.user_id and c.order_id <> new.id and c.status = 'delivered'
    ) and (
      select coalesce(sum(i.unit_price * i.quantity), 0) from public.order_items i
      where i.order_id = new.id and i.kind = 'digital'
    ) > (select s.digital_hold_above from public.store_settings s);
    for item in
      update public.digital_codes set status = case when hold then 'held' else 'pending' end
      where order_id = new.id and status = 'unpaid'
      returning id
    loop
      perform private.log_digital_code(item.id, case when hold then 'held' else 'paid' end);
    end loop;
  elsif new.status in ('cancelled', 'refunded') then
    for item in
      update public.digital_codes set status = 'cancelled'
      where order_id = new.id and status in ('unpaid', 'held', 'pending')
      returning id
    loop
      perform private.log_digital_code(item.id, 'cancelled');
    end loop;
  end if;
  return null;
end;
$$;

create trigger on_digital_order_status after update of status on public.orders
  for each row execute function private.on_digital_order_status();

-- Staff release a held order's codes to be bought.
create function private.release_digital_codes(target_order uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  released integer := 0;
  item record;
begin
  if not (select private.has_staff_role('{admin,finance,support}'::public.staff_role[])) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  for item in
    update public.digital_codes set status = 'pending'
    where order_id = target_order and status = 'held'
    returning id
  loop
    perform private.log_digital_code(item.id, 'released');
    released := released + 1;
  end loop;
  return released;
end;
$$;

-- ── Buying from the supplier (the API's job) ───────────────────────────────

-- Codes to buy now, oldest first, marked as being bought.
create function public.take_digital_codes(batch integer default 20)
returns table (
  code_id uuid, order_id uuid, supplier text, supplier_product_id text,
  face_value numeric, face_currency char(3), user_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  item record;
  taken uuid[] := '{}'::uuid[];
begin
  for item in
    select c.id from public.digital_codes c
    where c.status = 'pending'
    order by c.created_at
    limit greatest(1, least(coalesce(batch, 20), 100))
    for update skip locked
  loop
    update public.digital_codes set status = 'buying', bought_at = now() where id = item.id;
    perform private.log_digital_code(item.id, 'buying');
    taken := taken || item.id;
  end loop;
  return query
    select c.id, c.order_id, c.supplier, p.supplier_product_id, p.face_value, p.face_currency, c.user_id
    from public.digital_codes c
    join public.digital_products p on p.id = c.product_id
    where c.id = any (taken)
    order by c.created_at;
end;
$$;

-- The supplier's code for one being bought: delivered, and the member is
-- told it's ready in Pass → Orders.
create function public.deliver_digital_code(
  target uuid,
  code text,
  pin text default null,
  serial text default null,
  transaction_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.digital_codes;
  item public.order_items;
begin
  select * into found from public.digital_codes c where c.id = target for update;
  if found.id is null or found.status <> 'buying' then
    raise exception 'Not being bought' using errcode = 'check_violation';
  end if;
  if coalesce(trim(deliver_digital_code.code), '') = '' then
    raise exception 'A code is needed' using errcode = 'check_violation';
  end if;
  update public.digital_codes set
    status = 'delivered', code = trim(deliver_digital_code.code),
    pin = nullif(trim(deliver_digital_code.pin), ''),
    serial = nullif(trim(deliver_digital_code.serial), ''),
    transaction_id = deliver_digital_code.transaction_id,
    delivered_at = now(), failure = null
  where id = target;
  perform private.log_digital_code(target, 'delivered', jsonb_build_object('transaction_id', transaction_id));
  select * into item from public.order_items i where i.id = found.order_item_id;
  perform private.notify(
    found.user_id, 'order', 'digital_code_ready',
    jsonb_build_object('name_en', item.name_en, 'name_ar', item.name_ar,
      'number', (select o.number from public.orders o where o.id = found.order_id)),
    '/pass/orders/' || found.order_id
  );
end;
$$;

-- The supplier couldn't sell it: failed, for Staff to retry or refund.
create function public.fail_digital_code(target uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.digital_codes set status = 'failed', failure = left(coalesce(reason, ''), 1000)
  where id = target and status = 'buying';
  if found then
    perform private.log_digital_code(target, 'failed', jsonb_build_object('reason', left(coalesce(reason, ''), 1000)));
  end if;
end;
$$;

-- Staff try a failed code again.
create function private.retry_digital_code(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.has_staff_role('{admin,finance,support}'::public.staff_role[])) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.digital_codes set status = 'pending' where id = target and status in ('failed', 'buying');
  if not found then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;
  perform private.log_digital_code(target, 'released', '{"retry":true}'::jsonb);
end;
$$;

-- A delivered code the supplier marks invalid: The IDEA replaces it with
-- a new one of the same denomination.
create function private.replace_digital_code(target uuid, reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.digital_codes;
  made uuid;
begin
  if not (
    (select auth.role()) = 'service_role'
    or (select private.has_staff_role('{admin,finance,support}'::public.staff_role[]))
  ) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into found from public.digital_codes c where c.id = target for update;
  if found.id is null or found.status <> 'delivered' then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;
  update public.digital_codes set status = 'invalid', failure = left(coalesce(reason, ''), 1000)
  where id = target;
  perform private.log_digital_code(target, 'invalid', jsonb_build_object('reason', left(coalesce(reason, ''), 1000)));
  insert into public.digital_codes (order_id, order_item_id, user_id, product_id, supplier, status, replaces_id)
  values (found.order_id, found.order_item_id, found.user_id, found.product_id, found.supplier, 'pending', found.id)
  returning id into made;
  perform private.log_digital_code(target, 'replaced', jsonb_build_object('replacement', made));
  return made;
end;
$$;

-- ── Revealing ──────────────────────────────────────────────────────────────

-- The member's deliberate tap: the code and PIN, and from then on it
-- can't be returned.
create function private.reveal_digital_code(target uuid)
returns table (code text, pin text, serial text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.digital_codes;
begin
  select * into found from public.digital_codes c
  where c.id = target and c.user_id = (select auth.uid());
  if found.id is null or found.status <> 'delivered' then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;
  if found.revealed_at is null then
    update public.digital_codes set revealed_at = now() where id = target;
  end if;
  perform private.log_digital_code(target, 'revealed');
  return query select found.code, found.pin, found.serial;
end;
$$;

-- A revealed code can't be returned.
create function private.check_digital_return()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.digital_codes c
    where c.order_item_id = new.order_item_id and c.revealed_at is not null
  ) then
    raise exception 'A revealed code can''t be returned' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_digital_return before insert on public.returns
  for each row execute function private.check_digital_return();

-- The member's store region for a platform, remembered for next time.
create function private.set_digital_store_region(platform text, region text)
returns public.digital_store_regions
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.digital_store_regions;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  insert into public.digital_store_regions as r (user_id, platform, region)
  values (
    (select auth.uid()),
    lower(trim(set_digital_store_region.platform)),
    upper(trim(set_digital_store_region.region))
  )
  on conflict on constraint digital_store_regions_pkey do update set region = excluded.region
  returning * into saved;
  return saved;
end;
$$;

-- ── Checkout ───────────────────────────────────────────────────────────────

create or replace function private.create_order(shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0, gift boolean DEFAULT false)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
  rental jsonb;
  copy public.stock_items;
  made public.rentals;
  kit jsonb;
  kit_unit uuid;
  booking public.kit_bookings;
  plus_gift jsonb;
  months integer;
  program jsonb;
  only_programs boolean;
  won jsonb;
  code_line jsonb;
  line_id uuid;
  ships boolean := exists (select 1 from public.cart_items c where c.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_kits k where k.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_auctions a where a.user_id = (select auth.uid()));
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  -- Ages: a date of birth is needed to buy; 13–17-year-olds buy with
  -- their guardian's approval, and never PEGI 18 items.
  if (select p.birthday from public.profiles p where p.id = caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.cart_items c
      join public.products p on p.id = c.product_id
      where c.user_id = caller and p.age_rating = 18
    ) then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
  end if;

  if create_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

  -- A gift is paid now and its address comes later, from the recipient
  -- (claim_gift): the buyer only picks the area it goes to.
  if gift then
    if create_order.payment_method is distinct from 'online' then
      raise exception 'Gifts are paid online or with Bulbs' using errcode = 'check_violation';
    end if;
    -- Plus months on their own go to the recipient's Pass, not an area.
    if delivery_zone is null and ships then
      raise exception 'Choose where the gift goes' using errcode = 'check_violation';
    end if;
  elsif not ships and create_order.payment_method is not null then
    -- Nothing is delivered (program installments): no address needed.
    null;
  elsif create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
    -- Without a chosen zone, the governorate finds it.
    or (wanted = '' and delivery_zone is null)
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock, and
  -- the member's Bulbs so concurrent checkouts wait for each other.
  perform 1 from public.products p
  where p.id in (select c.product_id from public.cart_items c where c.user_id = caller)
  order by p.id
  for update;
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
  end if;
  -- And won auctions, so one can't be ordered twice at once.
  perform 1 from public.auctions a
  where a.id in (select c.auction_id from public.cart_auctions c where c.user_id = caller)
  order by a.id
  for update;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );
  -- A rental comes back to whoever rented it, so it isn't a gift (yet).
  if gift and jsonb_array_length(quote -> 'rentals') > 0 then
    raise exception 'Rentals can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  kit := nullif(quote -> 'kit', 'null'::jsonb);
  -- Starting Plus for yourself is the plan page's own checkout.
  plus_gift := nullif(quote -> 'plus_gift', 'null'::jsonb);
  if plus_gift is not null and not gift then
    raise exception 'Plus months are sent as a gift' using errcode = 'check_violation';
  end if;
  -- Program installments are paid by the applicant, never as a gift; a
  -- minor's were approved with the application.
  if jsonb_array_length(quote -> 'programs') > 0 and gift then
    raise exception 'Programs can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  -- A code goes to the buyer's own Pass.
  if jsonb_array_length(quote -> 'digital') > 0 and gift then
    raise exception 'Codes can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  only_programs := jsonb_array_length(quote -> 'programs') > 0
    and jsonb_array_length(quote -> 'digital') = 0
    and jsonb_array_length(quote -> 'lines') = 0
    and jsonb_array_length(quote -> 'auctions') = 0
    and jsonb_array_length(quote -> 'rentals') = 0
    and kit is null and plus_gift is null;
  if kit is not null then
    if gift then
      raise exception 'Kits can''t be sent as gifts' using errcode = 'check_violation';
    end if;
    if not private.is_adult(caller) then
      raise exception 'You need to be 18 or over' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status, is_gift
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    case when gift then jsonb_strip_nulls(jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    )) when not ships then jsonb_strip_nulls(jsonb_build_object(
      'full_name', nullif(left(trim(coalesce(shipping ->> 'full_name', '')), 120), ''),
      'phone', case when shipping ->> 'phone' ~ '^\+[1-9][0-9]{7,14}$' then shipping ->> 'phone' end
    )) else jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      -- A zone that isn't a whole governorate is named instead.
      'governorate', coalesce(
        quote ->> 'zone_governorate',
        nullif(left(trim(shipping ->> 'governorate'), 60), ''),
        quote ->> 'zone_name_en'
      ),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
    ) || case
      when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor and only_programs then 'approved' when minor then 'pending' end,
    gift
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
    attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.seller_id, l.seller_name, l.condition,
    l.name_ar, l.name_en, l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    seller_id uuid,
    seller_name text,
    condition public.product_condition,
    quantity integer,
    unit_price bigint,
    name_ar text,
    name_en text,
    attributes jsonb
  );

  -- Won auctions: a line each, at the final price, for the copy held.
  for won in select * from jsonb_array_elements(quote -> 'auctions') loop
    insert into public.order_items (
      order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
      attributes, unit_price, quantity, auction_id
    )
    values (
      created.id, (won ->> 'product_id')::uuid, (won ->> 'variant_id')::uuid,
      (won ->> 'seller_id')::uuid, won ->> 'seller_name',
      (won ->> 'condition')::public.product_condition, won ->> 'name_ar', won ->> 'name_en',
      won -> 'attributes', (won ->> 'unit_price')::bigint, 1, (won ->> 'auction_id')::uuid
    );
  end loop;

  -- Rent lines: a copy held for each, its rental and its rent and
  -- deposit lines (as create_rentals_order).
  for rental in select * from jsonb_array_elements(quote -> 'rentals') loop
    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = (rental ->> 'product_id')::uuid and v.active
      and (rental ->> 'variant_id' is null or s.variant_id = (rental ->> 'variant_id')::uuid)
      and s.purpose = 'rental' and s.status = 'available'
    order by s.created_at
    limit 1
    for update of s skip locked;
    if copy.id is null then
      raise exception 'All copies are rented out' using errcode = 'check_violation';
    end if;

    insert into public.rentals (
      user_id, product_id, variant_id, name_ar, name_en, kind, order_id, days, late_fee, deposit
    )
    values (
      caller, (rental ->> 'product_id')::uuid, copy.variant_id, rental ->> 'name_ar',
      rental ->> 'name_en', 'single', created.id, (rental ->> 'days')::integer,
      (rental ->> 'late_fee')::bigint, (rental ->> 'deposit')::bigint
    )
    returning * into made;

    update public.stock_items set status = 'rented', rental_id = made.id where id = copy.id;

    insert into public.order_items (
      order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
    )
    values
      (created.id, made.product_id, copy.variant_id, copy.condition,
        made.name_ar || ' (إيجار ' || made.days || case when made.days between 3 and 10 then ' أيام)' else ' يومًا)' end,
        made.name_en || ' (rent, ' || made.days || ' days)',
        (rental ->> 'price')::bigint, 1, 'rental', made.id),
      (created.id, made.product_id, copy.variant_id, copy.condition,
        'تأمين قابل للاسترداد: ' || made.name_ar, 'Refundable deposit: ' || made.name_en,
        made.deposit, 1, 'deposit', made.id);
  end loop;

  -- The kit: a free unit for the weekend and its extra days, the games
  -- chosen, and its price and deposit lines (as book_kit).
  if kit is not null then
    kit_unit := private.free_kit_unit(
      kit ->> 'kit_type',
      (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer
    );
    if kit_unit is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
    values (
      caller, kit ->> 'kit_type', kit_unit, (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer,
      (kit ->> 'extra_days')::integer, created.id, (kit ->> 'deposit')::bigint
    )
    returning * into booking;
    insert into public.kit_booking_games (booking_id, product_id)
    select booking.id, g::uuid from jsonb_array_elements_text(kit -> 'games') g;

    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (kit ->> 'name_ar') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'name_en') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'price')::bigint, 1, 'kit'
    );
    if (kit ->> 'deposit')::bigint > 0 then
      insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
      values (
        created.id, 'تأمين قابل للاسترداد: ' || (kit ->> 'name_ar'),
        'Refundable deposit: ' || (kit ->> 'name_en'), (kit ->> 'deposit')::bigint, 1, 'deposit'
      );
    end if;
  end if;

  -- Plus months: one line, and the months the recipient claims.
  if plus_gift is not null then
    months := (plus_gift ->> 'months')::integer;
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      coalesce(plus_gift ->> 'name_ar', plus_gift ->> 'name') || ' · ' || case
        when months = 1 then 'شهر واحد'
        when months = 2 then 'شهران'
        when months between 3 and 10 then months || ' أشهر'
        else months || ' شهرًا'
      end,
      (plus_gift ->> 'name') || ' · ' || months
        || case when months = 1 then ' month' else ' months' end,
      (plus_gift ->> 'price')::bigint, 1, 'plus'
    );
    insert into public.plus_gift_months (order_id, plan_id, months)
    values (created.id, plus_gift ->> 'plan_id', months);
  end if;

  -- Program installments: one line each, and the installments it pays.
  for program in select * from jsonb_array_elements(quote -> 'programs') loop
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (program ->> 'title_ar') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · الدفعة ' || (program -> 'positions' ->> 0) || ' من ' || (program ->> 'installments')
        else
          ' · الدفعات ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' من ' || (program ->> 'installments')
      end,
      (program ->> 'title_en') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · installment ' || (program -> 'positions' ->> 0) || ' of ' || (program ->> 'installments')
        else
          ' · installments ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' of ' || (program ->> 'installments')
      end,
      (program ->> 'amount')::bigint, 1, 'program'
    );
    update public.program_payments p set order_id = created.id
    where p.application_id = (program ->> 'application_id')::uuid
      and p.position in (
        select x::smallint from jsonb_array_elements_text(program -> 'positions') x
      );
  end loop;

  -- Digital codes: a line each, and one code to buy per copy once paid.
  for code_line in select * from jsonb_array_elements(quote -> 'digital') loop
    insert into public.order_items (
      order_id, name_ar, name_en, unit_price, quantity, kind, digital_product_id
    )
    values (
      created.id, code_line ->> 'name_ar', code_line ->> 'name_en',
      (code_line ->> 'unit_price')::bigint, (code_line ->> 'quantity')::integer, 'digital',
      (code_line ->> 'digital_product_id')::uuid
    )
    returning id into line_id;
    insert into public.digital_codes (order_id, order_item_id, user_id, product_id, supplier)
    select created.id, line_id, caller, (code_line ->> 'digital_product_id')::uuid, code_line ->> 'supplier'
    from generate_series(1, (code_line ->> 'quantity')::integer);
  end loop;

  delete from public.cart_items where user_id = caller;
  delete from public.cart_digital where user_id = caller;
  delete from public.cart_programs where user_id = caller;
  delete from public.cart_auctions where user_id = caller;
  delete from public.cart_kits where user_id = caller;
  delete from public.cart_plus_gifts where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- A minor's order waits for the guardian (decide_guardian_order),
  -- unless it only pays programs the guardian already approved.
  if minor and not only_programs then
    perform private.notify(
      guardian,
      'order',
      'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
    return created;
  end if;

  -- Paid in full with Bulbs: nothing to pay online, so it's paid now.
  if not cash and created.total = 0 then
    perform public.complete_order_payment(created.id);
    select * into created from public.orders o where o.id = created.id;
  end if;

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

  -- The coming weekend: hold the kit's games now.
  if kit is not null then
    perform private.hold_kit_games();
  end if;
  return created;
end;
$function$;


create or replace function private.price_checkout(member uuid, governorate text, fulfilment order_fulfilment, payment_method order_payment_method, delivery_zone uuid, use_bulbs integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  offer public.offers;
  deal_rate integer;
  student boolean := private.is_student(member);
  student_cost bigint;
  -- Plus members: the shop's Plus price, or a campaign's price before it
  -- opens to everyone.
  tier integer := private.plus_tier(member);
  plus_cost bigint;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  coupon public.coupons;
  coupon_off bigint;
  promo bigint := 0;
  source text;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
  -- Rent lines: their rent, refundable deposits and the rentals to make.
  rental record;
  rate record;
  rent_items jsonb := '[]'::jsonb;
  rentals jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  goods bigint := 0;
  item public.products;
  -- The cart's game night kit, if any.
  cart_kit public.cart_kits;
  kit_row public.kit_types;
  weekend record;
  kit jsonb;
  -- Plus months given as a gift, if any.
  cart_plus public.cart_plus_gifts;
  gift_plan public.plans;
  plus bigint := 0;
  plus_gift jsonb;
  -- Program installments, if any.
  cart_program record;
  program_lines jsonb := '[]'::jsonb;
  programs bigint := 0;
  program_amount bigint;
  program_positions smallint[];
  has_programs boolean;
  -- Won auctions, if any.
  cart_auction record;
  auction_lines jsonb := '[]'::jsonb;
  has_auctions boolean;
  -- Whether anything in the cart is delivered.
  ships boolean;
  -- Digital codes, if any: paid online, without Bulbs or discounts.
  code_row record;
  code_lines jsonb := '[]'::jsonb;
  digital bigint := 0;
  has_digital boolean;
  spent bigint;
begin
  select * into settings from public.store_settings;

  if price_checkout.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;


  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  select * into cart_kit from public.cart_kits k where k.user_id = member;
  select * into cart_plus from public.cart_plus_gifts g where g.user_id = member;
  has_auctions := exists (select 1 from public.cart_auctions c where c.user_id = member);
  ships := cart_kit.id is not null or has_auctions
    or exists (select 1 from public.cart_items where user_id = member);
  has_programs := exists (select 1 from public.cart_programs c where c.user_id = member);
  has_digital := exists (select 1 from public.cart_digital d where d.user_id = member);
  if not ships and cart_plus.user_id is null and not has_programs and not has_digital then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;
  -- Programs are paid online, never on delivery.
  if cash and has_programs then
    raise exception 'Programs are paid online' using errcode = 'check_violation';
  end if;
  -- And digital codes.
  if cash and has_digital then
    raise exception 'Digital codes are paid online' using errcode = 'check_violation';
  end if;
  -- So are won auctions: a win is paid within 48 hours.
  if cash and has_auctions then
    raise exception 'Auctions are paid online' using errcode = 'check_violation';
  end if;

  -- Plus months on their own are added to the recipient's Pass: nothing
  -- is delivered, so no zone is needed.
  if ships or delivery_zone is not null or wanted <> '' then
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

  for line in
    select
      c.product_id,
      c.variant_id,
      c.seller_id,
      sl.name as seller_name,
      sl.status as seller_status,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    join public.sellers sl on sl.id = c.seller_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = member and c.purpose = 'sale'
    order by c.created_at, c.product_id
  loop
    if line.status <> 'active' or line.seller_status <> 'approved' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity, line.seller_id) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    -- An accepted offer prices one copy of its listing for 24 hours.
    select * into offer from public.offers o
    where o.buyer_id = member and o.status = 'accepted' and o.cart_until > now()
      and o.seller_id = line.seller_id and o.variant_id = line.variant_id
      and o.condition = line.condition;
    if offer.id is not null then
      if line.quantity > 1 then
        raise exception 'An accepted offer is for one copy' using errcode = 'check_violation';
      end if;
      line_price := least(line_price, offer.amount);
    end if;

    -- A quantity deal takes its share off each copy from its quantity on.
    select d.discount_rate into deal_rate from public.quantity_deals d
    where d.seller_id = line.seller_id and d.variant_id = line.variant_id
      and d.condition = line.condition and d.min_quantity <= line.quantity
    order by d.discount_rate desc
    limit 1;
    if deal_rate is not null and offer.id is null then
      line_price := line_price - floor(line_price * deal_rate / 100)::bigint;
    else
      deal_rate := null;
    end if;

    -- A verified student pays the listing's student price when it is lower
    -- than everything above (never with an accepted offer); the shop pays it.
    student_cost := null;
    if student and offer.id is null then
      select sp.price into student_cost from public.student_prices sp
      where sp.seller_id = line.seller_id and sp.variant_id = line.variant_id
        and sp.condition = line.condition;
      if student_cost is not null and student_cost < line_price then
        line_price := student_cost;
        deal_rate := null;
      else
        student_cost := null;
      end if;
    end if;

    -- A Plus member pays the listing's Plus price (the shop pays it) or the
    -- early campaign price when it is lower still (never with an offer).
    plus_cost := null;
    if tier > 0 and offer.id is null then
      plus_cost := private.plus_price(line.seller_id, line.variant_id, line.condition, tier);
      if plus_cost is not null and plus_cost < line_price then
        line_price := plus_cost;
        deal_rate := null;
        student_cost := null;
      else
        plus_cost := null;
      end if;
    end if;

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'offer_id', offer.id,
      'deal_rate', deal_rate,
      'student_price', student_cost is not null,
      'plus_price', plus_cost is not null,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  -- Won auctions: the copy held for each, at its final price, while it can
  -- still be paid. They count as what's bought.
  for cart_auction in
    select
      a.id, a.product_id, a.variant_id, a.seller_id, a.condition, a.final_price,
      a.status as auction_status, a.pay_by, sl.name as seller_name, sl.status as seller_status,
      p.name_ar, p.name_en, coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_auctions c
    join public.auctions a on a.id = c.auction_id
    join public.products p on p.id = a.product_id
    join public.sellers sl on sl.id = a.seller_id
    left join public.product_variants v on v.id = a.variant_id
    where c.user_id = member
    order by c.created_at, c.auction_id
  loop
    if cart_auction.auction_status <> 'won' or cart_auction.pay_by <= now()
      or cart_auction.seller_status <> 'approved'
      or not exists (
        select 1 from public.bids b
        where b.auction_id = cart_auction.id and b.bidder_id = member
          and b.outcome in ('won', 'second_chance')
      )
    then
      raise exception 'This auction can''t be paid now' using errcode = 'check_violation';
    end if;
    if private.auction_awaiting_payment(cart_auction.id) then
      raise exception 'This auction is already in an order' using errcode = 'check_violation';
    end if;
    subtotal := subtotal + cart_auction.final_price;
    auction_lines := auction_lines || jsonb_build_object(
      'auction_id', cart_auction.id,
      'product_id', cart_auction.product_id,
      'variant_id', cart_auction.variant_id,
      'seller_id', cart_auction.seller_id,
      'seller_name', cart_auction.seller_name,
      'condition', cart_auction.condition,
      'unit_price', cart_auction.final_price,
      'name_ar', cart_auction.name_ar,
      'name_en', cart_auction.name_en,
      'attributes', cart_auction.attributes
    );
  end loop;

  goods := subtotal;

  -- Rent lines: 1 to 3, several only films, books and games; each priced
  -- by its rate, with a copy free to go out.
  select coalesce(jsonb_agg(
    jsonb_build_object('product', c.product_id, 'variant', c.variant_id)
    order by c.created_at, c.product_id
  ), '[]'::jsonb)
  into rent_items
  from public.cart_items c
  where c.user_id = member and c.purpose = 'rent';
  if jsonb_array_length(rent_items) > 0 then
    for rental in select * from private.rental_items(rent_items) loop
      select * into item from public.products p where p.id = rental.product;
      select * into rate from private.rental_quote(rental.product, rental.variant);
      if item.status is distinct from 'active' or rate.price is null then
        raise exception 'Item not available' using errcode = 'no_data_found';
      end if;
      if not exists (
        select 1 from public.stock_items s
        join public.product_variants v on v.id = s.variant_id
        where s.product_id = rental.product and v.active
          and (rental.variant is null or s.variant_id = rental.variant)
          and s.purpose = 'rental' and s.status = 'available'
      ) then
        raise exception 'All copies are rented out' using errcode = 'check_violation';
      end if;
      rent := rent + rate.price;
      deposits := deposits + rate.deposit;
      rentals := rentals || jsonb_build_object(
        'product_id', rental.product,
        'variant_id', rental.variant,
        'name_ar', item.name_ar,
        'name_en', item.name_en,
        'price', rate.price,
        'deposit', rate.deposit,
        'days', rate.days,
        'late_fee', rate.late_fee
      );
    end loop;
  end if;

  -- A game night kit: the weekend's price and its extra days count like
  -- rent, with its deposit (none for verified students); delivered in
  -- Baghdad only.
  if cart_kit.id is not null then
    select * into kit_row from public.kit_types k where k.id = cart_kit.kit_type and k.active;
    select * into weekend from private.kit_weekends(cart_kit.kit_type) w
    where w.starts_on = cart_kit.starts_on;
    if kit_row.id is null or weekend.starts_on is null then
      raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
    end if;
    if private.free_kit_unit(kit_row.id, cart_kit.starts_on, cart_kit.starts_on + 2 + cart_kit.extra_days) is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    if zone.governorate is distinct from 'baghdad' then
      raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
    end if;
    if private.is_student(member) then
      kit_row.deposit := 0;
    end if;
    kit := jsonb_build_object(
      'kit_type', kit_row.id,
      'name_ar', kit_row.name_ar,
      'name_en', kit_row.name_en,
      'starts_on', cart_kit.starts_on,
      'extra_days', cart_kit.extra_days,
      'games', to_jsonb(cart_kit.games),
      'price', weekend.price + cart_kit.extra_days * weekend.extra_day_price,
      'deposit', kit_row.deposit
    );
    rent := rent + (kit ->> 'price')::bigint;
    deposits := deposits + kit_row.deposit;
  end if;

  -- Plus months as a gift: the plan's monthly price for each month. They
  -- don't count towards free delivery, discounts, the giveaway cap or
  -- cashback.
  if cart_plus.user_id is not null then
    select * into gift_plan from public.plans p
    where p.id = cart_plus.plan_id and p.active and p.audience = 'plus'
      and p.billing_interval = 'month' and p.student_of is null;
    if gift_plan.id is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    plus := gift_plan.amount * cart_plus.months;
    plus_gift := jsonb_build_object(
      'plan_id', gift_plan.id,
      'name', gift_plan.name,
      'name_ar', gift_plan.name_ar,
      'months', cart_plus.months,
      'monthly', gift_plan.amount,
      'price', plus
    );
  end if;
  -- Program installments: an accepted application's next one, or
  -- everything left. Nothing is delivered; they don't count towards free
  -- delivery or discounts, and earn cashback like the rest.
  for cart_program in
    select c.application_id, c.pay_in_full, a.status, o.title_ar, o.title_en
    from public.cart_programs c
    join public.program_applications a on a.id = c.application_id
    join public.opportunities o on o.id = a.program_id
    where c.user_id = member and a.user_id = member
    order by c.created_at, c.application_id
  loop
    if cart_program.status not in ('accepted', 'confirmed') then
      raise exception 'This application can''t be paid now' using errcode = 'check_violation';
    end if;
    select coalesce(sum(d.amount), 0), array_agg(d.installment order by d.installment)
    into program_amount, program_positions
    from private.program_due(cart_program.application_id, cart_program.pay_in_full) d;
    if program_amount = 0 then
      raise exception 'Nothing to pay on this application' using errcode = 'check_violation';
    end if;
    programs := programs + program_amount;
    program_lines := program_lines || jsonb_build_object(
      'application_id', cart_program.application_id,
      'positions', to_jsonb(program_positions),
      'installments', (
        select count(*) from public.program_payments p
        where p.application_id = cart_program.application_id
      ),
      'amount', program_amount,
      'title_ar', cart_program.title_ar,
      'title_en', cart_program.title_en
    );
  end loop;

  -- Digital codes: each at its price, for a Pass with a verified phone;
  -- a Pass in its first days buys up to a lower limit. They don't count
  -- towards free delivery, discounts, the giveaway cap, Bulbs or cashback.
  if has_digital then
    if not private.has_verified_phone(member) then
      raise exception 'Verify your phone number first' using errcode = 'check_violation';
    end if;
    for code_row in
      select d.product_id, d.quantity, p.price, p.active, p.supplier,
        b.active as brand_active,
        private.digital_name(b, p, 'en') as name_en,
        private.digital_name(b, p, 'ar') as name_ar
      from public.cart_digital d
      join public.digital_products p on p.id = d.product_id
      join public.digital_brands b on b.id = p.brand_id
      where d.user_id = member
      order by d.created_at, d.product_id
    loop
      if not (code_row.active and code_row.brand_active) then
        raise exception 'A code in the cart is no longer available' using errcode = 'check_violation';
      end if;
      digital := digital + code_row.price * code_row.quantity;
      code_lines := code_lines || jsonb_build_object(
        'digital_product_id', code_row.product_id,
        'supplier', code_row.supplier,
        'quantity', code_row.quantity,
        'unit_price', code_row.price,
        'name_ar', code_row.name_ar,
        'name_en', code_row.name_en
      );
    end loop;
    if (select p.created_at from public.profiles p where p.id = member)
      > now() - make_interval(days => settings.digital_new_pass_days)
    then
      select coalesce(sum(i.unit_price * i.quantity), 0) into spent
      from public.order_items i
      join public.orders o on o.id = i.order_id
      where o.user_id = member and i.kind = 'digital'
        and o.status not in ('cancelled', 'refunded');
      if spent + digital > settings.digital_new_pass_limit then
        raise exception 'Over the limit for new Passes' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  subtotal := goods + rent + deposits + plus + programs + digital;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := coalesce(zone.fee, 0);
  -- Deposits come back, so they don't count towards the threshold.
  if zone.free_from is not null and goods + rent >= zone.free_from then
    free_reason := 'threshold';
  elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
    free_reason := 'plan';
  end if;
  if free_reason is not null then
    waived := fee;
    fee := 0;
  end if;
  if not ships then
    fee := 0;
    waived := 0;
    free_reason := null;
  end if;
  -- A kit on its own is delivered free, as before.
  if kit is not null and goods = 0 and jsonb_array_length(rentals) = 0 then
    fee := 0;
    waived := 0;
    free_reason := 'kit';
  end if;

  -- A friend's invite takes 10% off the first order (at most 15,000 IQD).
  select * into invite from public.referrals r
  where r.invitee_id = member and r.status = 'pending';
  -- Once: not after a paid order, nor while another invite order is open.
  if invite.invitee_id is not null and not exists (
    select 1 from public.orders o
    where o.user_id = member
      and (
        o.status not in ('cancelled', 'pending')
        or (o.discount_source = 'invite' and o.status <> 'cancelled')
      )
  ) then
    promo := least(floor(goods * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- A coupon applied to the cart (The IDEA pays it) replaces the invite
  -- discount when it takes more off; the cap below still holds.
  select c.* into coupon from public.cart_coupons cc
  join public.coupons c on c.id = cc.coupon_id
  where cc.user_id = member;
  -- Discounts are on what's bought; rentals keep their rates.
  if coupon.id is not null and private.coupon_problem(coupon.id, member, goods) is null then
    coupon_off := case coupon.kind
      when 'percent' then floor(goods * coupon.amount / 100)::bigint
      else coupon.amount
    end;
    coupon_off := least(coupon_off, coalesce(coupon.max_discount, coupon_off), goods);
    if coupon_off > promo then
      promo := coupon_off;
      source := 'coupon';
    end if;
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor((goods + rent + programs) * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs (1 IQD each) pay up to the whole order, from what's usable now,
  -- in steps of 250 and at least 1,000.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    -- Bulbs pay for what's bought, rented and program installments, never
    -- a deposit, and up to half of one month of gifted Plus.
    bulbs := (least(
      use_bulbs,
      goods + rent + programs + fee - promo + least(plus, coalesce(gift_plan.amount, 0) / 2)
    ) / 250 * 250)::integer;
    if bulbs < 1000 then
      bulbs := 0;
    end if;
  end if;

  total := subtotal + fee - promo - bulbs;
  max_bulbs := greatest(0, cap - waived - promo)::integer;
  -- Cashback on what's paid in money, at the member's rate, rounded.
  earn := least(
    round(
      (goods + rent + programs)
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 100
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'auctions', auction_lines,
    'rentals', rentals,
    'kit', kit,
    'plus_gift', plus_gift,
    'plus', plus,
    'programs', program_lines,
    'program_total', programs,
    'digital', code_lines,
    'digital_total', digital,
    'ships', ships,
    'goods', goods,
    'rent', rent,
    'deposits', deposits,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', zone.free_from,
    'discount', promo,
    'discount_source', source,
    'coupon_code', case when coupon.id is not null then coupon.code end,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$function$;


-- ── Wrappers and grants ────────────────────────────────────────────────────

create function public.staff_digital_products()
returns setof public.digital_products
language sql security invoker set search_path = ''
as $$ select * from private.staff_digital_products() $$;

create function public.release_digital_codes(target_order uuid)
returns integer
language sql security invoker set search_path = ''
as $$ select private.release_digital_codes(target_order) $$;

create function public.retry_digital_code(target uuid)
returns void
language sql security invoker set search_path = ''
as $$ select private.retry_digital_code(target) $$;

create function public.replace_digital_code(target uuid, reason text)
returns uuid
language sql security invoker set search_path = ''
as $$ select private.replace_digital_code(target, reason) $$;

create function public.reveal_digital_code(target uuid)
returns table (code text, pin text, serial text)
language sql security invoker set search_path = ''
as $$ select * from private.reveal_digital_code(target) $$;

create function public.set_digital_store_region(platform text, region text)
returns public.digital_store_regions
language sql security invoker set search_path = ''
as $$ select private.set_digital_store_region(platform, region) $$;

revoke all on function private.digital_price(numeric, numeric) from public, anon, authenticated;
revoke all on function private.digital_name(public.digital_brands, public.digital_products, text) from public, anon, authenticated;
revoke all on function private.log_digital_code(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function private.digital_price(numeric, numeric) to service_role;
grant execute on function private.digital_name(public.digital_brands, public.digital_products, text) to service_role;
grant execute on function private.log_digital_code(uuid, text, jsonb) to service_role;

revoke all on function private.staff_digital_products() from public, anon;
revoke all on function public.staff_digital_products() from public, anon;
grant execute on function private.staff_digital_products() to authenticated;
grant execute on function public.staff_digital_products() to authenticated;

revoke all on function private.release_digital_codes(uuid) from public, anon;
revoke all on function public.release_digital_codes(uuid) from public, anon;
grant execute on function private.release_digital_codes(uuid) to authenticated;
grant execute on function public.release_digital_codes(uuid) to authenticated;

revoke all on function private.retry_digital_code(uuid) from public, anon;
revoke all on function public.retry_digital_code(uuid) from public, anon;
grant execute on function private.retry_digital_code(uuid) to authenticated;
grant execute on function public.retry_digital_code(uuid) to authenticated;

revoke all on function private.replace_digital_code(uuid, text) from public, anon;
revoke all on function public.replace_digital_code(uuid, text) from public, anon;
grant execute on function private.replace_digital_code(uuid, text) to authenticated, service_role;
grant execute on function public.replace_digital_code(uuid, text) to authenticated, service_role;

revoke all on function private.reveal_digital_code(uuid) from public, anon;
revoke all on function public.reveal_digital_code(uuid) from public, anon;
grant execute on function private.reveal_digital_code(uuid) to authenticated;
grant execute on function public.reveal_digital_code(uuid) to authenticated;

revoke all on function private.set_digital_store_region(text, text) from public, anon;
revoke all on function public.set_digital_store_region(text, text) from public, anon;
grant execute on function private.set_digital_store_region(text, text) to authenticated;
grant execute on function public.set_digital_store_region(text, text) to authenticated;

revoke all on function public.take_digital_codes(integer) from public, anon, authenticated;
revoke all on function public.deliver_digital_code(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.fail_digital_code(uuid, text) from public, anon, authenticated;
grant execute on function public.take_digital_codes(integer) to service_role;
grant execute on function public.deliver_digital_code(uuid, text, text, text, text) to service_role;
grant execute on function public.fail_digital_code(uuid, text) to service_role;
