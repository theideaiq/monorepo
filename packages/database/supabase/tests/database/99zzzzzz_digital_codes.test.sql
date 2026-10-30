-- Digital codes: brands and prices from cost, what members see, the cart,
-- checkout (online only, a verified phone, no Bulbs, new-Pass limit),
-- paying, the hold, buying from the supplier, revealing and replacing.
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
select plan(36);

-- M has a verified phone; N doesn't; F is new and limited; S is finance.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000c0d1', 'm-codes@example.iq', '{"full_name":"Mona"}'),
  ('00000000-0000-0000-0000-00000000c0d2', 'n-codes@example.iq', '{"full_name":"Nour"}'),
  ('00000000-0000-0000-0000-00000000c0d3', 'f-codes@example.iq', '{"full_name":"Fadi"}'),
  ('00000000-0000-0000-0000-00000000c0d4', 's-codes@example.iq', '{"full_name":"Saad"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set created_at = now() - interval '1 year'
where id in ('00000000-0000-0000-0000-00000000c0d1', '00000000-0000-0000-0000-00000000c0d2');
insert into public.verified_phones (user_id, phone) values
  ('00000000-0000-0000-0000-00000000c0d1', '+9647700000301'),
  ('00000000-0000-0000-0000-00000000c0d3', '+9647700000303');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000c0d4', 'finance');
update public.store_settings set digital_iqd_per_usd = 1310, digital_margin_rate = 8,
  digital_new_pass_days = 30, digital_new_pass_limit = 50000, digital_hold_above = 100000,
  require_verified_phone = false;

insert into public.digital_brands (id, slug, name_en, name_ar, kind, platform, region, region_en, region_ar, active)
values ('c0d00000-0000-0000-0000-0000000000b1', 'playstation-us', 'PlayStation', 'PlayStation', 'gaming',
  'playstation', 'US', 'US store', 'المتجر الأمريكي', true);
insert into public.digital_products (id, brand_id, supplier, supplier_product_id, face_value, face_currency, cost_usd, active)
values
  ('c0d00000-0000-0000-0000-000000000001', 'c0d00000-0000-0000-0000-0000000000b1', 'reloadly', 'psn-us-20', 20, 'USD', 19.20, true),
  ('c0d00000-0000-0000-0000-000000000002', 'c0d00000-0000-0000-0000-0000000000b1', 'reloadly', 'psn-us-100', 100, 'USD', 96.00, true),
  ('c0d00000-0000-0000-0000-000000000003', 'c0d00000-0000-0000-0000-0000000000b1', 'reloadly', 'psn-us-50', 50, 'USD', 48.00, false);

-- ── Prices ──
select is(
  (select price from public.digital_products where id = 'c0d00000-0000-0000-0000-000000000001'),
  27250::bigint, 'the price is the cost at the rate plus the margin, rounded up to 250 (19.20 × 1310 × 1.08 = 27,164)'
);
update public.digital_products set margin_rate = 5 where id = 'c0d00000-0000-0000-0000-000000000001';
select is(
  (select price from public.digital_products where id = 'c0d00000-0000-0000-0000-000000000001'),
  26500::bigint, 'a denomination can carry its own margin'
);
update public.store_settings set digital_iqd_per_usd = 1320;
select is(
  (select price from public.digital_products where id = 'c0d00000-0000-0000-0000-000000000002'),
  137000::bigint, 'a new rate reprices every denomination'
);
update public.store_settings set digital_iqd_per_usd = 1310;

-- ── What members see ──
select pg_temp.login_anon();
select results_eq(
  $$ select face_value, price from public.digital_products order by face_value $$,
  $$ values (20.00::numeric, 26500::bigint), (100.00::numeric, 136000::bigint) $$,
  'visitors see active denominations and prices'
);
select throws_ok(
  $$ select cost_usd from public.digital_products $$,
  '42501', null, 'but never the cost'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select throws_ok(
  $$ select supplier_product_id from public.digital_products $$,
  '42501', null, 'nor the supplier''s ids'
);
select is_empty($$ select * from public.staff_digital_products() $$, 'members don''t get the staff list');
select throws_ok(
  $$ insert into public.cart_digital (user_id, product_id) values ('00000000-0000-0000-0000-00000000c0d1', 'c0d00000-0000-0000-0000-000000000003') $$,
  'P0002', 'Item not available', 'codes not on sale stay out of the cart'
);
select lives_ok(
  $$ insert into public.cart_digital (user_id, product_id, quantity) values ('00000000-0000-0000-0000-00000000c0d1', 'c0d00000-0000-0000-0000-000000000001', 2) $$,
  'two $20 codes go in the cart'
);
select results_eq(
  $$ select (public.set_digital_store_region('PlayStation', 'us')).region $$,
  $$ values ('US') $$,
  'the store region is remembered per platform'
);

-- ── Checkout ──
select throws_ok(
  $$ select public.checkout_quote('delivery', 'cash_on_delivery', null, 0, null) $$,
  '23514', 'Digital codes are paid online', 'codes aren''t paid in cash'
);
select results_eq(
  $$ select (q ->> 'digital_total')::bigint, (q ->> 'total')::bigint, (q ->> 'bulbs_to_earn')::integer,
       q -> 'digital' -> 0 ->> 'name_en'
     from (select public.checkout_quote('delivery', 'online', null, 0, null) q) x $$,
  $$ values (53000::bigint, 53000::bigint, 0, 'PlayStation · US store · USD 20') $$,
  'online, the codes are the whole total, with nothing earned and the region in the name'
);
select pg_temp.reset_role();
insert into public.bulb_entries (user_id, amount, kind, status, available_at)
values ('00000000-0000-0000-0000-00000000c0d1', 5000, 'bonus', 'available', now() - interval '1 day');
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select is(
  ((public.checkout_quote('delivery', 'online', null, 2000, null)) ->> 'bulbs_used')::integer,
  0, 'Bulbs don''t pay for codes'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d2');
insert into public.cart_digital (user_id, product_id) values ('00000000-0000-0000-0000-00000000c0d2', 'c0d00000-0000-0000-0000-000000000001');
select throws_ok(
  $$ select public.checkout_quote('delivery', 'online', null, 0, null) $$,
  '23514', 'Verify your phone number first', 'codes need a verified phone'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d3');
insert into public.cart_digital (user_id, product_id) values ('00000000-0000-0000-0000-00000000c0d3', 'c0d00000-0000-0000-0000-000000000002');
select throws_ok(
  $$ select public.checkout_quote('delivery', 'online', null, 0, null) $$,
  '23514', 'Over the limit for new Passes', 'a new Pass buys up to its limit'
);

-- M orders the two codes.
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
create temporary table made (name text primary key, id uuid);
grant all on made to authenticated;
insert into made select 'order', (public.create_order('{"full_name":"Mona","phone":"+9647700000301"}'::jsonb, 'delivery', 'online', null, 0)).id;
select results_eq(
  $$ select kind, quantity, unit_price, digital_product_id from public.order_items
     where order_id = (select id from made where name = 'order') $$,
  $$ values ('digital', 2, 26500::bigint, 'c0d00000-0000-0000-0000-000000000001'::uuid) $$,
  'the order has a digital line'
);
select results_eq(
  $$ select count(*)::integer, min(status) from public.digital_codes where order_id = (select id from made where name = 'order') $$,
  $$ values (2, 'unpaid') $$,
  'and a code to buy for each copy, once paid'
);
select is_empty($$ select * from public.cart_digital $$, 'the cart is emptied');
select throws_ok(
  $$ select code from public.digital_codes $$,
  '42501', null, 'members can''t read a code from the table'
);

-- ── Paying and buying ──
select pg_temp.reset_role();
select public.complete_order_payment((select id from made where name = 'order'));
select results_eq(
  $$ select distinct status from public.digital_codes where order_id = (select id from made where name = 'order') $$,
  $$ values ('pending') $$,
  'paid: the codes are to buy'
);
select is(
  (select count(*)::integer from public.bulb_entries
   where order_id = (select id from made where name = 'order') and kind = 'purchase'),
  0, 'no cashback on codes'
);
create temporary table taken as select * from public.take_digital_codes(10);
grant all on taken to authenticated;
select results_eq(
  $$ select count(*)::integer, min(supplier_product_id), min(supplier) from taken $$,
  $$ values (2, 'psn-us-20', 'reloadly') $$,
  'the API''s job takes them to buy from the supplier'
);
select is_empty($$ select * from public.take_digital_codes(10) $$, 'once');
select public.deliver_digital_code(code_id, 'ABCD-EFGH-' || row_number() over (), '1234', null, 'tx-' || row_number() over ())
from taken;
select results_eq(
  $$ select count(*)::integer from public.digital_codes where status = 'delivered' and delivered_at is not null $$,
  $$ values (2) $$,
  'the supplier''s codes are stored'
);
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000c0d1' and event = 'digital_code_ready'),
  2, 'and the member is told each is ready'
);

-- ── Revealing ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d2');
select throws_ok(
  $$ select * from public.reveal_digital_code((select code_id from taken order by code_id limit 1)) $$,
  'P0002', 'Not found', 'only the buyer reveals a code'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select results_eq(
  $$ select pin from public.reveal_digital_code((select code_id from taken order by code_id limit 1)) $$,
  $$ values ('1234') $$,
  'the buyer reveals it with a tap'
);
select isnt(
  (select revealed_at from public.digital_codes where id = (select code_id from taken order by code_id limit 1)),
  null, 'and it is marked revealed'
);
select pg_temp.reset_role();
-- Say the rest of a mixed order was delivered by Boxy.
insert into public.shipments (order_id, carrier_id, size, status, delivered_at)
values ((select id from made where name = 'order'), 'boxy-c0d', 'S', 'delivered', now());
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select throws_ok(
  $$ select public.request_return(
       (select order_item_id from public.digital_codes where id = (select code_id from taken order by code_id limit 1)),
       1, 'changed_mind') $$,
  '23514', 'A revealed code can''t be returned', 'a revealed code can''t be returned'
);

-- ── Replacing an invalid code ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select throws_ok(
  $$ select public.replace_digital_code((select code_id from taken order by code_id limit 1), 'bad') $$,
  '42501', 'Not allowed', 'members can''t replace codes'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d4', 'aal2');
insert into made select 'replacement', public.replace_digital_code((select code_id from taken order by code_id limit 1), 'Supplier: invalid');
select results_eq(
  $$ select status, replaces_id = (select code_id from taken order by code_id limit 1)
     from public.digital_codes where id = (select id from made where name = 'replacement') $$,
  $$ values ('pending', true) $$,
  'finance replaces it with a new code to buy'
);
select ok(
  (select count(*) from public.digital_code_events
   where code_id = (select code_id from taken order by code_id limit 1)) >= 6,
  'every step of a code is logged for staff'
);

-- ── The hold on a large first order ──
select pg_temp.reset_role();
update public.profiles set created_at = now() - interval '1 year' where id = '00000000-0000-0000-0000-00000000c0d3';
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d3');
insert into made select 'big', (public.create_order('{"full_name":"Fadi","phone":"+9647700000303"}'::jsonb, 'delivery', 'online', null, 0)).id;
select pg_temp.reset_role();
select public.complete_order_payment((select id from made where name = 'big'));
select results_eq(
  $$ select status from public.digital_codes where order_id = (select id from made where name = 'big') $$,
  $$ values ('held') $$,
  'a first order of codes above the hold waits for staff'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d1');
select throws_ok(
  $$ select public.release_digital_codes((select id from made where name = 'big')) $$,
  '42501', 'Not allowed', 'members can''t release it'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d4', 'aal2');
select is(public.release_digital_codes((select id from made where name = 'big')), 1, 'finance releases it');

-- ── Cancelling ──
select pg_temp.reset_role();
insert into public.cart_digital (user_id, product_id) values ('00000000-0000-0000-0000-00000000c0d2', 'c0d00000-0000-0000-0000-000000000002')
on conflict do nothing;
insert into public.verified_phones (user_id, phone) values ('00000000-0000-0000-0000-00000000c0d2', '+9647700000302');
select pg_temp.login_as('00000000-0000-0000-0000-00000000c0d2');
insert into made select 'cancel', (public.create_order('{"full_name":"Nour","phone":"+9647700000302"}'::jsonb, 'delivery', 'online', null, 0)).id;
select pg_temp.reset_role();
update public.orders set status = 'cancelled' where id = (select id from made where name = 'cancel');
select results_eq(
  $$ select distinct status from public.digital_codes where order_id = (select id from made where name = 'cancel') $$,
  $$ values ('cancelled') $$,
  'an order cancelled before paying cancels its codes'
);

select * from finish();
rollback;
