-- Sellers and offers (Program Revision v2, item 10, part 1: the schema).
--
-- The IDEA Store becomes a marketplace. A product (the work) is offered by
-- sellers: The IDEA (the house seller, holding today's stock) and shops,
-- which are organizations in The IDEA Partners approved by staff. An offer
-- is a seller's available copies of one variant in one condition, at their
-- price: `product_offers()` now groups copies by seller too, cart lines and
-- copies name their seller (The IDEA unless said otherwise), and order
-- lines keep the seller they were bought from.
--
-- Shops apply from Partners → Selling (`apply_to_sell`) with their
-- documents and payout details (`seller_details`, seen only by the
-- organization's owners and admins and by staff); staff approve, reject or
-- suspend them (`decide_seller`) and set the security deposit. Only copies
-- of approved sellers can be bought.

create type public.seller_status as enum ('pending', 'approved', 'rejected', 'suspended');

create table public.sellers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid unique references public.organizations (id) on delete cascade,
  is_house boolean not null default false,
  name text not null check (char_length(trim(name)) between 1 and 120),
  status public.seller_status not null default 'pending',
  applied_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The IDEA is the only seller without an organization.
  constraint sellers_house_check check (is_house = (organization_id is null))
);

comment on table public.sellers is
  'Who sells on The IDEA: The IDEA itself (is_house) and approved shops (organizations in The IDEA Partners).';

create unique index sellers_one_house_idx on public.sellers (is_house) where is_house;
create index sellers_decided_by_idx on public.sellers (decided_by);

create trigger set_updated_at before update on public.sellers
  for each row execute function private.set_updated_at();

-- The house seller has a fixed id, so columns can default to it.
insert into public.sellers (id, is_house, name, status, decided_at)
values ('00000000-0000-4000-8000-000000000001', true, 'The IDEA', 'approved', now());

-- What staff review and pay with: documents (Storage paths under the
-- organization's folder), payout details and the security deposit.
create table public.seller_details (
  seller_id uuid primary key references public.sellers (id) on delete cascade,
  documents text[] not null default '{}' check (cardinality(documents) <= 10),
  payout_bank text check (char_length(payout_bank) <= 120),
  payout_account_name text check (char_length(payout_account_name) <= 120),
  payout_iban text check (payout_iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$'),
  deposit_required bigint not null default 0 check (deposit_required >= 0),
  deposit_held bigint not null default 0 check (deposit_held >= 0),
  review_note text check (char_length(review_note) <= 1000),
  updated_at timestamptz not null default now()
);

comment on table public.seller_details is
  'A shop''s documents, payout details, deposit and staff review note (owners, admins and staff only).';

create trigger set_updated_at before update on public.seller_details
  for each row execute function private.set_updated_at();

-- Documents live in the organization's folder (the bucket policies depend
-- on that layout).
create function private.check_seller_documents()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  org uuid := (select s.organization_id from public.sellers s where s.id = new.seller_id);
begin
  if exists (
    select 1 from unnest(new.documents) d
    where org is null or d not like org::text || '/%'
  ) then
    raise exception 'Documents must be in the organization''s folder'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_seller_documents
  before insert or update of documents on public.seller_details
  for each row execute function private.check_seller_documents();

alter table public.sellers enable row level security;
alter table public.seller_details enable row level security;

-- Approved sellers are public (their name shows on offers); an
-- organization sees its own application; staff see every one.
create policy "Visitors see approved sellers"
  on public.sellers for select to anon
  using (status = 'approved');

create policy "Approved sellers, your own and staff"
  on public.sellers for select to authenticated
  using (
    status = 'approved'
    or (select private.is_org_member(organization_id))
    or (select private.has_staff_role('{admin}'))
  );

create policy "Owners, admins and staff read seller details"
  on public.seller_details for select to authenticated
  using (
    (select private.has_org_role(
      (select s.organization_id from public.sellers s where s.id = seller_id),
      '{owner,admin}'
    ))
    or (select private.has_staff_role('{admin}'))
  );

create policy "Owners, admins and staff update seller details"
  on public.seller_details for update to authenticated
  using (
    (select private.has_org_role(
      (select s.organization_id from public.sellers s where s.id = seller_id),
      '{owner,admin}'
    ))
    or (select private.has_staff_role('{admin}'))
  );

revoke all on public.sellers, public.seller_details from anon, authenticated;
grant select on public.sellers to anon, authenticated;
grant select on public.seller_details to authenticated;
grant update (documents, payout_bank, payout_account_name, payout_iban)
  on public.seller_details to authenticated;

-- ── Partners: Selling is a section ──────────────────────────────────────────

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'bulk_buying', 'developers', 'selling']::text[]);

