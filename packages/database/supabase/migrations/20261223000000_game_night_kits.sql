-- Program revision v1, step 5c: game night kits.
--
-- Weekend rentals of a console with controllers (and, for the PS5 kit,
-- four games from the rental copies), from Thursday evening to Saturday
-- evening, delivered and collected in Baghdad:
--   PS5 kit       49,750 IQD, extra day 19,750
--   Switch party  39,750 IQD, extra day 14,750
--   Retro         24,750 IQD, extra day  9,750
-- Plus Blaze members get 25% off. Bookings are for adults (18+), up to 8
-- weekends ahead; each books one kit unit (`kit_units`, added by staff
-- when the kit is ready). A 100,000 IQD refundable deposit is charged at
-- checkout; staff can waive it for someone whose ID they've checked.
-- The PS5 kit's games are held from the rental copies two days before
-- the weekend (`hold_kit_games()`, daily) and go back at collection.
-- Kit orders earn no Bulbs.

-- ── Kits and units ─────────────────────────────────────────────────────────

create table public.kit_types (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name_ar text not null,
  name_en text not null,
  description_ar text not null default '',
  description_en text not null default '',
  price bigint not null check (price > 0),
  extra_day_price bigint not null check (extra_day_price >= 0),
  deposit bigint not null default 100000 check (deposit >= 0),
  -- Games the member chooses from the rental copies (0: the kit's own).
  games integer not null default 0 check (games between 0 and 8),
  -- The rental category the games come from.
  games_category_id uuid references public.product_categories (id),
  image text,
  active boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.kit_types is
  'Game night kits: a weekend (Thursday evening to Saturday evening) rental of a console set, delivered and collected in Baghdad.';

create index kit_types_category_idx on public.kit_types (games_category_id);

alter table public.kit_types enable row level security;

create policy "Kits are public" on public.kit_types
  for select to anon, authenticated using (active or (select private.has_staff_role('{support}')));
create policy "Support edits kits" on public.kit_types
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

grant select on public.kit_types to anon, authenticated;
grant update on public.kit_types to authenticated;

create trigger set_updated_at before update on public.kit_types
  for each row execute function private.set_updated_at();

insert into public.kit_types (
  id, name_ar, name_en, description_ar, description_en, price, extra_day_price, games, games_category_id, position
)
values
  ('ps5', 'سهرة PS5', 'PS5 game night',
    'جهاز PS5 ويدا تحكم وأربع ألعاب تختارها.', 'A PS5, 2 controllers and 4 games of your choice.',
    49750, 19750, 4, (select id from public.product_categories where slug = 'games'), 1),
  ('switch', 'سهرة Switch', 'Switch party',
    'جهاز Switch OLED ومجموعتا يد تحكم ولعبتا Mario Kart وSmash Bros.', 'A Switch OLED, 2 controller sets, Mario Kart and Smash Bros.',
    39750, 14750, 0, null, 2),
  ('retro', 'سهرة الألعاب الكلاسيكية', 'Retro night',
    'جهاز PlayStation Classic أو جهاز كلاسيكي آخر ويدا تحكم.', 'A PlayStation Classic or another classic console, 2 controllers.',
    24750, 9750, 0, null, 3)
on conflict (id) do nothing;

create table public.kit_units (
  id uuid primary key default gen_random_uuid(),
  kit_type text not null references public.kit_types (id),
  label text not null check (char_length(label) between 1 and 60),
  status text not null default 'active' check (status in ('active', 'repair', 'retired')),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (kit_type, label)
);

comment on table public.kit_units is
  'Each physical kit (PS5 kit #1, …); a weekend booking takes one.';

alter table public.kit_units enable row level security;

create policy "Support sees kit units" on public.kit_units
  for select to authenticated using ((select private.has_staff_role('{support}')));
create policy "Support adds kit units" on public.kit_units
  for insert to authenticated with check ((select private.has_staff_role('{support}')));
create policy "Support edits kit units" on public.kit_units
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

grant select, insert, update on public.kit_units to authenticated;

-- ── Bookings ───────────────────────────────────────────────────────────────

create table public.kit_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  kit_type text not null references public.kit_types (id),
  unit_id uuid not null references public.kit_units (id),
  -- The Thursday it's delivered and the day it's collected.
  starts_on date not null,
  ends_on date not null,
  extra_days integer not null default 0 check (extra_days between 0 and 3),
  status text not null default 'booked' check (status in ('booked', 'out', 'returned', 'cancelled')),
  order_id uuid references public.orders (id) on delete set null,
  deposit bigint not null default 0 check (deposit >= 0),
  deposit_waived boolean not null default false,
  damage_charge bigint check (damage_charge >= 0),
  refund_due bigint check (refund_due >= 0),
  amount_due bigint check (amount_due >= 0),
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);

comment on table public.kit_bookings is
  'A weekend booking of a game night kit, paid with an order (the kit and its refundable deposit).';

create index kit_bookings_user_idx on public.kit_bookings (user_id, created_at desc);
create index kit_bookings_unit_idx on public.kit_bookings (unit_id, starts_on);
create index kit_bookings_type_idx on public.kit_bookings (kit_type, starts_on);
create index kit_bookings_order_idx on public.kit_bookings (order_id);

alter table public.kit_bookings enable row level security;

create policy "Members see their kit bookings; support sees all" on public.kit_bookings
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.kit_bookings to authenticated;

create table public.kit_booking_games (
  booking_id uuid not null references public.kit_bookings (id) on delete cascade,
  product_id uuid not null references public.products (id),
  -- The copy held for the weekend (two days before it).
  rental_id uuid references public.rentals (id) on delete set null,
  primary key (booking_id, product_id)
);

comment on table public.kit_booking_games is
  'The games chosen for a PS5 kit; a copy of each is held two days before the weekend.';

create index kit_booking_games_product_idx on public.kit_booking_games (product_id);
create index kit_booking_games_rental_idx on public.kit_booking_games (rental_id);

alter table public.kit_booking_games enable row level security;

create policy "Members see their kit games; support sees all" on public.kit_booking_games
  for select to authenticated
  using (exists (
    select 1 from public.kit_bookings b
    where b.id = booking_id
      and (b.user_id = (select auth.uid()) or (select private.has_staff_role('{support}')))
  ));

grant select on public.kit_booking_games to authenticated;

alter table public.rentals drop constraint rentals_kind_check;
alter table public.rentals add constraint rentals_kind_check check (kind in ('plus', 'single', 'kit'));

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('sale', 'rental', 'deposit', 'keep', 'swap', 'kit'));

