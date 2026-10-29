-- One cart: a game night kit beside what's bought, priced like book_kit,
-- booked in the same order.
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

select plan(13);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- A is an adult, T is 15.
truncate public.products, public.orders, public.rentals, public.kit_bookings cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000ca1', 'kitcart@example.iq', '{"full_name":"Adult A"}'),
  ('00000000-0000-0000-0000-000000000ca2', 'kitteen@example.iq', '{"full_name":"Teen T"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set birthday = (now() - interval '15 years')::date where id = '00000000-0000-0000-0000-000000000ca2';

update public.store_settings set cash_on_delivery_enabled = true, cash_limit = null;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('9fd00000-0000-0000-0000-000000000001', 'record-9zzi', 'أسطوانة', 'Record', 20000, 3, 'active', 'sale',
    '50000000-0000-0000-0000-000000000005');

create temporary table zone (id uuid, outside uuid);
grant all on zone to authenticated;
insert into zone values (
  (select id from public.delivery_zones where governorate = 'baghdad' and active order by position limit 1),
  (select id from public.delivery_zones where governorate <> 'baghdad' and active limit 1)
);
create temporary table weekend (starts_on date, price bigint);
grant all on weekend to authenticated;
insert into weekend select starts_on, price from public.kit_weekends('retro') offset 1 limit 1;
create temporary table made (id uuid);
grant all on made to authenticated;

-- ── Putting a kit in the cart ───────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ca2');
select throws_ok(
  $$ insert into public.cart_kits (kit_type, starts_on) values ('retro', (select starts_on from weekend)) $$,
  '23514', 'You need to be 18 or over',
  'kits are for 18 and over'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ca1');
select throws_ok(
  $$ insert into public.cart_kits (kit_type, starts_on) values ('retro', (select starts_on from weekend) + 1) $$,
  '23514', 'Choose one of the coming weekends',
  'on one of the coming weekends'
);
select throws_ok(
  $$ insert into public.cart_kits (kit_type, starts_on, games) values ('ps5', (select starts_on from weekend), '{}') $$,
  '23514', 'Choose the kit''s games',
  'with the kit''s number of games'
);
select lives_ok(
  $$ insert into public.cart_kits (kit_type, starts_on) values ('retro', (select starts_on from weekend)) $$,
  'an adult puts a kit in the cart'
);
select is(
  (select count(*)::int from public.cart_kits),
  1, 'and sees only their own'
);

-- ── The quote ───────────────────────────────────────────────────────────────

select results_eq(
  $$ select (q ->> 'rent')::bigint, (q ->> 'deposits')::bigint, (q ->> 'shipping_fee')::bigint, (q -> 'kit' ->> 'kit_type')
     from public.checkout_quote(delivery_zone => (select id from zone)) q $$,
  $$ select price, 100000::bigint, 0::bigint, 'retro' from weekend $$,
  'a kit on its own: its weekend price and deposit, delivered free'
);
select throws_ok(
  $$ select public.checkout_quote(delivery_zone => (select outside from zone)) $$,
  '23514', 'Kits are delivered in Baghdad only',
  'in Baghdad only'
);

insert into public.cart_items (product_id, quantity) values ('9fd00000-0000-0000-0000-000000000001', 1);
select results_eq(
  $$ select (q ->> 'goods')::bigint, (q ->> 'shipping_fee')::bigint, (q ->> 'total')::bigint
     from public.checkout_quote(delivery_zone => (select id from zone)) q $$,
  $$ select 20000::bigint, 5000::bigint, 20000 + price + 100000 + 5000 from weekend $$,
  'beside what''s bought: one order with the zone''s delivery fee'
);

-- ── The order ───────────────────────────────────────────────────────────────

select throws_ok(
  $$ select public.create_gift_order((select id from zone)) $$,
  '23514', 'Kits can''t be sent as gifts',
  'a cart with a kit isn''t a gift'
);

insert into made select (public.create_order(
  '{"full_name":"A","phone":"+9647700000951","governorate":"baghdad","address":"Karrada"}',
  'delivery', 'cash_on_delivery', (select id from zone)
)).id;

select pg_temp.reset_role();
select results_eq(
  $$ select kind::text from public.order_items where order_id = (select id from made) order by kind::text $$,
  $$ values ('deposit'), ('kit'), ('sale') $$,
  'one order: what''s bought, the kit and its deposit'
);
select results_eq(
  $$ select kit_type, starts_on, status from public.kit_bookings where order_id = (select id from made) $$,
  $$ select 'retro', starts_on, 'booked' from weekend $$,
  'the kit is booked for the weekend'
);
select is(
  (select count(*)::int from public.cart_kits where user_id = '00000000-0000-0000-0000-000000000ca1'),
  0, 'and leaves the cart'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ca1');
insert into public.cart_kits (kit_type, starts_on) values ('retro', (select starts_on from weekend));
select throws_ok(
  $$ select public.checkout_quote(delivery_zone => (select id from zone)) $$,
  '23514', 'All kits are booked that weekend',
  'a weekend with no kit left can''t be checked out'
);

select * from finish();
rollback;
