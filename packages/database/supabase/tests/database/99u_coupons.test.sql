-- Prices: coupons.
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

select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f01', 'b9u@example.iq'),
  ('00000000-0000-0000-0000-000000000f05', 'm9u@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000f05', 'marketing');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9f500000-0000-0000-0000-000000000001', 'game-9u', 'لعبة', 'Game', 49750, 'active', 'sale', 'new');
insert into public.stock_items (product_id, condition, purpose, price)
select '9f500000-0000-0000-0000-000000000001', 'new', 'sale', 49750 from generate_series(1, 3);
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── Making codes ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select throws_ok(
  $$ insert into public.coupons (code, kind, amount) values ('NOPE9U', 'amount', 1000) $$,
  '42501', null, 'only staff make coupons'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000f05', 'aal2');
insert into public.coupons (id, code, kind, amount, max_discount, min_subtotal) values
  ('9f500000-0000-0000-0000-0000000000c1', 'SAVE10', 'percent', 10, 4000, 20000),
  ('9f500000-0000-0000-0000-0000000000c2', 'BIG9U', 'amount', 30000, null, 0),
  ('9f500000-0000-0000-0000-0000000000c3', 'MIN9U', 'amount', 1000, null, 200000);
select throws_ok(
  $$ insert into public.coupons (code, kind, amount) values ('HUGE9U', 'percent', 30) $$,
  '23514', null, 'a percent coupon is at most 20%'
);

-- ── Applying them ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select is_empty($$ select 1 from public.coupons $$, 'members can''t list coupons');
select is(public.apply_coupon('nope'), 'unknown', 'an unknown code is refused');
select is(public.apply_coupon(' save 10 '), null, 'codes match without case or spaces');
insert into public.cart_items (product_id, quantity, condition)
values ('9f500000-0000-0000-0000-000000000001', 1, 'new');
select pg_temp.reset_role();
select results_eq(
  $$ select (q ->> 'discount')::bigint, q ->> 'discount_source', q ->> 'coupon_code'
     from private.price_checkout('00000000-0000-0000-0000-000000000f01', 'baghdad', 'delivery', 'cash_on_delivery', null, 0) q $$,
  $$ values (4000::bigint, 'coupon', 'SAVE10') $$,
  'checkout takes 10% off, up to the coupon''s most'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select public.apply_coupon('BIG9U');
select pg_temp.reset_role();
select ok(
  (select (q ->> 'discount')::bigint <= 49750 * 0.2
   from private.price_checkout('00000000-0000-0000-0000-000000000f01', 'baghdad', 'delivery', 'cash_on_delivery', null, 0) q),
  'a coupon stays within the 20% giveaway cap'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select public.apply_coupon('MIN9U');
select pg_temp.reset_role();
select is(
  (select q ->> 'discount_source'
   from private.price_checkout('00000000-0000-0000-0000-000000000f01', 'baghdad', 'delivery', 'cash_on_delivery', null, 0) q),
  null,
  'below its smallest order a coupon takes nothing off'
);

-- ── Using one ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select public.apply_coupon('SAVE10');
select pg_temp.reset_role();
insert into public.orders (user_id, status, subtotal, shipping_fee, discount, discount_source, total,
  shipping_address, fulfilment, payment_method)
values ('00000000-0000-0000-0000-000000000f01', 'confirmed', 49750, 0, 4000, 'coupon', 45750,
  '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9","city":"Karrada","governorate":"baghdad"}',
  'delivery', 'cash_on_delivery');
select is(
  (select coupon_id from public.orders where user_id = '00000000-0000-0000-0000-000000000f01'),
  '9f500000-0000-0000-0000-0000000000c1'::uuid,
  'the order records its coupon'
);
select is_empty(
  $$ select 1 from public.cart_coupons where user_id = '00000000-0000-0000-0000-000000000f01' $$,
  'and the cart''s code is cleared'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select is(public.apply_coupon('SAVE10'), 'used', 'once per Pass by default');

select * from finish();
rollback;