-- ── Copies, cart lines and order lines name their seller ─────────────────────

alter table public.stock_items
  add column seller_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.sellers (id);
create index stock_items_seller_idx on public.stock_items (seller_id);

alter table public.cart_items
  add column seller_id uuid not null default '00000000-0000-4000-8000-000000000001'
    references public.sellers (id) on delete cascade;
create index cart_items_seller_idx on public.cart_items (seller_id);
drop index public.cart_items_line_idx;
create unique index cart_items_line_idx
  on public.cart_items (user_id, product_id, variant_id, seller_id, condition) nulls not distinct;
grant insert (seller_id) on public.cart_items to authenticated;

alter table public.order_items
  add column seller_id uuid default '00000000-0000-4000-8000-000000000001'
    references public.sellers (id) on delete set null,
  add column seller_name text default 'The IDEA';
create index order_items_seller_idx on public.order_items (seller_id);
update public.order_items set seller_id = '00000000-0000-4000-8000-000000000001', seller_name = 'The IDEA';

comment on column public.order_items.seller_name is
  'The seller''s name when the order was placed.';

-- ── Applying and deciding ──────────────────────────────────────────────────

create function private.apply_to_sell(org uuid, seller_name text)
returns public.sellers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.sellers;
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Only owners and admins can apply' using errcode = '42501';
  end if;

  insert into public.sellers (organization_id, name)
  values (org, trim(seller_name))
  on conflict (organization_id) do update
    set name = excluded.name,
        -- A rejected application can be sent again; others keep their status.
        status = case when sellers.status = 'rejected' then 'pending' else sellers.status end,
        applied_at = case when sellers.status = 'rejected' then now() else sellers.applied_at end
  returning * into result;

  insert into public.seller_details (seller_id) values (result.id)
  on conflict (seller_id) do nothing;

  return result;
end;
$$;

create function public.apply_to_sell(org uuid, seller_name text)
returns public.sellers
language sql
security invoker
set search_path = ''
as $$ select * from private.apply_to_sell(org, seller_name) $$;

create function private.decide_seller(
  target uuid,
  decision public.seller_status,
  note text default null,
  deposit bigint default null
)
returns public.sellers
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.sellers;
begin
  if not private.has_staff_role('{admin}') then
    raise exception 'Staff only' using errcode = '42501';
  end if;
  if decision = 'pending' then
    raise exception 'Choose approved, rejected or suspended' using errcode = 'check_violation';
  end if;

  update public.sellers
  set status = decision, decided_at = now(), decided_by = auth.uid()
  where id = target and not is_house
  returning * into result;
  if result.id is null then
    raise exception 'No such shop' using errcode = 'no_data_found';
  end if;

  update public.seller_details
  set review_note = coalesce(note, review_note),
      deposit_required = coalesce(deposit, deposit_required)
  where seller_id = target;

  return result;
end;
$$;

create function public.decide_seller(
  target uuid,
  decision public.seller_status,
  note text default null,
  deposit bigint default null
)
returns public.sellers
language sql
security invoker
set search_path = ''
as $$ select * from private.decide_seller(target, decision, note, deposit) $$;

revoke all on function private.apply_to_sell(uuid, text) from public, anon;
revoke all on function public.apply_to_sell(uuid, text) from public, anon;
grant execute on function private.apply_to_sell(uuid, text) to authenticated;
grant execute on function public.apply_to_sell(uuid, text) to authenticated;
revoke all on function private.decide_seller(uuid, public.seller_status, text, bigint) from public, anon;
revoke all on function public.decide_seller(uuid, public.seller_status, text, bigint) from public, anon;
grant execute on function private.decide_seller(uuid, public.seller_status, text, bigint) to authenticated;
grant execute on function public.decide_seller(uuid, public.seller_status, text, bigint) to authenticated;
revoke all on function private.check_seller_documents() from public, anon, authenticated;

-- ── Offers: copies by seller ────────────────────────────────────────────────

drop function private.copies_for_line(uuid, uuid, public.product_condition, integer);

