-- The address book, the preferred way to pay, and landmarks and pins on orders.
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

select plan(16);

-- U and V are customers.
truncate public.products, public.orders cascade;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000991', 'u99@example.iq'),
  ('00000000-0000-0000-0000-000000000992', 'v99@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('99000000-0000-0000-0000-000000000001', 'record-99', 'أسطوانة', 'Record', 20000, 5, 'active', 'sale');
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── Saved addresses ─────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000991');
insert into public.user_addresses (id, label, full_name, phone, governorate, area, street, landmark, latitude, longitude)
values ('99000000-0000-0000-0000-0000000000a1', 'Home', 'U', '+9647700000991', 'baghdad', 'Karrada', 'Street 62', 'Near the bakery', 33.3, 44.42);
select is(
  (select is_default from public.user_addresses where id = '99000000-0000-0000-0000-0000000000a1'),
  true, 'The first address is the default'
);

insert into public.user_addresses (id, label, full_name, phone, governorate, area, street, is_default)
values ('99000000-0000-0000-0000-0000000000a2', 'Work', 'U', '+9647700000991', 'baghdad', 'Mansour', 'Office 4', true);
select results_eq(
  $$ select label from public.user_addresses where is_default $$,
  $$ values ('Work') $$,
  'Making another the default unsets the old one'
);

select throws_ok(
  $$ insert into public.user_addresses (label, full_name, phone, street, latitude, longitude)
     values ('Far', 'U', '+9647700000991', 'Somewhere', 51.5, -0.1) $$,
  '23514', null, 'A pin outside Iraq is refused'
);
select throws_ok(
  $$ insert into public.user_addresses (label, full_name, phone, street)
     values ('Bad', 'U', '0770', 'Somewhere') $$,
  '23514', null, 'The phone is in E.164'
);
select throws_ok(
  $$ insert into public.user_addresses (user_id, label, full_name, phone, street)
     values ('00000000-0000-0000-0000-000000000992', 'Theirs', 'V', '+9647700000992', 'Somewhere') $$,
  '42501', null, 'Nobody adds an address for someone else'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000992');
select is_empty(
  $$ select 1 from public.user_addresses $$,
  'Others see none of them'
);
update public.user_addresses set street = 'Taken' where id = '99000000-0000-0000-0000-0000000000a1';
delete from public.user_addresses where id = '99000000-0000-0000-0000-0000000000a1';
select pg_temp.reset_role();
select is(
  (select street from public.user_addresses where id = '99000000-0000-0000-0000-0000000000a1'),
  'Street 62', 'Others can neither change nor remove them'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select 1 from public.user_addresses $$,
  '42501', null, 'Visitors have no access'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000991');
select throws_ok(
  $$ update public.user_addresses set user_id = '00000000-0000-0000-0000-000000000992'
     where id = '99000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'An address cannot be handed to someone else'
);

delete from public.user_addresses where id = '99000000-0000-0000-0000-0000000000a2';
select results_eq(
  $$ select label from public.user_addresses where is_default $$,
  $$ values ('Home') $$,
  'Removing the default makes the newest remaining address the default'
);

select pg_temp.reset_role();
insert into public.user_addresses (user_id, label, full_name, phone, street)
select '00000000-0000-0000-0000-000000000992', 'A' || n, 'V', '+9647700000992', 'Street'
from generate_series(1, 10) n;
select pg_temp.login_as('00000000-0000-0000-0000-000000000992');
select throws_ok(
  $$ insert into public.user_addresses (label, full_name, phone, street)
     values ('Eleventh', 'V', '+9647700000992', 'Street') $$,
  '23514', 'Too many addresses', 'At most 10 addresses each'
);

-- ── The preferred way to pay ────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000991');
select lives_ok(
  $$ update public.profiles set checkout_payment = 'cash_on_delivery'
     where id = '00000000-0000-0000-0000-000000000991' $$,
  'People remember how they pay'
);
select is(
  (select checkout_payment::text from public.profiles where id = '00000000-0000-0000-0000-000000000991'),
  'cash_on_delivery', 'It is kept'
);

-- ── Orders keep the landmark and the pin ────────────────────────────────────

insert into public.cart_items (product_id, quantity) values ('99000000-0000-0000-0000-000000000001', 1);
select public.create_order(
  '{"full_name":"U","phone":"+9647700000991","governorate":"baghdad","city":"Karrada","address":"Street 62","landmark":"Near the bakery","location":{"lat":33.3123456789,"lng":44.42}}'
);
select is(
  (select shipping_address - 'governorate' - 'notes' from public.orders order by number desc limit 1),
  '{"full_name":"U","phone":"+9647700000991","city":"Karrada","address":"Street 62","landmark":"Near the bakery","location":{"lat":33.312346,"lng":44.42}}'::jsonb,
  'The order keeps the landmark and the pin (rounded)'
);

insert into public.cart_items (product_id, quantity) values ('99000000-0000-0000-0000-000000000001', 1);
select public.create_order(
  '{"full_name":"U","phone":"+9647700000991","governorate":"baghdad","city":"Karrada","address":"Street 62","location":{"lat":"x","lng":44}}'
);
select is(
  (select shipping_address ? 'location' from public.orders order by number desc limit 1),
  false, 'A pin that is not a place is dropped'
);

select is(
  private.map_pin('{"lat":40,"lng":44}'), null, 'map_pin keeps only places in Iraq'
);

select * from finish();
rollback;
