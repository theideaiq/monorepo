-- Program revision v1, step 5c: game night kits (weekends, prices, deposits, units, games, hand-over and collection).
begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy between the preamble
-- markers (pg_prove runs files in isolation); `bun run --cwd
-- packages/database db:test:sync` rewrites them, `db:test` fails when stale.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- Act as a signed-in user. Customers sign in with SMS (aal1); staff with an
-- authenticator app, so pass 'aal2' to act as staff. `extra` adds claims
-- (for example '{"phone":"9647700000004"}').
create function pg_temp.login_as(user_id uuid, aal text default 'aal1', extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    (jsonb_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal) || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Act as a visitor (publishable key, no session).
create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Back to the superuser, to arrange fixtures or read without RLS.
create function pg_temp.reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema pg_temp to public;
-- </preamble>

select plan(20);

-- A is an adult, T is 15, B has Plus Blaze, S is support.
truncate public.products, public.orders, public.rentals, public.kit_bookings, public.subscriptions cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000891', 'adult@example.iq', '{"full_name":"Adult A"}'),
  ('00000000-0000-0000-0000-000000000892', 'teen@example.iq', '{"full_name":"Teen T"}'),
  ('00000000-0000-0000-0000-000000000893', 'blaze@example.iq', '{"full_name":"Blaze B"}'),
  ('00000000-0000-0000-0000-000000000894', 'support@example.iq', '{"full_name":"Support S"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set birthday = (now() - interval '15 years')::date where id = '00000000-0000-0000-0000-000000000892';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000894', 'support');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier, home_swaps)
values ('plus-blaze-kit', 'Plus Blaze', 39750, 'month', 'plus', 4, 3, 4);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000893', 'plus-blaze-kit', 'active', 'wayl', now(), now() + interval '30 days');

update public.store_settings set cash_on_delivery_enabled = true;

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id)
select ('89000000-0000-0000-0000-00000000000' || n)::uuid, 'kit-game-' || n, 'لعبة ' || n, 'Game ' || n,
  59750, 2, 'active', 'rental', (select id from public.product_categories where slug = 'games')
from generate_series(1, 5) as n;

create temporary table zone (id uuid, outside uuid) on commit drop;
grant all on zone to authenticated;
insert into zone values (
  (select id from public.delivery_zones where governorate = 'baghdad' and active limit 1),
  (select id from public.delivery_zones where governorate <> 'baghdad' and active limit 1)
);
create temporary table weekend (starts_on date) on commit drop;
grant all on weekend to authenticated;
insert into weekend select starts_on from public.kit_weekends('ps5') offset 1 limit 1;
create temporary table booked (id uuid) on commit drop;
grant all on booked to authenticated;

