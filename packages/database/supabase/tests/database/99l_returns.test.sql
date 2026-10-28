-- Selling: returns, refunds, refused cash orders and the shop score.
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

select plan(34);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000d01', 'o9l@example.iq'),
  ('00000000-0000-0000-0000-000000000d02', 'm9l@example.iq'),
  ('00000000-0000-0000-0000-000000000d03', 'x9l@example.iq'),
  ('00000000-0000-0000-0000-000000000d04', 'c9l@example.iq'),
  ('00000000-0000-0000-0000-000000000d05', 'f9l@example.iq'),
  ('00000000-0000-0000-0000-000000000d06', 's9l@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000d05', 'finance'),
  ('00000000-0000-0000-0000-000000000d06', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('9b100000-0000-0000-0000-0000000000c1', 'Record Shop', 'records-9l', '00000000-0000-0000-0000-000000000d01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9b100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000d01', 'owner'),
  ('9b100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000d02', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9b100000-0000-0000-0000-0000000000d1', '9b100000-0000-0000-0000-0000000000c1', 'Record Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9b100000-0000-0000-0000-000000000001', 'blonde-9l', 'بلوند', 'Blonde', 39750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- A delivered online order: 3 copies of one record and 1 of another
-- line, 100 Bulbs spent (10,000 IQD).
insert into public.orders (id, user_id, status, subtotal, shipping_fee, bulbs_used, bulbs_discount, total, max_bulbs,
  shipping_address, fulfilment, payment_method, paid_at)
values
  ('9b100000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000d04', 'delivered', 159000, 5000, 100, 10000, 154000, 100,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '3 days');
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
select '9b100000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'بلوند', 'Blonde', 39750, q, '9b100000-0000-0000-0000-0000000000d1', 'Record Shop'
from public.product_variants v, unnest(array[3, 1]) q
where v.product_id = '9b100000-0000-0000-0000-000000000001';
insert into ids select case when i.quantity = 3 then 'three' else 'one' end, i.id from public.order_items i
where i.order_id = '9b100000-0000-0000-0000-0000000000e1';
insert into public.shipments (id, order_id, carrier_id, size, seller_id, status, delivered_at) values
  ('9b100000-0000-0000-0000-0000000000f1', '9b100000-0000-0000-0000-0000000000e1', 'bx-9l-1', 'S',
   '9b100000-0000-0000-0000-0000000000d1', 'delivered', now() - interval '1 day');
update public.order_items set shipment_id = '9b100000-0000-0000-0000-0000000000f1', seller_status = 'picked_up'
where order_id = '9b100000-0000-0000-0000-0000000000e1';

-- ── Asking ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d03');
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'three'), 1, 'faulty', null,
       array['00000000-0000-0000-0000-000000000d03/a.jpg']) $$,
  'P0002', null, 'only the customer asks to return their order'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d04');
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'three'), 1, 'faulty') $$,
  '23514', null, 'a fault needs photos'
);
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'three'), 1, 'faulty', null,
       array['00000000-0000-0000-0000-000000000d03/a.jpg']) $$,
  '23514', null, 'photos are the customer''s own uploads'
);
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'one'), 1, 'changed_mind', null,
       array['00000000-0000-0000-0000-000000000d04/a.jpg']) $$,
  '23514', null, 'changed mind is for unopened items only'
);
with asked as (
  select r.id from public.request_return((select id from ids where name = 'three'), 1, 'faulty', 'Skips on side B',
    array['00000000-0000-0000-0000-000000000d04/a.jpg']) r
)
insert into ids select 'faulty', id from asked;
select results_eq(
  $$ select status::text, fault::text from public.returns where id = (select id from ids where name = 'faulty') $$,
  $$ values ('requested', 'shop') $$,
  'a faulty item waits for the shop, at the shop''s fault'
);
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'three'), 3, 'faulty', null,
       array['00000000-0000-0000-0000-000000000d04/a.jpg']) $$,
  '23514', null, 'no more than is left on the line'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d03');
