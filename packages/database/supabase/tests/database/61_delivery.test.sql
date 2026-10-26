-- Delivery zones, store pickup and cash payments. Run with `bun run db:test`.
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

select plan(48);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U is a customer, A an admin, P a support agent, F finance, E an editor.
-- The seeded delivery zones stay (Baghdad 5,000 IQD and the others).
truncate public.products, public.orders cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'du@example.iq', '{"full_name":"Customer U"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'da@example.iq', '{"full_name":"Admin A"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'dp@example.iq', '{"full_name":"Support P"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'df@example.iq', '{"full_name":"Finance F"}'),
  ('00000000-0000-0000-0000-0000000000d5', 'de@example.iq', '{"full_name":"Editor E"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d2', 'admin'),
  ('00000000-0000-0000-0000-0000000000d3', 'support'),
  ('00000000-0000-0000-0000-0000000000d4', 'finance'),
  ('00000000-0000-0000-0000-0000000000d5', 'editor');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('60000000-0000-0000-0000-000000000001', 'switch', 'سويتش', 'Switch', 100000, 5, 'active', 'sale');

update public.store_settings set
  shipping_fee = 5000,
  pickup_enabled = false,
  pickup_address_ar = null,
  pickup_address_en = null,
  cash_on_delivery_enabled = true;

update public.delivery_zones set free_from = null, plus_free_delivery = false;
update public.delivery_zones set active = true, fee = 5000, free_from = 300000 where governorate = 'baghdad';

-- ── Zones: who reads and edits them ─────────────────────────────────────────

select pg_temp.login_anon();
select ok(
  (select count(*) from public.delivery_zones where governorate is not null) >= 19,
  'visitors read the delivery zones (every governorate is seeded)'
);
select is(
  (select fee from public.delivery_zones where governorate = 'baghdad'), 5000::bigint,
  'Baghdad delivers for 5,000 IQD'
);
select ok(
  (select bool_and(fee > 5000) from public.delivery_zones where governorate <> 'baghdad'),
  'the other governorates cost more than Baghdad'
);
select ok(
  exists (select 1 from public.delivery_zones where governorate in ('erbil', 'sulaymaniyah', 'duhok', 'halabja')),
  'the Kurdistan Region governorates are zones'
);
select throws_ok(
  $$ insert into public.delivery_zones (name_ar, name_en, fee) values ('x', 'x', 1) $$,
  '42501', null, 'visitors cannot add zones'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
update public.delivery_zones set fee = 0 where governorate = 'basra';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
update public.delivery_zones set fee = 0 where governorate = 'basra';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2', 'aal1');
update public.delivery_zones set fee = 0 where governorate = 'basra';
select pg_temp.reset_role();
select is(
  (select fee from public.delivery_zones where governorate = 'basra'), 8000::bigint,
  'customers, support and admins without an authenticator-app session cannot change fees'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2', 'aal2');
select lives_ok(
  $$ update public.delivery_zones set fee = 9000 where governorate = 'basra' $$,
  'admins edit delivery fees'
);
select lives_ok(
  $$ insert into public.delivery_zones (name_ar, name_en, fee, active)
     values ('منطقة مغلقة', 'Closed zone', 1000, false) $$,
  'admins add zones'
);
select lives_ok(
  $$ update public.store_settings set pickup_address_en = 'Karrada, Baghdad' $$,
  'admins edit the pickup address'
);
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'delivery_zones' and action = 'update'),
  'zone edits are audited'
);

-- ── Fees are priced on the server ───────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada","shipping_fee":0}'
     ) $$,
  'the one-argument create_order still places an order'
);
select results_eq(
  $$ select o.shipping_fee, o.total, o.fulfilment::text, o.payment_method::text, o.status::text, z.governorate
     from public.orders o join public.delivery_zones z on z.id = o.delivery_zone_id
     order by o.number desc limit 1 $$,
  $$ values (5000::bigint, 105000::bigint, 'delivery', 'online', 'pending', 'baghdad') $$,
  'its zone comes from the governorate and its fee from the zone, whatever the client sends'
);

insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Ashar"}',
       'delivery', 'online', (select id from public.delivery_zones where governorate = 'basra')
     ) $$,
  'customers choose a zone'
);
select results_eq(
  $$ select shipping_fee, total, shipping_address ->> 'governorate'
     from public.orders order by number desc limit 1 $$,
  $$ values (9000::bigint, 109000::bigint, 'basra') $$,
  'the chosen zone sets the fee and the governorate'
);

insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 3);
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada"}'
     ) $$,
  'a large order'
);
select is(
  (select shipping_fee from public.orders order by number desc limit 1), 0::bigint,
  'the zone''s free-delivery threshold applies'
);

insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select throws_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"atlantis","address":"Somewhere"}'
     ) $$,
  '23514', 'Delivery zone not available', 'there is no fee for an unknown area'
);
select throws_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online', (select id from public.delivery_zones where name_en = 'Closed zone')
     ) $$,
  '23514', 'Delivery zone not available', 'inactive zones cannot be chosen'
);
select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000201"}') $$,
  '23514', 'Invalid shipping address', 'delivery needs an address'
);

-- A zone that isn't a whole governorate.
select pg_temp.reset_role();
insert into public.delivery_zones (name_ar, name_en, fee) values ('الكرخ السريع', 'Karkh express', 4000);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","address":"Mansour"}',
       'delivery', 'online', (select id from public.delivery_zones where name_en = 'Karkh express')
     ) $$,
  'a chosen zone needs no governorate'
);
select results_eq(
  $$ select shipping_fee, shipping_address ->> 'governorate'
     from public.orders order by number desc limit 1 $$,
  $$ values (4000::bigint, 'Karkh express') $$,
  'the zone names the area'
);
insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);

