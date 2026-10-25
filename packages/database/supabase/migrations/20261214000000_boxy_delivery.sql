-- Delivery with Boxy (tryboxy.com) for purchases.
--
-- Staff send a packed order to Boxy from the back office; apps/api creates
-- the Boxy order, asks for a pick-up and records the shipment here. Boxy's
-- webhooks and a sync job keep the shipment's status, and a delivered
-- shipment marks the order delivered (cash orders stay unpaid until the
-- cash Boxy collected is handed over: `mark_cash_collected`). Customers
-- still pay The IDEA's own zone fees; Boxy bills The IDEA.
--
-- * `delivery_zones.carrier_province`: Boxy's province code for the zone
--   (BGD, BAS, ARB…). Boxy doesn't serve Halabja, so that zone is off.
-- * `delivery_areas`: Boxy's areas (regions) by province, copied from its
--   API by the sync job, for the checkout's area picker. Boxy matches an
--   address by province code and the area's (Arabic) name.
-- * `shipments`: one row per parcel sent to a carrier, for staff only.
-- * `orders.tracking_url`: the carrier's tracking page for the customer.
-- Rentals aren't delivered through Boxy (yet).

-- ── Zones know their Boxy province ─────────────────────────────────────────

alter table public.delivery_zones
  add column carrier_province text check (carrier_province ~ '^[A-Z]{3}$');

comment on column public.delivery_zones.carrier_province is
  'Boxy''s province code for the zone (BGD, BAS, ARB…); null where Boxy doesn''t deliver.';

update public.delivery_zones z set carrier_province = m.code
from (values
  ('baghdad', 'BGD'), ('basra', 'BAS'), ('nineveh', 'MOS'), ('erbil', 'ARB'),
  ('sulaymaniyah', 'SMH'), ('duhok', 'DOH'), ('kirkuk', 'KRK'), ('anbar', 'ANB'),
  ('babylon', 'BBL'), ('karbala', 'KRB'), ('najaf', 'NJF'), ('wasit', 'KOT'),
  ('diyala', 'DYL'), ('saladin', 'SAH'), ('dhi-qar', 'NAS'), ('maysan', 'AMA'),
  ('muthanna', 'SAM'), ('qadisiyah', 'DWN')
) as m (governorate, code)
where z.governorate = m.governorate;

-- Boxy has no Halabja area yet: no delivery there until it does.
update public.delivery_zones set active = false where governorate = 'halabja';

-- ── Boxy's areas ────────────────────────────────────────────────────────────

create table public.delivery_areas (
  -- Boxy's region uid.
  id text primary key check (char_length(id) between 1 and 64),
  province text not null check (province ~ '^[A-Z]{3}$'),
  -- The area's name as Boxy matches it (Arabic).
  name text not null check (char_length(name) between 1 and 200),
  -- Boxy's short code for the area (e.g. BGD1).
  code text check (char_length(code) <= 64),
  -- Boxy marks far areas as remote.
  remote boolean not null default false,
  -- False once Boxy no longer lists the area.
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

comment on table public.delivery_areas is
  'Boxy''s delivery areas by province (copied from its API by the sync job), for the checkout''s area picker.';

create index delivery_areas_province_idx on public.delivery_areas (province, name);

alter table public.delivery_areas enable row level security;

create policy "Delivery areas are public"
  on public.delivery_areas for select to anon, authenticated
  using (active);

revoke all on public.delivery_areas from anon, authenticated;
grant select on public.delivery_areas to anon, authenticated;
grant all on public.delivery_areas to service_role;

-- ── Shipments ───────────────────────────────────────────────────────────────

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  carrier text not null default 'boxy' check (carrier in ('boxy')),
  -- The carrier's id for the parcel (Boxy's order uid).
  carrier_id text not null unique check (char_length(carrier_id) between 1 and 64),
  -- The tracking code customers and the courier see (BXO-…).
  tracking_code text check (char_length(tracking_code) <= 64),
  tracking_url text check (char_length(tracking_url) <= 500),
  -- The carrier's status (Boxy: new, scheduled, in-transit, delivered…).
  status text not null default 'new' check (char_length(status) between 1 and 64),
  status_title text check (char_length(status_title) <= 200),
  -- False once cancelled with the carrier; an order has at most one live
  -- shipment.
  active boolean not null default true,
  size text not null check (size in ('S', 'M', 'L')),
  fragile boolean not null default false,
  -- What the courier collects from the customer (0 for orders paid online).
  cash_amount bigint not null default 0 check (cash_amount >= 0),
  -- The carrier's fee to The IDEA, when it says.
  fee bigint check (fee >= 0),
  -- The pick-up request the parcel is in.
  pickup_id text check (char_length(pickup_id) <= 64),
  -- The carrier's status history, newest last.
  history jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array'),
  -- The carrier asks The IDEA to act (wrong address, refused…).
  action_required text check (char_length(action_required) <= 1000),
  delivered_at timestamptz,
  returned_at timestamptz,
  cancelled_at timestamptz,
  synced_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.shipments is
  'Parcels sent to a carrier (Boxy) for orders: tracking, status and history. Written by apps/api; staff read them.';

create unique index shipments_live_order_idx on public.shipments (order_id) where active;
create index shipments_order_id_idx on public.shipments (order_id);
create index shipments_created_by_idx on public.shipments (created_by);
-- The sync job reads the live parcels that aren't finished.
create index shipments_open_idx on public.shipments (synced_at)
  where active and delivered_at is null and returned_at is null;

create trigger set_updated_at before update on public.shipments
  for each row execute function private.set_updated_at();

alter table public.shipments enable row level security;

-- Staff who handle orders read them; apps/api (service role) writes them.
create policy "Order staff read shipments"
  on public.shipments for select to authenticated
  using ((select private.has_staff_role('{support,finance}')));

revoke all on public.shipments from anon, authenticated;
grant select on public.shipments to authenticated;
grant all on public.shipments to service_role;

-- ── Orders carry the tracking page ─────────────────────────────────────────

alter table public.orders
  add column tracking_url text check (char_length(tracking_url) <= 500);

comment on column public.orders.tracking_url is
  'The carrier''s tracking page for the customer (with tracking_number, its code).';
