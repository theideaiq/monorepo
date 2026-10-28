-- Selling: shop orders, pickup locations and parcels (owner's master
-- brief, 2026-10-28, section 5).
--
-- * `seller_locations`: a shop's Boxy pickup locations (one per branch),
--   with its pickup contact. The shop's owners and admins edit them in
--   Partners → Settings → Pickup; apps/api creates each in Boxy
--   (type WAREHOUSE; Boxy has no update, so an edit makes a new one) and
--   stores Boxy's uid, which every parcel from that
--   branch sends as `saved_pick_up_address_uid`, so the courier calls the
--   shop's own contact.
-- * A shop's order lines move waiting → ready → picked up, or out of
--   stock (`order_items.seller_status`). They're due ready 2 days after
--   the order is confirmed or paid (`ready_by`); lines still waiting after
--   that go to Staff → Inbox.
-- * `seller_order_lines()` is what Partners shows: the order number, item,
--   condition, quantity, price and payout, the customer's first name and
--   area, and the ready-by time. Never the phone, address or email: those
--   reach the shop only on Boxy's label, for the parcel it packs.
-- * "Ready for pickup" (`mark_lines_ready`) readies lines at a branch;
--   apps/api then creates one Boxy parcel per order and shop, prints the
--   label and requests the pickup. Each order now has at most one live
--   parcel per seller (`shipments.seller_id`).
-- * "Out of stock" (`mark_line_out_of_stock`) cancels the line, takes its
--   copy out of stock and counts against the shop; paid lines wait in
--   Staff → Inbox for their refund (`refunded_at`).

-- ── Pickup locations ───────────────────────────────────────────────────────

