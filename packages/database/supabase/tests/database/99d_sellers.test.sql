-- Sellers and offers: The IDEA and approved shops sell copies; cart lines,
-- order lines and the copies taken name the seller.
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

select plan(24);

-- O owns Shop (M a plain member), X is someone else, U a customer, A staff.
truncate public.products, public.orders cascade;
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000009d1', 'o9d@example.iq'),
  ('00000000-0000-0000-0000-0000000009d2', 'm9d@example.iq'),
  ('00000000-0000-0000-0000-0000000009d3', 'x9d@example.iq'),
  ('00000000-0000-0000-0000-0000000009d4', 'u9d@example.iq'),
  ('00000000-0000-0000-0000-0000000009d5', 'a9d@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000009d5', 'admin');
insert into public.organizations (id, name, slug, created_by) values
  ('9d000000-0000-0000-0000-0000000000c1', 'Records Shop', 'records-9d', '00000000-0000-0000-0000-0000000009d1');
insert into public.organization_members (organization_id, user_id, role) values
  ('9d000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009d1', 'owner'),
  ('9d000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009d2', 'member');
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, condition) values
  ('9d000000-0000-0000-0000-000000000001', 'record-9d', 'أسطوانة', 'Record', 20000, 2, 'active', 'sale', 'new');
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── The IDEA ────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select name, status::text from public.sellers $$,
  $$ values ('The IDEA', 'approved') $$,
  'The IDEA is the first seller, and visitors see approved sellers'
);
select pg_temp.reset_role();
select is(
  (select count(*)::int from public.stock_items
   where product_id = '9d000000-0000-0000-0000-000000000001'
     and seller_id = '00000000-0000-4000-8000-000000000001'),
  2, 'Copies are The IDEA''s unless said otherwise'
);

-- ── Applying ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d2');
select throws_ok(
  $$ select public.apply_to_sell('9d000000-0000-0000-0000-0000000000c1', 'Records Shop') $$,
  '42501', null, 'A plain member cannot apply'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d1');
select is(
  (select status::text from public.apply_to_sell('9d000000-0000-0000-0000-0000000000c1', 'Records Shop')),
  'pending', 'An owner applies and waits for staff'
);
select is(
  (select count(*)::int from public.seller_details), 1,
  'The owner sees the application''s details'
);
select lives_ok(
  $$ update public.seller_details set payout_bank = 'Rafidain', payout_iban = 'IQ98NBIQ850123456789012',
       documents = array['9d000000-0000-0000-0000-0000000000c1/licence.pdf'] $$,
  'The owner adds documents and payout details'
);
select throws_ok(
  $$ update public.seller_details set documents = array['someone-else/licence.pdf'] $$,
  '23514', null, 'Documents stay in the organization''s folder'
);
select throws_ok(
  $$ update public.seller_details set deposit_required = 0 $$,
  '42501', null, 'Only staff set the deposit'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d2');
select is(
  (select count(*)::int from public.sellers where not is_house), 1,
  'Members see their organization''s application'
);
select is(
  (select count(*)::int from public.seller_details), 0,
  'Plain members do not see documents or payout details'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d3');
select is(
  (select count(*)::int from public.sellers where not is_house), 0,
  'Others do not see a pending application'
);

-- A shop's copies (staff add them for now; Partners → Selling in item 11).
select pg_temp.reset_role();
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9d000000-0000-0000-0000-000000000001', 'used', 'sale', 15000, id
from public.sellers where organization_id = '9d000000-0000-0000-0000-0000000000c1';

select pg_temp.login_anon();
select is(
  (select count(*)::int from public.product_offers('9d000000-0000-0000-0000-000000000001') where seller_name = 'Records Shop'),
  0, 'A shop''s copies are not offered before approval'
);

-- ── Deciding ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d1');
select throws_ok(
  $$ select public.decide_seller((select id from public.sellers where not is_house), 'approved') $$,
  '42501', null, 'A shop cannot approve itself'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d5', 'aal2');
select is(
  (select status::text from public.decide_seller(
    (select id from public.sellers where not is_house), 'approved', 'Licence checked', 250000)),
  'approved', 'Staff approve the shop'
);
select is(
  (select deposit_required from public.seller_details), 250000::bigint,
  'and set its security deposit'
);
select throws_ok(
  $$ select public.decide_seller('00000000-0000-4000-8000-000000000001', 'suspended') $$,
  'P0002', null, 'The IDEA itself cannot be suspended'
);

-- ── Offers and orders ───────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select seller_name, condition::text, available, price
     from public.product_offers('9d000000-0000-0000-0000-000000000001') where purpose = 'sale' $$,
  $$ values ('The IDEA', 'new', 2, 20000::bigint), ('Records Shop', 'used', 1, 15000::bigint) $$,
  'Offers are listed by seller, The IDEA first'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000009d4');
insert into public.cart_items (product_id, quantity, condition, seller_id)
select '9d000000-0000-0000-0000-000000000001', 1, 'used', id
from public.sellers where not is_house;
select is(
  (public.checkout_quote(payment_method => 'cash_on_delivery', governorate => 'baghdad') ->> 'subtotal')::bigint,
  15000::bigint, 'The quote charges the shop''s price'
);
select pg_temp.reset_role();
select is(
  private.price_checkout('00000000-0000-0000-0000-0000000009d4', 'baghdad', 'delivery', 'cash_on_delivery', null, 0)
    -> 'lines' -> 0 ->> 'seller_name',
  'Records Shop', 'and names the line''s seller'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000009d4');

select public.create_order(
  '{"full_name":"U","phone":"+9647700000994","governorate":"baghdad","city":"Karrada","address":"Street 62"}',
  'delivery', 'cash_on_delivery'
);
select results_eq(
  $$ select seller_name, unit_price from public.order_items $$,
  $$ values ('Records Shop', 15000::bigint) $$,
  'The order line keeps its seller'
);
select pg_temp.reset_role();
select results_eq(
  $$ select s.status::text, sl.name from public.stock_items s join public.sellers sl on sl.id = s.seller_id
     where s.order_item_id is not null $$,
  $$ values ('sold', 'Records Shop') $$,
  'The copy taken is the shop''s'
);
select is(
  (select count(*)::int from public.stock_items
   where seller_id = '00000000-0000-4000-8000-000000000001' and status = 'available'),
  2, 'The IDEA''s copies are untouched'
);

-- A suspended shop sells nothing, even from a cart filled before.
select pg_temp.login_as('00000000-0000-0000-0000-0000000009d4');
insert into public.cart_items (product_id, quantity, condition, seller_id)
select '9d000000-0000-0000-0000-000000000001', 1, 'used', id
from public.sellers where not is_house;
select pg_temp.login_as('00000000-0000-0000-0000-0000000009d5', 'aal2');
select public.decide_seller((select id from public.sellers where not is_house), 'suspended');
select pg_temp.login_anon();
select is(
  (select count(*)::int from public.product_offers('9d000000-0000-0000-0000-000000000001') where seller_name = 'Records Shop'),
  0, 'A suspended shop''s copies are not offered'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000009d4');
select throws_ok(
  $$ select public.checkout_quote(payment_method => 'cash_on_delivery', governorate => 'baghdad') $$,
  '23514', null, 'and its lines cannot be checked out'
);

select * from finish();
rollback;