-- The copies a cart line gets: its seller's (The IDEA when none is named),
-- of an approved seller, cheapest first.
create function private.copies_for_line(
  line_product uuid,
  line_variant uuid,
  line_condition public.product_condition,
  wanted integer,
  line_seller uuid default null
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
  join public.sellers sl on sl.id = s.seller_id
  where s.product_id = line_product
    and s.variant_id = line_variant
    and s.seller_id = coalesce(line_seller, '00000000-0000-4000-8000-000000000001')
    and sl.status = 'approved'
    and v.active
    and s.purpose = 'sale'
    and s.status = 'available'
    and s.condition = coalesce(line_condition, p.condition)
  order by 2, s.created_at
  limit wanted;
end;
$$;

revoke all on function private.copies_for_line(uuid, uuid, public.product_condition, integer, uuid)
  from public, anon, authenticated;

drop function public.product_offers(uuid);
drop function private.product_offers(uuid);

-- A product's offers: available copies grouped by variant, condition,
-- purpose and seller (approved sellers only), with the lowest price.
create function private.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text
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
    min(coalesce(s.price, v.price)) filter (where s.purpose = 'sale'),
    s.seller_id,
    sl.name
  from public.stock_items s
  join public.products p on p.id = s.product_id
  join public.product_variants v on v.id = s.variant_id
  join public.sellers sl on sl.id = s.seller_id
  where s.product_id = offer_product
    and v.active
    and sl.status = 'approved'
    and s.status = 'available'
    and s.purpose in ('sale', 'rental')
    and (p.status = 'active' or private.is_staff())
  group by s.variant_id, s.condition, s.purpose, s.seller_id, sl.name, sl.is_house
  order by s.purpose, s.condition, sl.is_house desc, sl.name;
$$;

create function public.product_offers(offer_product uuid)
returns table (
  variant_id uuid,
  condition public.product_condition,
  purpose public.stock_purpose,
  available integer,
  price bigint,
  seller_id uuid,
  seller_name text
)
language sql
stable
set search_path = ''
as $$ select * from private.product_offers($1) $$;

revoke all on function private.product_offers(uuid) from public;
grant execute on function private.product_offers(uuid) to anon, authenticated, service_role;
revoke all on function public.product_offers(uuid) from public;
grant execute on function public.product_offers(uuid) to anon, authenticated, service_role;

-- ── Checkout: lines name their seller ─────────────────────────────────────

CREATE OR REPLACE FUNCTION private.price_checkout(member uuid, governorate text, fulfilment order_fulfilment, payment_method order_payment_method, delivery_zone uuid, use_bulbs integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pickup boolean := price_checkout.fulfilment = 'pickup';
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  promo bigint := 0;
  source text;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
begin
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

  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  if not exists (select 1 from public.cart_items where user_id = member) then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
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
    where c.user_id = member
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

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  if cash and not pickup and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Pickup is free; delivery costs the zone's fee, free from the zone's
  -- threshold for everyone or on any order with the member's plan.
  if not pickup then
    fee := zone.fee;
    if zone.free_from is not null and subtotal >= zone.free_from then
      free_reason := 'threshold';
    elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
      free_reason := 'plan';
    end if;
    if free_reason is not null then
      waived := fee;
      fee := 0;
    end if;
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
    promo := least(floor(subtotal * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor(subtotal * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs pay up to the whole order (100 IQD each), from what's usable now.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    bulbs := least(use_bulbs, ((subtotal + fee - promo) / 100)::integer);
  end if;

  total := subtotal + fee - promo - bulbs * 100;
  max_bulbs := (greatest(0, cap - waived - promo) / 100)::integer;
  -- Cashback on what's paid in money, at the member's rate (1 Bulb = 100 IQD).
  earn := least(
    floor(
      subtotal
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 10000
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', case when pickup then null else zone.free_from end,
    'discount', promo,
    'discount_source', source,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs * 100,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.create_order(shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  pickup boolean := create_order.fulfilment = 'pickup';
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
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

  -- Lock the catalog rows so concurrent orders see consistent stock, and
  -- the member's Bulbs so concurrent checkouts wait for each other.
  perform 1 from public.products p
  where p.id in (select c.product_id from public.cart_items c where c.user_id = caller)
  order by p.id
  for update;
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
  end if;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status
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
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', case
        when pickup then ''
        -- A zone that isn't a whole governorate is named instead.
        else coalesce(
          quote ->> 'zone_governorate',
          nullif(left(trim(shipping ->> 'governorate'), 60), ''),
          quote ->> 'zone_name_en'
        )
      end,
      'city', case when pickup then '' else left(trim(coalesce(shipping ->> 'city', '')), 60) end,
      'address', case when pickup then '' else left(trim(shipping ->> 'address'), 500) end,
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', case when pickup then '' else left(trim(coalesce(shipping ->> 'landmark', '')), 200) end
    ) || case
      when pickup or private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor then 'pending' end
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

  delete from public.cart_items where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- A minor's order waits for the guardian (decide_guardian_order).
  if minor then
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

  return created;
end;
$function$;

CREATE OR REPLACE FUNCTION private.take_order_stock(target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
        from private.copies_for_line(item.product_id, item.variant_id, item.condition, item.quantity, item.seller_id) c
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
$function$;