create table public.seller_locations (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  -- The branch, as the shop calls it ("Main shop", "Mansour branch").
  name text not null check (char_length(trim(name)) between 1 and 80),
  -- Who the courier calls at pickup.
  contact_name text not null check (char_length(trim(contact_name)) between 1 and 120),
  contact_phone text not null check (contact_phone ~ '^\+9647[0-9]{9}$'),
  address text not null check (char_length(trim(address)) between 5 and 300),
  -- Boxy's area (region) the branch is in.
  region_id text not null references public.delivery_areas (id),
  lat numeric(9, 6) not null check (lat between -90 and 90),
  lng numeric(9, 6) not null check (lng between -180 and 180),
  -- Boxy's pickup location uid, written by apps/api.
  boxy_uid text unique check (char_length(boxy_uid) between 1 and 64),
  -- When apps/api last sent it to Boxy; behind `updated_at` means it
  -- needs sending again.
  synced_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.seller_locations is
  'A shop''s pickup locations (one per branch) and pickup contact, each a Boxy pickup location.';

create index seller_locations_seller_idx on public.seller_locations (seller_id);
create index seller_locations_region_idx on public.seller_locations (region_id);

create trigger set_updated_at before update on public.seller_locations
  for each row execute function private.set_updated_at();

alter table public.seller_locations enable row level security;

create policy "Shops and staff see pickup locations" on public.seller_locations
  for select to authenticated
  using ((select private.can_see_seller(seller_id)));
create policy "Shop admins add pickup locations" on public.seller_locations
  for insert to authenticated
  with check ((select private.can_list_for(seller_id)));
create policy "Shop admins edit pickup locations" on public.seller_locations
  for update to authenticated
  using ((select private.can_list_for(seller_id)))
  with check ((select private.can_list_for(seller_id)));

revoke all on public.seller_locations from anon, authenticated;
grant select on public.seller_locations to authenticated;
grant insert (seller_id, name, contact_name, contact_phone, address, region_id, lat, lng)
  on public.seller_locations to authenticated;
grant update (name, contact_name, contact_phone, address, region_id, lat, lng, active)
  on public.seller_locations to authenticated;

-- ── Parcels per seller ─────────────────────────────────────────────────────

alter table public.shipments
  add column seller_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.sellers (id),
  add column location_id uuid references public.seller_locations (id) on delete set null;

comment on column public.shipments.seller_id is
  'Whose parcel it is: an order with lines from several sellers has one parcel each.';

drop index public.shipments_live_order_idx;
create unique index shipments_live_order_seller_idx on public.shipments (order_id, seller_id) where active;
create index shipments_seller_idx on public.shipments (seller_id);
create index shipments_location_idx on public.shipments (location_id);

-- ── A shop's lines ─────────────────────────────────────────────────────────

create type public.seller_line_status as enum ('waiting', 'ready', 'picked_up', 'out_of_stock', 'cancelled');

alter table public.order_items
  add column seller_status public.seller_line_status,
  add column ready_by timestamptz,
  add column ready_at timestamptz,
  add column location_id uuid references public.seller_locations (id) on delete set null,
  add column shipment_id uuid references public.shipments (id) on delete set null,
  -- When a paid line that was cancelled (out of stock) was refunded.
  add column refunded_at timestamptz;

comment on column public.order_items.seller_status is
  'A shop''s line: waiting, ready (at a branch, in a parcel), picked up, out of stock or cancelled. Null for The IDEA''s own stock.';

create index order_items_location_idx on public.order_items (location_id);
create index order_items_shipment_idx on public.order_items (shipment_id);
create index order_items_late_idx on public.order_items (ready_by) where seller_status = 'waiting';

-- A shop's line starts waiting; it's due 2 days after the order is
-- confirmed (cash) or paid.
create or replace function private.set_line_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rate numeric;
  total bigint;
  shop boolean;
begin
  if new.seller_id is null then
    return new;
  end if;
  select not s.is_house into shop from public.sellers s where s.id = new.seller_id;
  if not coalesce(shop, false) then
    return new;
  end if;

  rate := coalesce(private.commission_rate_for(new.seller_id, new.product_id), 0.12);
  total := new.unit_price * new.quantity;
  new.commission_rate := rate;
  new.commission := round(total * rate)::bigint;
  new.seller_payout := total - new.commission;
  new.seller_status := 'waiting';
  new.ready_by := (
    select now() + interval '2 days' from public.orders o
    where o.id = new.order_id and o.status not in ('pending', 'cancelled', 'refunded')
  );
  return new;
end;
$$;

-- When an order is paid the clock starts; when it's cancelled, so are its
-- shop lines that weren't picked up.
create function private.shop_lines_follow_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('cancelled', 'refunded') then
    update public.order_items set seller_status = 'cancelled'
    where order_id = new.id and seller_status in ('waiting', 'ready');
  elsif old.status = 'pending' and new.status <> 'pending' then
    update public.order_items set ready_by = now() + interval '2 days'
    where order_id = new.id and seller_status = 'waiting' and ready_by is null;
  end if;
  return new;
end;
$$;

create trigger shop_lines_follow_order after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function private.shop_lines_follow_order();

-- Whether the caller works at the shop (any member packs orders).
create function private.works_at_seller(seller uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.sellers s
    where s.id = seller and s.organization_id is not null and not s.is_house
      and private.is_org_member(s.organization_id)
  );
$$;

revoke all on function private.works_at_seller(uuid) from public, anon;
grant execute on function private.works_at_seller(uuid) to authenticated;

-- What Partners shows a shop: its lines on confirmed or paid orders, the
-- customer only as "first name · area".
create function private.seller_order_lines(shop uuid)
returns table (
  line_id uuid,
  order_id uuid,
  order_number text,
  ordered_at timestamptz,
  name_ar text,
  name_en text,
  attributes jsonb,
  condition public.product_condition,
  quantity integer,
  unit_price bigint,
  commission bigint,
  seller_payout bigint,
  customer text,
  ready_by timestamptz,
  ready_at timestamptz,
  status public.seller_line_status,
  location_id uuid,
  shipment_id uuid,
  tracking_code text,
  shipment_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.works_at_seller(shop) or private.has_staff_role('{support,finance}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select
      i.id, o.id, o.number::text, o.created_at, i.name_ar, i.name_en, i.attributes, i.condition,
      i.quantity, i.unit_price, i.commission, i.seller_payout,
      concat_ws(' · ',
        nullif(split_part(trim(coalesce(o.shipping_address ->> 'full_name', '')), ' ', 1), ''),
        nullif(trim(coalesce(o.shipping_address ->> 'city', '')), '')),
      i.ready_by, i.ready_at, i.seller_status, i.location_id, i.shipment_id,
      s.tracking_code, s.status
    from public.order_items i
    join public.orders o on o.id = i.order_id
    left join public.shipments s on s.id = i.shipment_id
    where i.seller_id = shop
      and i.seller_status is not null
      and o.status <> 'pending'
    order by (i.seller_status = 'waiting') desc, i.ready_by nulls last, o.created_at desc;
end;
$$;

create function public.seller_order_lines(shop uuid)
returns table (
  line_id uuid,
  order_id uuid,
  order_number text,
  ordered_at timestamptz,
  name_ar text,
  name_en text,
  attributes jsonb,
  condition public.product_condition,
  quantity integer,
  unit_price bigint,
  commission bigint,
  seller_payout bigint,
  customer text,
  ready_by timestamptz,
  ready_at timestamptz,
  status public.seller_line_status,
  location_id uuid,
  shipment_id uuid,
  tracking_code text,
  shipment_status text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.seller_order_lines(shop) $$;

revoke all on function private.seller_order_lines(uuid) from public, anon;
revoke all on function public.seller_order_lines(uuid) from public, anon;
grant execute on function private.seller_order_lines(uuid) to authenticated;
grant execute on function public.seller_order_lines(uuid) to authenticated;

-- "Ready for pickup": the shop readies waiting lines at one of its active
-- branches with a Boxy location. Returns the orders to send to Boxy.
create function private.mark_lines_ready(lines uuid[], location uuid)
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  branch public.seller_locations;
  found integer;
begin
  select * into branch from public.seller_locations l where l.id = location and l.active;
  if branch.id is null or not private.works_at_seller(branch.seller_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if branch.boxy_uid is null then
    raise exception 'This branch isn''t set up with Boxy yet' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(lines), 0) = 0 or cardinality(lines) > 200 then
    raise exception 'Choose 1 to 200 lines' using errcode = 'check_violation';
  end if;

  select count(*) into found
  from public.order_items i
  join public.orders o on o.id = i.order_id
  where i.id = any (lines) and i.seller_id = branch.seller_id and i.seller_status = 'waiting'
    and o.status not in ('pending', 'cancelled', 'refunded');
  if found <> cardinality(lines) then
    raise exception 'Some lines can''t be readied' using errcode = 'check_violation';
  end if;

  return query
    update public.order_items set seller_status = 'ready', ready_at = now(), location_id = branch.id
    where id = any (lines)
    returning order_id;
end;
$$;

create function public.mark_lines_ready(lines uuid[], location uuid)
returns setof uuid
language sql
security invoker
set search_path = ''
as $$ select * from private.mark_lines_ready(lines, location) $$;

revoke all on function private.mark_lines_ready(uuid[], uuid) from public, anon;
revoke all on function public.mark_lines_ready(uuid[], uuid) from public, anon;
grant execute on function private.mark_lines_ready(uuid[], uuid) to authenticated;
grant execute on function public.mark_lines_ready(uuid[], uuid) to authenticated;

-- "Out of stock": the line is cancelled and its copy taken out of stock.
create function private.mark_line_out_of_stock(line uuid)
returns public.seller_line_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.order_items;
begin
  select * into item from public.order_items i where i.id = line for update;
  if item.id is null or not private.works_at_seller(item.seller_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if item.seller_status <> 'waiting' then
    raise exception 'Only a waiting line can be out of stock' using errcode = 'check_violation';
  end if;

  update public.order_items set seller_status = 'out_of_stock' where id = line;
  update public.stock_items set status = 'retired', order_item_id = null
  where order_item_id = line;
  return 'out_of_stock';
end;
$$;

create function public.mark_line_out_of_stock(line uuid)
returns public.seller_line_status
language sql
security invoker
set search_path = ''
as $$ select private.mark_line_out_of_stock(line) $$;

revoke all on function private.mark_line_out_of_stock(uuid) from public, anon;
revoke all on function public.mark_line_out_of_stock(uuid) from public, anon;
grant execute on function private.mark_line_out_of_stock(uuid) to authenticated;
grant execute on function public.mark_line_out_of_stock(uuid) to authenticated;

-- Finance marks a cancelled paid line refunded.
create function private.mark_line_refunded(line uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  done timestamptz;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.order_items set refunded_at = now()
  where id = line and seller_status in ('out_of_stock', 'cancelled') and refunded_at is null
  returning refunded_at into done;
  if done is null then
    raise exception 'Line not found' using errcode = 'no_data_found';
  end if;
  return done;
end;
$$;

create function public.mark_line_refunded(line uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.mark_line_refunded(line) $$;

revoke all on function private.mark_line_refunded(uuid) from public, anon;
revoke all on function public.mark_line_refunded(uuid) from public, anon;
grant execute on function private.mark_line_refunded(uuid) to authenticated;
grant execute on function public.mark_line_refunded(uuid) to authenticated;
