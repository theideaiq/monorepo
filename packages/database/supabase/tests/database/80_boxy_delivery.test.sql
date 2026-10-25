-- Delivery with Boxy: areas are public (live ones), shipments are for order
-- staff, only the server writes them, and zones know Boxy's provinces.
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
select plan(10);

delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000080a1', 'bm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000080a2', 'bs@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000080a3', 'be@example.iq', '{"full_name":"Editor E"}');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000080a2', 'support'),
  ('00000000-0000-0000-0000-0000000080a3', 'editor');

insert into public.delivery_areas (id, province, name, active) values
  ('area-live', 'BGD', 'الكرادة', true),
  ('area-gone', 'BGD', 'منطقة قديمة', false);

insert into public.orders (id, user_id, status, subtotal, total, shipping_address)
values ('80000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000080a1', 'paid', 10000, 10000,
  '{"full_name":"M","phone":"+9647700000101","governorate":"baghdad","city":"الكرادة","address":"Street 1"}');
insert into public.shipments (order_id, carrier_id, size, tracking_code)
values ('80000000-0000-0000-0000-000000000001', '01JK8FT6FM9MB9KAA52WZDQYQY', 'M', 'BXO-1');

-- ── Zones ──────────────────────────────────────────────────────────────────

select is(
  (select count(*)::integer from public.delivery_zones where active and carrier_province is null),
  0, 'every zone that delivers has a Boxy province'
);
select is(
  (select active from public.delivery_zones where governorate = 'halabja'),
  false, 'Halabja is off until Boxy delivers there'
);

-- ── Areas ──────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select name from public.delivery_areas where province = 'BGD' $$,
  $$ values ('الكرادة'::text) $$,
  'visitors see the live areas only'
);
select throws_ok(
  $$ insert into public.delivery_areas (id, province, name) values ('x', 'BGD', 'x') $$,
  '42501', null, 'visitors cannot add areas'
);

-- ── Shipments ──────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000080a1');
select is(
  (select count(*)::integer from public.shipments), 0,
  'customers cannot read shipments (their order has the tracking link)'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000080a3', 'aal2');
select is((select count(*)::integer from public.shipments), 0, 'editors cannot read shipments');

select pg_temp.login_as('00000000-0000-0000-0000-0000000080a2', 'aal1');
select is(
  (select count(*)::integer from public.shipments), 0,
  'staff rights need an authenticator-app session'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000080a2', 'aal2');
select is((select tracking_code from public.shipments), 'BXO-1', 'support reads shipments');
select throws_ok(
  $$ update public.shipments set status = 'delivered' $$,
  '42501', null, 'support cannot change a shipment (only the server does)'
);

select pg_temp.reset_role();
select throws_ok(
  $$ insert into public.shipments (order_id, carrier_id, size)
     values ('80000000-0000-0000-0000-000000000001', 'another-parcel', 'S') $$,
  '23505', null, 'an order has one live shipment'
);

select * from finish();
rollback;