select is_empty($$ select 1 from public.returns $$, 'other people see no returns');

-- ── The shop answers, Staff decide ──
select throws_ok(
  $$ select public.respond_to_return((select id from ids where name = 'faulty'), true) $$,
  'P0002', null, 'other people can''t answer'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d02');
select is((select count(*)::integer from public.returns), 1, 'a shop member sees the return');
select throws_ok(
  $$ select public.respond_to_return((select id from ids where name = 'faulty'), false) $$,
  '23514', null, 'a dispute needs a reason'
);
select is(
  (public.respond_to_return((select id from ids where name = 'faulty'), false, 'It played fine when packed')).status,
  'disputed'::public.return_status, 'the shop disputes it'
);
select throws_ok(
  $$ select public.decide_return((select id from ids where name = 'faulty'), true, 'Photos show a scratch') $$,
  '42501', null, 'shops don''t decide disputes'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d06', 'aal2');
select is(
  (public.decide_return((select id from ids where name = 'faulty'), true, 'Photos show a scratch')).status,
  'approved'::public.return_status, 'support approves it'
);

-- ── Back at the shop, refunded ──
select pg_temp.reset_role();
select is((public.mark_return_received((select id from ids where name = 'faulty'))).status,
  'received'::public.return_status, 'apps/api marks it back at the shop');
select pg_temp.login_as('00000000-0000-0000-0000-000000000d02');
select results_eq(
  $$ select status::text, refund_amount, refund_bulbs
     from public.confirm_return_condition((select id from ids where name = 'faulty'), true) $$,
  $$ values ('refund_due', 37250::bigint, 25) $$,
  'the shop''s check makes the line''s share of the goods paid, and its Bulbs, due'
);
select pg_temp.reset_role();
select is(
  (select sum(amount)::integer from public.bulb_entries where order_id = '9b100000-0000-0000-0000-0000000000e1' and kind = 'return'),
  25, 'the Bulbs come back'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d05', 'aal2');
select throws_ok(
  $$ select public.mark_return_refunded((select id from ids where name = 'faulty'), ' ') $$,
  '23514', null, 'a manual refund needs its reference'
);
select is(
  (public.mark_return_refunded((select id from ids where name = 'faulty'), 'ZC-123')).status,
  'refunded'::public.return_status, 'finance marks it refunded'
);

-- ── Changed mind, by the deadlines ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d04');
with asked as (
  select r.id from public.request_return((select id from ids where name = 'one'), 1, 'changed_mind', null,
    array['00000000-0000-0000-0000-000000000d04/b.jpg'], true) r
)
insert into ids select 'mind', id from asked;
select is((select fault::text from public.returns where id = (select id from ids where name = 'mind')),
  'customer', 'changed mind is the customer''s');
select pg_temp.reset_role();
update public.returns set respond_by = now() - interval '1 minute' where id = (select id from ids where name = 'mind');
select is((select count(*)::integer from public.sweep_returns()), 1, 'an unanswered request is accepted');
update public.returns set collection_fee = 5000 where id = (select id from ids where name = 'mind');
select public.mark_return_received((select id from ids where name = 'mind'));
update public.returns set check_by = now() - interval '1 minute' where id = (select id from ids where name = 'mind');
select public.sweep_returns();
select results_eq(
  $$ select status::text, refund_amount from public.returns where id = (select id from ids where name = 'mind') $$,
  $$ values ('refund_due', 32250::bigint) $$,
  'an unchecked item is fine; the return delivery comes out of a changed-mind refund'
);

-- ── Wrong item, late ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d04');
select is(
  (public.request_return((select id from ids where name = 'three'), 1, 'wrong_item', null,
    array['00000000-0000-0000-0000-000000000d04/c.jpg'])).status,
  'approved'::public.return_status, 'a wrong item is approved at once'
);
select pg_temp.reset_role();
update public.shipments set delivered_at = now() - interval '15 days' where id = '9b100000-0000-0000-0000-0000000000f1';
select pg_temp.login_as('00000000-0000-0000-0000-000000000d04');
select throws_ok(
  $$ select public.request_return((select id from ids where name = 'three'), 1, 'faulty', null,
       array['00000000-0000-0000-0000-000000000d04/d.jpg']) $$,
  '23514', null, 'returns close 14 days after delivery'
);
select throws_ok($$ select public.sweep_returns() $$, '42501', null, 'only apps/api sweeps');

-- ── Refused at the door ──
select pg_temp.reset_role();
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
select o, '00000000-0000-0000-0000-000000000d04', 'shipped', 39750, 0, 39750, 0,
  '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9","city":"Karrada","governorate":"baghdad"}',
  'delivery', 'cash_on_delivery'
from unnest(array['9b100000-0000-0000-0000-0000000000e2', '9b100000-0000-0000-0000-0000000000e3',
                  '9b100000-0000-0000-0000-0000000000e4']::uuid[]) o;
insert into public.shipments (id, order_id, carrier_id, size, seller_id, status, returned_at)
select case when o = '9b100000-0000-0000-0000-0000000000e2' then '9b100000-0000-0000-0000-0000000000f2'::uuid
  else gen_random_uuid() end, o, 'bx-' || o, 'S', '9b100000-0000-0000-0000-0000000000d1', 'returned', now()
from unnest(array['9b100000-0000-0000-0000-0000000000e2', '9b100000-0000-0000-0000-0000000000e3',
                  '9b100000-0000-0000-0000-0000000000e4']::uuid[]) o;
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name, shipment_id)
select '9b100000-0000-0000-0000-0000000000e2', v.product_id, v.id, 'بلوند', 'Blonde', 39750, 1, '9b100000-0000-0000-0000-0000000000d1',
  'Record Shop', (select s.id from public.shipments s where s.order_id = '9b100000-0000-0000-0000-0000000000e2')
from public.product_variants v where v.product_id = '9b100000-0000-0000-0000-000000000001';
update public.order_items set seller_status = 'picked_up' where order_id = '9b100000-0000-0000-0000-0000000000e2';

select pg_temp.login_as('00000000-0000-0000-0000-000000000d02');
select is(
  (select count(*)::integer from public.seller_parcels_back('9b100000-0000-0000-0000-0000000000d1')),
  3, 'the shop sees the refused parcels to confirm'
);
select results_eq(
  $$ select distinct customer from public.seller_returns('9b100000-0000-0000-0000-0000000000d1') $$,
  $$ values ('Ali · Karrada'::text) $$,
  'and its returns, with the customer as first name and area'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d03');
select throws_ok(
  $$ select * from public.seller_returns('9b100000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'other people can''t list a shop''s returns'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d03');
select throws_ok(
  $$ select public.confirm_parcel_back('9b100000-0000-0000-0000-0000000000f2') $$,
  'P0002', null, 'only the shop confirms a parcel is back'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d02');
select isnt(
  public.confirm_parcel_back('9b100000-0000-0000-0000-0000000000f2'),
  null, 'the shop confirms a refused parcel is back'
);
select pg_temp.reset_role();
select is(
  (select seller_status::text from public.order_items where order_id = '9b100000-0000-0000-0000-0000000000e2'),
  'cancelled', 'its lines are cancelled'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d04');
select ok(public.must_pay_online(), 'after 3 refused cash orders the customer pays online');
select pg_temp.reset_role();
select throws_ok(
  $$ insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
     values ('00000000-0000-0000-0000-000000000d04', 'confirmed', 39750, 0, 39750, 0,
       '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9","city":"Karrada","governorate":"baghdad"}',
       'delivery', 'cash_on_delivery') $$,
  '23514', null, 'and can''t order cash on delivery'
);

-- ── Score ──
select ok(public.refresh_seller_scores() >= 1, 'the nightly refresh scores shops');
select ok(
  (select score < 100 from public.sellers where id = '9b100000-0000-0000-0000-0000000000d1'),
  'valid returns lower the shop''s score'
);

select * from finish();
rollback;