-- ── Weekends and prices ─────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select count(*)::integer, bool_and(extract(dow from starts_on) = 4), min(starts_on) > (now() at time zone 'Asia/Baghdad')::date
     from public.kit_weekends('ps5') $$,
  $$ values (8, true, true) $$,
  'eight coming weekends, each from a Thursday'
);
select results_eq(
  $$ select units_free, price, extra_day_price from public.kit_weekends('ps5') limit 1 $$,
  $$ values (2, 49750::bigint, 19750::bigint) $$,
  'the PS5 kit is 49,750 a weekend and 19,750 an extra day, with 2 kits to book'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000893');
select is(
  (select price from public.kit_weekends('ps5') limit 1), 37250::bigint,
  'Plus Blaze members get 25% off'
);

-- ── Booking ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000892');
select throws_ok(
  $$ select public.book_kit('retro', (select starts_on from weekend), '{"full_name":"T","phone":"+9647700000892","address":"Karrada"}', (select id from zone)) $$,
  '23514', 'You need to be 18 or over',
  'kits are booked by adults'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000891');
select throws_ok(
  $$ select public.book_kit('ps5', (select starts_on from weekend), '{"full_name":"A","phone":"+9647700000891","address":"Karrada"}', (select id from zone), 0,
       '{89000000-0000-0000-0000-000000000001}') $$,
  '23514', 'Choose the kit''s games',
  'the PS5 kit comes with four games'
);
select throws_ok(
  $$ select public.book_kit('retro', (select starts_on from weekend), '{"full_name":"A","phone":"+9647700000891","address":"Basra"}', (select outside from zone)) $$,
  '23514', 'Kits are delivered in Baghdad only',
  'kits are delivered in Baghdad only'
);
select throws_ok(
  $$ select public.book_kit('retro', (select starts_on from weekend) + 1, '{"full_name":"A","phone":"+9647700000891","address":"Karrada"}', (select id from zone)) $$,
  '23514', 'Choose one of the coming weekends',
  'a booking starts on a coming Thursday'
);

insert into booked select (public.book_kit(
  'ps5', (select starts_on from weekend),
  '{"full_name":"A","phone":"+9647700000891","address":"Karrada"}', (select id from zone), 1,
  '{89000000-0000-0000-0000-000000000001,89000000-0000-0000-0000-000000000002,89000000-0000-0000-0000-000000000003,89000000-0000-0000-0000-000000000004}'
)).id;
select results_eq(
  $$ select status::text, total, max_bulbs from public.orders where id = (select id from booked) $$,
  $$ values ('pending', 169500::bigint, 13900) $$,
  'the order is the weekend, an extra day and the 100,000 deposit; the kit earns Bulbs (up to 20%)'
);
select results_eq(
  $$ select kind, unit_price from public.order_items where order_id = (select id from booked) order by kind desc $$,
  $$ values ('kit', 69500::bigint), ('deposit', 100000::bigint) $$,
  'with a kit line and a refundable deposit line'
);
select results_eq(
  $$ select ends_on - starts_on, (select count(*)::integer from public.kit_booking_games g where g.booking_id = b.id and g.rental_id is null)
     from public.kit_bookings b where order_id = (select id from booked) $$,
  $$ values (3, 4) $$,
  'Thursday to Sunday, with its four games chosen but not yet held'
);

-- The second PS5 kit, then none.
select pg_temp.login_as('00000000-0000-0000-0000-000000000893');
select lives_ok(
  $$ select public.book_kit('ps5', (select starts_on from weekend), '{"full_name":"B","phone":"+9647700000893","address":"Mansour"}', (select id from zone), 0,
       '{89000000-0000-0000-0000-000000000002,89000000-0000-0000-0000-000000000003,89000000-0000-0000-0000-000000000004,89000000-0000-0000-0000-000000000005}', 'cash_on_delivery') $$,
  'another member books the second PS5 kit, paying cash'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000891');
select throws_ok(
  $$ select public.book_kit('ps5', (select starts_on from weekend), '{"full_name":"A","phone":"+9647700000891","address":"Karrada"}', (select id from zone), 0,
       '{89000000-0000-0000-0000-000000000001,89000000-0000-0000-0000-000000000002,89000000-0000-0000-0000-000000000003,89000000-0000-0000-0000-000000000004}') $$,
  '23514', 'All kits are booked that weekend',
  'when every kit is booked, the weekend is full'
);

-- Two days before the weekend the games are held.
select pg_temp.reset_role();
update public.kit_bookings set starts_on = (now() at time zone 'Asia/Baghdad')::date + 1,
  ends_on = (now() at time zone 'Asia/Baghdad')::date + 4
where order_id = (select id from booked);
select is(public.run_kit_holds(), 4, 'two days before the weekend its games are held');
select is(
  (select count(*)::integer from public.rentals where kind = 'kit' and status = 'requested'),
  4, 'as copies set aside for the kit'
);

-- ── Staff ───────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000891');
select throws_ok(
  $$ select public.waive_kit_deposit((select id from public.kit_bookings where order_id = (select id from booked))) $$,
  '42501', 'Not allowed',
  'only staff waive a deposit'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000894', 'aal2');
select public.waive_kit_deposit((select id from public.kit_bookings where order_id = (select id from booked)));
select results_eq(
  $$ select o.total, (select count(*)::integer from public.order_items i where i.order_id = o.id and i.kind = 'deposit')
     from public.orders o where o.id = (select id from booked) $$,
  $$ values (69500::bigint, 0) $$,
  'waiving the deposit takes it off the unpaid order'
);
select throws_ok(
  $$ select public.hand_over_kit((select id from public.kit_bookings where order_id = (select id from booked))) $$,
  '23514', 'Waiting for payment',
  'an unpaid kit isn''t handed over'
);

select pg_temp.reset_role();
select public.complete_order_payment((select id from booked));
select pg_temp.login_as('00000000-0000-0000-0000-000000000894', 'aal2');
select public.hand_over_kit((select id from public.kit_bookings where order_id = (select id from booked)));
select results_eq(
  $$ select b.status, (select count(*)::integer from public.rentals r join public.kit_booking_games g on g.rental_id = r.id
                        where g.booking_id = b.id and r.status = 'active')
     from public.kit_bookings b where b.order_id = (select id from booked) $$,
  $$ values ('out', 4) $$,
  'once paid, the kit and its games go out'
);

-- B's kit (deposit kept) comes back with 30,000 of damage.
select pg_temp.reset_role();
update public.kit_bookings set status = 'out' where user_id = '00000000-0000-0000-0000-000000000893';
select pg_temp.login_as('00000000-0000-0000-0000-000000000894', 'aal2');
select public.collect_kit((select id from public.kit_bookings where user_id = '00000000-0000-0000-0000-000000000893'), 30000);
select results_eq(
  $$ select status, refund_due, amount_due from public.kit_bookings where user_id = '00000000-0000-0000-0000-000000000893' $$,
  $$ values ('returned', 70000::bigint, 0::bigint) $$,
  'at collection, damage comes out of the deposit'
);

-- Cancelling an order frees its kit.
select pg_temp.reset_role();
update public.orders set status = 'cancelled' where id = (select order_id from public.kit_bookings where user_id = '00000000-0000-0000-0000-000000000893');
select is(
  (select status from public.kit_bookings where user_id = '00000000-0000-0000-0000-000000000893'),
  'returned', 'a returned kit stays returned when its order is closed'
);

select * from finish();
rollback;
