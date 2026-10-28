-- Selling: shop orders, pickup locations, readying lines and out of stock.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000c01', 'o9k@example.iq'),
  ('00000000-0000-0000-0000-000000000c02', 'm9k@example.iq'),
  ('00000000-0000-0000-0000-000000000c03', 'x9k@example.iq'),
  ('00000000-0000-0000-0000-000000000c04', 'c9k@example.iq'),
  ('00000000-0000-0000-0000-000000000c05', 'f9k@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000c05', 'finance');
insert into public.organizations (id, name, slug, created_by) values
  ('9a100000-0000-0000-0000-0000000000c1', 'Record Shop', 'records-9k', '00000000-0000-0000-0000-000000000c01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000c01', 'owner'),
  ('9a100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000c02', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9a100000-0000-0000-0000-0000000000d1', '9a100000-0000-0000-0000-0000000000c1', 'Record Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9a100000-0000-0000-0000-000000000001', 'blonde-9k', 'بلوند', 'Blonde', 39750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));
insert into public.delivery_areas (id, province, name) values ('area-9k', 'BGD', 'الكرادة');
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- ── Pickup locations ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000c02');
select throws_ok(
  $$ insert into public.seller_locations (seller_id, name, contact_name, contact_phone, address, region_id, lat, lng)
     values ('9a100000-0000-0000-0000-0000000000d1', 'Main', 'Omar', '+9647701234567', 'Karrada, Street 62', 'area-9k', 33.3, 44.4) $$,
  '42501', null, 'a member can''t add a pickup location'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');
with added as (
  insert into public.seller_locations (seller_id, name, contact_name, contact_phone, address, region_id, lat, lng)
  values ('9a100000-0000-0000-0000-0000000000d1', 'Main', 'Omar', '+9647701234567', 'Karrada, Street 62', 'area-9k', 33.3, 44.4)
  returning id
)
insert into ids select 'branch', id from added;
select is((select count(*)::integer from ids where name = 'branch'), 1, 'the owner adds a pickup location');
select throws_ok(
  $$ update public.seller_locations set boxy_uid = 'fake' $$,
  '42501', null, 'only apps/api writes Boxy''s uid'
);
select throws_ok(
  $$ insert into public.seller_locations (seller_id, name, contact_name, contact_phone, address, region_id, lat, lng)
     values ('9a100000-0000-0000-0000-0000000000d1', 'Bad', 'Omar', '07701234567', 'Karrada, Street 62', 'area-9k', 33.3, 44.4) $$,
  '23514', null, 'the contact phone is an Iraqi mobile in E.164'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000c03');
select is((select count(*)::integer from public.seller_locations), 0, 'other people don''t see them');

-- ── Lines ──
select pg_temp.reset_role();
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
values
  ('9a100000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000c04', 'confirmed', 79500, 0, 79500, 0,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'cash_on_delivery'),
  ('9a100000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000c04', 'pending', 39750, 0, 39750, 0,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online');
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
select o, v.product_id, v.id, 'بلوند', 'Blonde', 39750, 1, '9a100000-0000-0000-0000-0000000000d1', 'Record Shop'
from public.product_variants v,
  unnest(array['9a100000-0000-0000-0000-0000000000e1', '9a100000-0000-0000-0000-0000000000e1',
               '9a100000-0000-0000-0000-0000000000e2']::uuid[]) o
where v.product_id = '9a100000-0000-0000-0000-000000000001';
insert into ids select 'line' || row_number() over (order by i.id), i.id from public.order_items i
where i.order_id = '9a100000-0000-0000-0000-0000000000e1';
insert into public.stock_items (product_id, variant_id, condition, purpose, status, price, seller_id, order_item_id)
select v.product_id, v.id, 'new', 'sale', 'sold', 39750, '9a100000-0000-0000-0000-0000000000d1',
  (select id from ids where name = 'line2')
from public.product_variants v where v.product_id = '9a100000-0000-0000-0000-000000000001';

select ok(
  (select bool_and(seller_status = 'waiting' and ready_by between now() + interval '47 hours' and now() + interval '49 hours')
   from public.order_items where order_id = '9a100000-0000-0000-0000-0000000000e1'),
  'a confirmed order''s shop lines wait, due in 2 days'
);
select is(
  (select ready_by from public.order_items where order_id = '9a100000-0000-0000-0000-0000000000e2'),
  null, 'an unpaid order''s line isn''t due yet'
);
update public.orders set status = 'paid' where id = '9a100000-0000-0000-0000-0000000000e2';
select isnt(
  (select ready_by from public.order_items where order_id = '9a100000-0000-0000-0000-0000000000e2'),
  null, 'paying starts the clock'
);

-- ── What the shop sees ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000c02');
select results_eq(
  $$ select distinct customer, seller_payout from public.seller_order_lines('9a100000-0000-0000-0000-0000000000d1') $$,
  $$ values ('Ali · Karrada'::text, 34980::bigint) $$,
  'a member sees the first name and area, and the payout after commission'
);
select ok(
  not exists (
    select 1 from public.seller_order_lines('9a100000-0000-0000-0000-0000000000d1') l
    where to_jsonb(l)::text like '%7711111111%' or to_jsonb(l)::text like '%House 9%'
  ),
  'never the phone or the address'
);
select is_empty($$ select 1 from public.orders $$, 'nor the orders themselves');
select pg_temp.login_as('00000000-0000-0000-0000-000000000c03');
select throws_ok(
  $$ select * from public.seller_order_lines('9a100000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'other people see nothing'
);

-- ── Ready for pickup ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000c02');
select throws_ok(
  $$ select public.mark_lines_ready(array[(select id from ids where name = 'line1')],
       (select id from ids where name = 'branch')) $$,
  '23514', null, 'a branch Boxy doesn''t know yet can''t take parcels'
);
select pg_temp.reset_role();
update public.seller_locations set boxy_uid = 'loc_9k' where id = (select id from ids where name = 'branch');
select pg_temp.login_as('00000000-0000-0000-0000-000000000c02');
select results_eq(
  $$ select public.mark_lines_ready(array[(select id from ids where name = 'line1')],
       (select id from ids where name = 'branch')) $$,
  $$ values ('9a100000-0000-0000-0000-0000000000e1'::uuid) $$,
  'a member readies a line; apps/api sends that order''s parcel'
);
select throws_ok(
  $$ select public.mark_line_out_of_stock((select id from ids where name = 'line1')) $$,
  '23514', null, 'a ready line can''t be out of stock'
);

-- ── Out of stock ──
select is(public.mark_line_out_of_stock((select id from ids where name = 'line2')), 'out_of_stock'::public.seller_line_status,
  'a waiting line can be');
select pg_temp.reset_role();
select is(
  (select status::text from public.stock_items where seller_id = '9a100000-0000-0000-0000-0000000000d1'),
  'retired', 'its copy leaves stock'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000c05', 'aal2');
select isnt(public.mark_line_refunded((select id from ids where name = 'line2')), null, 'finance marks it refunded');

-- ── Cancelling and parcels ──
select pg_temp.reset_role();
update public.orders set status = 'cancelled' where id = '9a100000-0000-0000-0000-0000000000e2';
select is(
  (select seller_status::text from public.order_items where order_id = '9a100000-0000-0000-0000-0000000000e2'),
  'cancelled', 'a cancelled order cancels its waiting shop lines'
);
insert into public.shipments (order_id, carrier_id, size, seller_id) values
  ('9a100000-0000-0000-0000-0000000000e1', 'bx-9k-1', 'S', '9a100000-0000-0000-0000-0000000000d1'),
  ('9a100000-0000-0000-0000-0000000000e1', 'bx-9k-2', 'S', '00000000-0000-4000-8000-000000000001');
select throws_ok(
  $$ insert into public.shipments (order_id, carrier_id, size, seller_id)
     values ('9a100000-0000-0000-0000-0000000000e1', 'bx-9k-3', 'S', '9a100000-0000-0000-0000-0000000000d1') $$,
  '23505', null, 'one live parcel per order and seller'
);

select * from finish();
rollback;