-- A unit free for the weekend (or null).
create function private.free_kit_unit(kit text, from_day date, to_day date)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id from public.kit_units u
  where u.kit_type = kit and u.status = 'active'
    and not exists (
      select 1 from public.kit_bookings b
      where b.unit_id = u.id and b.status in ('booked', 'out')
        and b.starts_on < to_day and b.ends_on > from_day
    )
  order by u.label
  limit 1;
$$;

-- Rounds down to the nearest 250 IQD.
create function private.price_step_250(amount numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$ select (floor(amount / 250) * 250)::bigint $$;

-- The weekends a kit can be booked: the next 8 Thursdays, with how many
-- units are free and the price for the caller (Plus Blaze: 25% off).
create function private.kit_weekends(kit text)
returns table (starts_on date, units_free integer, price bigint, extra_day_price bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with today as (select (now() at time zone 'Asia/Baghdad')::date as d),
  thursdays as (
    select (t.d + ((4 - extract(dow from t.d)::integer + 7) % 7) + case
      when extract(dow from t.d) = 4 then 7 else 0 end + 7 * n)::date as starts_on
    from today t, generate_series(0, 7) as n
  ),
  rate as (
    select case when coalesce((private.member_plan((select auth.uid()))).tier, 0) >= 3 then 0.75 else 1 end as factor
  )
  select th.starts_on,
    (select count(*)::integer from public.kit_units u
      where u.kit_type = kit and u.status = 'active'
        and not exists (
          select 1 from public.kit_bookings b
          where b.unit_id = u.id and b.status in ('booked', 'out')
            and b.starts_on < th.starts_on + 2 and b.ends_on > th.starts_on
        )),
    private.price_step_250(k.price * r.factor),
    private.price_step_250(k.extra_day_price * r.factor)
  from thursdays th
  cross join rate r
  join public.kit_types k on k.id = kit and k.active
  order by th.starts_on;
$$;

create function public.kit_weekends(kit text)
returns table (starts_on date, units_free integer, price bigint, extra_day_price bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.kit_weekends(kit) $$;

-- Holds the chosen games of kits whose weekend starts within two days.
create function private.hold_kit_games()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  game record;
  copy public.stock_items;
  held public.rentals;
  done integer := 0;
begin
  for game in
    select g.booking_id, g.product_id, b.user_id, p.name_ar, p.name_en
    from public.kit_booking_games g
    join public.kit_bookings b on b.id = g.booking_id
    join public.products p on p.id = g.product_id
    where g.rental_id is null and b.status = 'booked'
      and b.starts_on <= (now() at time zone 'Asia/Baghdad')::date + 2
  loop
    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = game.product_id and v.active and s.purpose = 'rental' and s.status = 'available'
    order by s.created_at
    limit 1
    for update of s skip locked;
    continue when copy.id is null;

    insert into public.rentals (user_id, product_id, variant_id, name_ar, name_en, kind)
    values (game.user_id, game.product_id, copy.variant_id, game.name_ar, game.name_en, 'kit')
    returning * into held;
    update public.stock_items set status = 'rented', rental_id = held.id where id = copy.id;
    update public.kit_booking_games set rental_id = held.id
    where booking_id = game.booking_id and product_id = game.product_id;
    done := done + 1;
    copy := null;
  end loop;
  return done;
end;
$$;

create function public.run_kit_holds()
returns integer
language sql
security definer
set search_path = ''
as $$ select private.hold_kit_games() $$;

-- Books a kit for the weekend starting `starts_on` (a Thursday), with
-- `extra_days` after Saturday and, for the PS5 kit, its games: an order of
-- the kit and its deposit, delivered and collected in Baghdad.
create function private.book_kit(
  kit text,
  starts_on date,
  shipping jsonb,
  delivery_zone uuid,
  extra_days integer default 0,
  games uuid[] default '{}',
  payment_method public.order_payment_method default 'online'
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  kit_row public.kit_types;
  weekend record;
  zone public.delivery_zones;
  settings public.store_settings;
  unit uuid;
  ends date;
  total_price bigint;
  created public.orders;
  booking public.kit_bookings;
  cash boolean := payment_method = 'cash_on_delivery';
  game uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_adult(caller) then
    raise exception 'You need to be 18 or over' using errcode = 'check_violation';
  end if;

  select * into kit_row from public.kit_types k where k.id = kit and k.active;
  if kit_row.id is null then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  if coalesce(extra_days, 0) not between 0 and 3 then
    raise exception 'Invalid booking' using errcode = 'check_violation';
  end if;
  select * into weekend from private.kit_weekends(kit) w where w.starts_on = book_kit.starts_on;
  if weekend.starts_on is null then
    raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(games), 0) <> kit_row.games then
    raise exception 'Choose the kit''s games' using errcode = 'check_violation';
  end if;
  if kit_row.games > 0 and (
    select count(distinct p.id) from public.products p
    where p.id = any (games) and p.status = 'active' and p.rentable
      and (kit_row.games_category_id is null or p.category_id = kit_row.games_category_id)
      and not (p.age_rating = 18 and private.is_minor(caller))
  ) <> kit_row.games then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or coalesce(trim(shipping ->> 'address'), '') = ''
    or char_length(shipping::text) > 4000
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;
  select * into zone from public.delivery_zones z
  where z.id = delivery_zone and z.active and z.governorate = 'baghdad';
  if zone.id is null then
    raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
  end if;
  select * into settings from public.store_settings limit 1;
  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  -- Thursday evening to Saturday evening, plus the extra days.
  ends := book_kit.starts_on + 2 + coalesce(extra_days, 0);
  unit := private.free_kit_unit(kit, book_kit.starts_on, ends);
  if unit is null then
    raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
  end if;

  total_price := weekend.price + coalesce(extra_days, 0) * weekend.extra_day_price;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
    fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    total_price + kit_row.deposit, 0, total_price + kit_row.deposit, 0,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', 'baghdad',
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    'delivery', payment_method, zone.id
  )
  returning * into created;

  insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
  values (caller, kit, unit, book_kit.starts_on, ends, coalesce(extra_days, 0), created.id, kit_row.deposit)
  returning * into booking;

  foreach game in array coalesce(games, '{}') loop
    insert into public.kit_booking_games (booking_id, product_id) values (booking.id, game);
  end loop;

  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values
    (created.id, kit_row.name_ar || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'),
      kit_row.name_en || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'), total_price, 1, 'kit');
  if kit_row.deposit > 0 then
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (created.id, 'تأمين قابل للاسترداد: ' || kit_row.name_ar, 'Refundable deposit: ' || kit_row.name_en,
      kit_row.deposit, 1, 'deposit');
  end if;

  if cash then
    perform private.notify(
      caller, 'order', 'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;
  -- The coming weekend: hold the games now.
  perform private.hold_kit_games();
  return created;
end;
$$;

create function public.book_kit(
  kit text,
  starts_on date,
  shipping jsonb,
  delivery_zone uuid,
  extra_days integer default 0,
  games uuid[] default '{}',
  payment_method public.order_payment_method default 'online'
)
returns public.orders
language sql
security invoker
set search_path = ''
as $$ select private.book_kit(kit, starts_on, shipping, delivery_zone, extra_days, games, payment_method) $$;

-- ── Staff: waive the deposit, hand over, collect ───────────────────────────

-- Waives the deposit for someone whose ID staff checked, before it's paid.
create function private.waive_kit_deposit(target uuid)
returns public.kit_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.kit_bookings;
  saved public.kit_bookings;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into booking from public.kit_bookings b where b.id = target and b.status = 'booked' for update;
  if booking.id is null then
    raise exception 'Booking not found' using errcode = 'no_data_found';
  end if;
  if booking.deposit_waived or booking.deposit = 0 then
    return booking;
  end if;
  if not exists (
    select 1 from public.orders o where o.id = booking.order_id and o.status in ('pending', 'confirmed')
      and not exists (select 1 from public.payments p where p.order_id = o.id and p.status = 'paid')
  ) then
    raise exception 'The deposit is already paid' using errcode = 'check_violation';
  end if;
  delete from public.order_items where order_id = booking.order_id and kind = 'deposit';
  update public.orders set subtotal = subtotal - booking.deposit, total = total - booking.deposit
  where id = booking.order_id;
  -- An unpaid checkout link was for the old total.
  update public.payments set status = 'expired', checkout_url = null
  where order_id = booking.order_id and status = 'pending';
  update public.kit_bookings set deposit = 0, deposit_waived = true
  where id = booking.id
  returning * into saved;
  return saved;
end;
$$;

create function public.waive_kit_deposit(target uuid)
returns public.kit_bookings
language sql
security invoker
set search_path = ''
as $$ select private.waive_kit_deposit(target) $$;

-- The kit is handed over (once paid or confirmed): its games go with it.
create function private.hand_over_kit(target uuid)
returns public.kit_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.kit_bookings;
  saved public.kit_bookings;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into booking from public.kit_bookings b where b.id = target and b.status = 'booked' for update;
  if booking.id is null then
    raise exception 'Booking not found' using errcode = 'no_data_found';
  end if;
  if not exists (
    select 1 from public.orders o
    where o.id = booking.order_id and o.status in ('paid', 'confirmed', 'processing', 'shipped')
  ) then
    raise exception 'Waiting for payment' using errcode = 'check_violation';
  end if;
  update public.rentals r set status = 'active'
  from public.kit_booking_games g
  where g.booking_id = booking.id and g.rental_id = r.id and r.status = 'requested';
  update public.orders set status = 'delivered' where id = booking.order_id;
  update public.kit_bookings set status = 'out' where id = booking.id returning * into saved;
  return saved;
end;
$$;

create function public.hand_over_kit(target uuid)
returns public.kit_bookings
language sql
security invoker
set search_path = ''
as $$ select private.hand_over_kit(target) $$;

-- The kit is collected: its games go back, and any damage comes out of
-- the deposit (refunded outside the app).
create function private.collect_kit(target uuid, damage bigint default 0)
returns public.kit_bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  booking public.kit_bookings;
  saved public.kit_bookings;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(damage, 0) < 0 then
    raise exception 'Invalid amount' using errcode = 'check_violation';
  end if;
  select * into booking from public.kit_bookings b where b.id = target and b.status = 'out' for update;
  if booking.id is null then
    raise exception 'Booking not found' using errcode = 'no_data_found';
  end if;
  update public.rentals r set status = 'returned'
  from public.kit_booking_games g
  where g.booking_id = booking.id and g.rental_id = r.id and r.status in ('active', 'overdue');
  update public.kit_bookings set
    status = 'returned',
    damage_charge = coalesce(damage, 0),
    refund_due = greatest(0, booking.deposit - coalesce(damage, 0)),
    amount_due = greatest(0, coalesce(damage, 0) - booking.deposit)
  where id = booking.id
  returning * into saved;
  return saved;
end;
$$;

create function public.collect_kit(target uuid, damage bigint default 0)
returns public.kit_bookings
language sql
security invoker
set search_path = ''
as $$ select private.collect_kit(target, damage) $$;

-- Cancelling or refunding the order cancels the booking and frees its
-- unit and games.
create function private.on_kit_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('cancelled', 'refunded') then
    update public.rentals r set status = 'cancelled'
    from public.kit_booking_games g
    join public.kit_bookings b on b.id = g.booking_id
    where b.order_id = new.id and g.rental_id = r.id and r.status = 'requested';
    update public.kit_bookings set status = 'cancelled'
    where order_id = new.id and status = 'booked';
  end if;
  return new;
end;
$$;

create trigger on_kit_order_status
  after update of status on public.orders
  for each row execute function private.on_kit_order_status();

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.free_kit_unit(text, date, date) from public, anon;
revoke all on function private.kit_weekends(text) from public;
revoke all on function private.price_step_250(numeric) from public;
revoke all on function private.hold_kit_games() from public, anon, authenticated;
revoke all on function private.book_kit(text, date, jsonb, uuid, integer, uuid[], public.order_payment_method) from public, anon;
revoke all on function private.waive_kit_deposit(uuid) from public, anon;
revoke all on function private.hand_over_kit(uuid) from public, anon;
revoke all on function private.collect_kit(uuid, bigint) from public, anon;
revoke all on function private.on_kit_order_status() from public, anon, authenticated;
revoke all on function public.kit_weekends(text) from public;
revoke all on function public.run_kit_holds() from public, anon, authenticated;
revoke all on function public.book_kit(text, date, jsonb, uuid, integer, uuid[], public.order_payment_method) from public, anon;
revoke all on function public.waive_kit_deposit(uuid) from public, anon;
revoke all on function public.hand_over_kit(uuid) from public, anon;
revoke all on function public.collect_kit(uuid, bigint) from public, anon;

grant execute on function private.free_kit_unit(text, date, date) to authenticated;
grant execute on function private.kit_weekends(text) to anon, authenticated;
grant execute on function private.price_step_250(numeric) to anon, authenticated;
grant execute on function private.book_kit(text, date, jsonb, uuid, integer, uuid[], public.order_payment_method) to authenticated;
grant execute on function private.waive_kit_deposit(uuid) to authenticated;
grant execute on function private.hand_over_kit(uuid) to authenticated;
grant execute on function private.collect_kit(uuid, bigint) to authenticated;
grant execute on function public.kit_weekends(text) to anon, authenticated;
grant execute on function public.run_kit_holds() to service_role;
grant execute on function public.book_kit(text, date, jsonb, uuid, integer, uuid[], public.order_payment_method) to authenticated;
grant execute on function public.waive_kit_deposit(uuid) to authenticated;
grant execute on function public.hand_over_kit(uuid) to authenticated;
grant execute on function public.collect_kit(uuid, bigint) to authenticated;
