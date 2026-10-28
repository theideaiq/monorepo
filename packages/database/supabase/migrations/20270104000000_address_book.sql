-- The address book and the preferred way to pay (Program Revision v2,
-- item 6). Saved addresses are the person's own (RLS: owner only); orders
-- still keep a copy of the address they were sent to. Wayl has no saved
-- cards (its API only makes payment links), so nothing about cards is kept:
-- only whether the person pays online or cash on delivery.

-- ── Map pins ──────────────────────────────────────────────────────────────

-- A pin `{ "lat": …, "lng": … }` inside Iraq (with a margin), rounded to
-- 6 decimals (about 10 cm), or null.
create function private.map_pin(pin jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(pin -> 'lat') = 'number'
      and jsonb_typeof(pin -> 'lng') = 'number'
      and (pin ->> 'lat')::numeric between 28.5 and 37.5
      and (pin ->> 'lng')::numeric between 38.5 and 49
    then jsonb_build_object(
      'lat', round((pin ->> 'lat')::numeric, 6),
      'lng', round((pin ->> 'lng')::numeric, 6)
    )
  end
$$;

revoke all on function private.map_pin(jsonb) from public;
grant execute on function private.map_pin(jsonb) to anon, authenticated, service_role;

-- ── Saved addresses ───────────────────────────────────────────────────────

create table public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- "Home", "Work", "Mum's": the person's own name for it.
  label text not null check (char_length(trim(label)) between 1 and 40),
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  -- The delivery zone, as at checkout (null when zones change).
  zone_id uuid references public.delivery_zones (id) on delete set null,
  governorate text not null default '' check (char_length(governorate) <= 60),
  area text not null default '' check (char_length(area) <= 60),
  street text not null check (char_length(trim(street)) between 1 and 500),
  landmark text not null default '' check (char_length(landmark) <= 200),
  latitude numeric(9, 6) check (latitude between 28.5 and 37.5),
  longitude numeric(9, 6) check (longitude between 38.5 and 49),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((latitude is null) = (longitude is null))
);

comment on table public.user_addresses is
  'Delivery addresses a person saved (Pass → Settings, checkout).';

create index user_addresses_user_id_idx on public.user_addresses (user_id);
create index user_addresses_zone_id_idx on public.user_addresses (zone_id);
-- One default address per person.
create unique index user_addresses_one_default
  on public.user_addresses (user_id) where is_default;

create trigger set_updated_at before update on public.user_addresses
  for each row execute function private.set_updated_at();

-- At most 10 addresses each; the first one is the default; making one the
-- default unsets the others.
create function private.user_address_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.user_addresses where user_id = new.user_id) >= 10 then
      raise exception 'Too many addresses' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.user_addresses where user_id = new.user_id) then
      new.is_default := true;
    end if;
  end if;
  if new.is_default then
    update public.user_addresses
    set is_default = false
    where user_id = new.user_id and is_default and id <> new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.user_address_rules() from public, anon, authenticated;

create trigger address_rules
  before insert or update of is_default on public.user_addresses
  for each row execute function private.user_address_rules();

-- Removing the default makes the newest remaining address the default.
create function private.user_address_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_default then
    update public.user_addresses
    set is_default = true
    where id = (
      select id from public.user_addresses
      where user_id = old.user_id
      order by created_at desc
      limit 1
    );
  end if;
  return null;
end;
$$;

revoke all on function private.user_address_removed() from public, anon, authenticated;

create trigger address_removed
  after delete on public.user_addresses
  for each row execute function private.user_address_removed();

alter table public.user_addresses enable row level security;

create policy "People see their own addresses"
  on public.user_addresses for select to authenticated
  using (user_id = (select auth.uid()));

create policy "People add their own addresses"
  on public.user_addresses for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "People change their own addresses"
  on public.user_addresses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "People remove their own addresses"
  on public.user_addresses for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.user_addresses from anon, authenticated;
grant select, insert, delete on public.user_addresses to authenticated;
grant update (
  label, full_name, phone, zone_id, governorate, area, street, landmark,
  latitude, longitude, is_default
) on public.user_addresses to authenticated;

-- ── The preferred way to pay ──────────────────────────────────────────────

alter table public.profiles
  add column checkout_payment public.order_payment_method;

comment on column public.profiles.checkout_payment is
  'How the person last chose to pay (online or cash on delivery); checkout starts there.';

grant select (checkout_payment), update (checkout_payment) on public.profiles to authenticated;

-- ── Orders keep the landmark and the map pin ──────────────────────────────

create or replace function private.create_order(shipping jsonb, fulfilment order_fulfilment DEFAULT 'delivery'::order_fulfilment, payment_method order_payment_method DEFAULT 'online'::order_payment_method, delivery_zone uuid DEFAULT NULL::uuid, use_bulbs integer DEFAULT 0)
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
    order_id, product_id, variant_id, condition, name_ar, name_en, attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.condition, l.name_ar, l.name_en,
    l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
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