-- ── Pickup ──────────────────────────────────────────────────────────────────

select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000201"}', 'pickup', 'online') $$,
  '23514', 'Store pickup is not available', 'pickup must be switched on'
);

select pg_temp.reset_role();
update public.store_settings set pickup_enabled = true;

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000201"}', 'pickup', 'online') $$,
  'pickup needs only a name and a phone'
);
select results_eq(
  $$ select shipping_fee, total, fulfilment::text, delivery_zone_id, shipping_address ->> 'address'
     from public.orders order by number desc limit 1 $$,
  $$ values (0::bigint, 100000::bigint, 'pickup', null::uuid, '') $$,
  'pickup has no delivery fee'
);

-- ── Cash on delivery ────────────────────────────────────────────────────────
-- Stock: 5 copies. Online orders take stock only when paid.

insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery'
     ) $$,
  'customers order with cash on delivery'
);
select results_eq(
  $$ select status::text, payment_method::text, paid_at, total
     from public.orders order by number desc limit 1 $$,
  $$ values ('confirmed', 'cash_on_delivery', null::timestamptz, 105000::bigint) $$,
  'cash orders are confirmed, unpaid'
);
select pg_temp.reset_role();
select is(
  (select stock_count from public.products where slug = 'switch'), 4,
  'a confirmed cash order sets its copies aside'
);
select ok(
  exists (
    select 1 from public.notifications
    where user_id = '00000000-0000-0000-0000-0000000000d1' and event = 'order_confirmed'
  ),
  'the customer is notified that the cash order is confirmed'
);

set local role service_role;
select public.complete_order_payment((select id from public.orders order by number desc limit 1));
select pg_temp.reset_role();
select is(
  (select status::text from public.orders order by number desc limit 1), 'confirmed',
  'the payment webhook cannot pay a cash order'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ update public.orders set payment_method = 'online' $$,
  '42501', null, 'customers cannot change how an order is paid'
);
select throws_ok(
  $$ select public.mark_cash_collected((select id from public.orders order by number desc limit 1)) $$,
  '42501', null, 'customers cannot mark cash collected'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d5', 'aal2');
select throws_ok(
  $$ select public.mark_cash_collected('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'editors cannot mark cash collected'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal1');
select throws_ok(
  $$ select public.mark_cash_collected('00000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'cash collection needs an authenticator-app session'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select lives_ok(
  $$ update public.orders set status = 'shipped'
     where id = (select id from public.orders order by number desc limit 1) $$,
  'support ships a confirmed cash order before the cash is in'
);
select lives_ok(
  $$ select public.mark_cash_collected((select id from public.orders order by number desc limit 1)) $$,
  'support marks the cash collected'
);
select results_eq(
  $$ select status::text, paid_at is not null, cash_collected_by
     from public.orders order by number desc limit 1 $$,
  $$ values ('delivered', true, '00000000-0000-0000-0000-0000000000d3'::uuid) $$,
  'collecting the cash pays and delivers the order, and names who collected it'
);
select lives_ok(
  $$ select public.mark_cash_collected((select id from public.orders order by number desc limit 1)) $$,
  'marking it again is harmless'
);
select pg_temp.reset_role();
select results_eq(
  $$ select count(*)::int, min(amount), min(provider), min(status::text)
     from public.payments
     where order_id = (select id from public.orders order by number desc limit 1) $$,
  $$ values (1, 105000::bigint, 'cash', 'paid') $$,
  'one cash payment is recorded for finance'
);
select ok(
  exists (
    select 1 from public.audit_logs
    where action = 'cash_collected'
      and actor_id = '00000000-0000-0000-0000-0000000000d3'
  ),
  'cash collection is audited'
);
select is(
  (select stock_count from public.products where slug = 'switch'), 4,
  'stock is taken once'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d4', 'aal2');
select throws_ok(
  $$ select public.mark_cash_collected(
       (select id from public.orders where payment_method = 'online' order by number limit 1)) $$,
  '23514', 'Not a cash order', 'online orders are paid through the payment provider'
);

-- Customers cancel a confirmed cash order; its copies come back.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 2);
select public.create_order('{"full_name":"U","phone":"+9647700000201"}', 'pickup', 'cash_on_delivery');
select pg_temp.reset_role();
select is(
  (select stock_count from public.products where slug = 'switch'), 2,
  'paying at pickup also confirms the order and sets copies aside'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select lives_ok(
  $$ select public.cancel_order((select id from public.orders order by number desc limit 1)) $$,
  'customers cancel a confirmed cash order'
);
select pg_temp.reset_role();
select is(
  (select stock_count from public.products where slug = 'switch'), 4,
  'cancelling a cash order puts the copies back'
);

-- Staff cancel a shipped cash order the customer refused at the door.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select public.create_order(
  '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada"}',
  'delivery', 'cash_on_delivery'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
update public.orders set status = 'shipped' where id = (select id from public.orders order by number desc limit 1);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ select public.cancel_order((select id from public.orders order by number desc limit 1)) $$,
  'P0002', null, 'customers cannot cancel a cash order on its way'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3', 'aal2');
select lives_ok(
  $$ update public.orders set status = 'cancelled'
     where id = (select id from public.orders order by number desc limit 1) $$,
  'support cancels an unpaid cash order that was refused'
);
select pg_temp.reset_role();
select is(
  (select stock_count from public.products where slug = 'switch'), 4,
  'a refused cash order returns to stock'
);

-- Cash payments can be switched off.
update public.store_settings set cash_on_delivery_enabled = false;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
insert into public.cart_items (product_id, quantity) values ('60000000-0000-0000-0000-000000000001', 1);
select throws_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000201","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery'
     ) $$,
  '23514', 'Cash payment is not available', 'cash orders follow the store setting'
);

select * from finish();
rollback;
