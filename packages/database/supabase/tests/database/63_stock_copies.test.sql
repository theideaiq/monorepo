-- Stock per copy (the shared catalogue). Run with `bun run db:test`.
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

select plan(28);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U is a customer with The IDEA Plus, A an admin, P a support agent.
truncate public.products, public.orders cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'su@example.iq', '{"full_name":"Customer U"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'sa@example.iq', '{"full_name":"Admin A"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'sp@example.iq', '{"full_name":"Support P"}');
-- Fixture members are adults (ages: a date of birth is needed to buy).
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000e2', 'admin'),
  ('00000000-0000-0000-0000-0000000000e3', 'support');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-copies', 'Plus', 25000, 'month', 'plus', 2, 3);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000000e1', 'plus-copies', 'active', 'wayl', now(), now() + interval '30 days');

update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set free_from = null, plus_free_delivery = false;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

-- A game sold new (three copies) and a record with a variant.
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, condition) values
  ('63000000-0000-0000-0000-000000000001', 'zelda', 'زيلدا', 'Zelda', 60000, 3, 'active', 'sale', 'new'),
  ('63000000-0000-0000-0000-000000000002', 'blue-train', 'بلو ترين', 'Blue Train', 40000, 0, 'active', 'sale', 'new');
insert into public.product_variants (id, product_id, label_en, attributes, price, stock_count) values
  ('63100000-0000-0000-0000-000000000001', '63000000-0000-0000-0000-000000000002', 'Vinyl', '{"Format":"Vinyl"}', 40000, 2);

-- ── Counts become copies ────────────────────────────────────────────────────

select is(
  (select count(*)::int from public.stock_items
   where product_id = '63000000-0000-0000-0000-000000000001' and status = 'available' and purpose = 'sale'),
  3, 'a product created with a stock count gets that many copies for sale'
);
select is(
  (select count(*)::int from public.stock_items
   where variant_id = '63100000-0000-0000-0000-000000000001' and condition = 'new'),
  2, 'a variant''s count becomes copies in the product''s condition'
);

update public.products set stock_count = 1 where id = '63000000-0000-0000-0000-000000000001';
select is(
  (select count(*)::int from public.stock_items
   where product_id = '63000000-0000-0000-0000-000000000001' and status = 'retired'),
  2, 'lowering a count retires available copies'
);
select is(
  (select stock_count from public.products where id = '63000000-0000-0000-0000-000000000001'),
  1, 'the count stays what was written'
);

-- Back to three new copies, plus two used ones priced on their own and a
-- copy the business uses.
update public.products set stock_count = 3 where id = '63000000-0000-0000-0000-000000000001';
insert into public.stock_items (product_id, condition, purpose, price, cost, location) values
  ('63000000-0000-0000-0000-000000000001', 'used', 'sale', 35000, 20000, 'Karrada store'),
  ('63000000-0000-0000-0000-000000000001', 'used', 'sale', 30000, 18000, 'Karrada store'),
  ('63000000-0000-0000-0000-000000000001', 'new', 'business', null, 50000, 'Office');

select is(
  (select stock_count from public.products where id = '63000000-0000-0000-0000-000000000001'),
  5, 'the count is every available copy for sale, used ones included'
);

-- ── What customers see ──────────────────────────────────────────────────────

select pg_temp.login_anon();
select is(
  (select count(*)::int from public.stock_items), 0,
  'visitors cannot read copies (or their costs)'
);
select results_eq(
  $$ select condition::text, available, price from public.product_offers('63000000-0000-0000-0000-000000000001')
     where purpose = 'sale' order by condition $$,
  $$ values ('new', 3, 60000::bigint), ('used', 2, 30000::bigint) $$,
  'offers list new and used copies with the lowest price; business copies stay out'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select is(
  (select count(*)::int from public.stock_items), 0,
  'customers cannot read copies'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal1');
select is(
  (select count(*)::int from public.stock_items), 0,
  'admins without an authenticator-app session cannot read copies'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal2');
select ok(
  (select count(*) from public.stock_items where cost is not null) = 3,
  'catalog staff read copies with their costs'
);
select lives_ok(
  $$ update public.stock_items set location = 'Warehouse'
     where purpose = 'business' $$,
  'catalog staff edit copies'
);

-- ── Orders take copies ──────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
insert into public.cart_items (product_id, quantity, condition) values
  ('63000000-0000-0000-0000-000000000001', 2, 'used');
insert into public.cart_items (product_id, quantity) values
  ('63000000-0000-0000-0000-000000000001', 1);
select lives_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery'
     ) $$,
  'customers order new and used copies of the same product'
);

select pg_temp.reset_role();
select results_eq(
  $$ select condition::text, unit_price from public.order_items order by condition $$,
  $$ values ('new', 60000::bigint), ('used', 35000::bigint) $$,
  'each line is priced from its copies (the dearer of the two used ones)'
);
select is(
  (select subtotal from public.orders), (60000 + 2 * 35000)::bigint,
  'the subtotal adds the lines'
);
select is(
  (select count(*)::int from public.stock_items where status = 'sold' and order_item_id is not null),
  3, 'a cash order takes its copies at once'
);
select is(
  (select stock_count from public.products where id = '63000000-0000-0000-0000-000000000001'),
  2, 'the count drops with the sold copies'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
insert into public.cart_items (product_id, quantity, condition) values
  ('63000000-0000-0000-0000-000000000001', 1, 'used');
select throws_ok(
  $$ select public.create_order(
       '{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}'
     ) $$,
  '23514', 'Not enough stock', 'a condition with no copies left cannot be ordered'
);
delete from public.cart_items;

select lives_ok(
  $$ select public.cancel_order((select id from public.orders limit 1)) $$,
  'customers cancel their cash order'
);
select pg_temp.reset_role();
select is(
  (select count(*)::int from public.stock_items where status = 'available' and purpose = 'sale'
     and product_id = '63000000-0000-0000-0000-000000000001'),
  5, 'cancelling gives the copies back'
);

-- ── Rentals hold a copy ─────────────────────────────────────────────────────

insert into public.stock_items (product_id, condition, purpose) values
  ('63000000-0000-0000-0000-000000000001', 'used', 'rental');
select is(
  (select rental_stock from public.products where id = '63000000-0000-0000-0000-000000000001'),
  1, 'a product sold in the store can also have copies for rent'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok(
  $$ select public.request_rental('63000000-0000-0000-0000-000000000001') $$,
  'members rent a product that has a copy for rent'
);
select pg_temp.reset_role();
select is(
  (select status::text from public.stock_items where purpose = 'rental'),
  'rented', 'the request holds the copy'
);
select is(
  (select rental_stock from public.products where id = '63000000-0000-0000-0000-000000000001'),
  0, 'no copy is left for rent'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(
  $$ select public.request_rental('63000000-0000-0000-0000-000000000001') $$,
  '23514', 'All copies are rented out', 'a second request finds no copy'
);

select pg_temp.reset_role();
update public.rentals set status = 'cancelled';
select is(
  (select status::text from public.stock_items where purpose = 'rental'),
  'available', 'a cancelled rental frees its copy'
);

-- ── Trade-ins become used copies ────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
insert into public.trade_ins (category, title, condition, photos, contact_phone)
values (
  'game', 'Chrono Trigger', 'good',
  array['00000000-0000-0000-0000-0000000000e1/cart.jpg'], '+9647701234567'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
update public.trade_ins set status = 'offer_made', offer_amount = 45000
where id = (select id from public.trade_ins where title = 'Chrono Trigger');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select lives_ok(
  $$ select public.respond_to_trade_in_offer((select id from public.trade_ins where title = 'Chrono Trigger'), true) $$,
  'the customer accepts the offer'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
select lives_ok(
  $$ select public.complete_trade_in((select id from public.trade_ins where title = 'Chrono Trigger'), true) $$,
  'support completes a trade-in into a draft product'
);
select pg_temp.reset_role();
select results_eq(
  $$ select condition::text, cost, status::text from public.stock_items
     where trade_in_id = (select id from public.trade_ins where title = 'Chrono Trigger') $$,
  $$ values ('used', 45000::bigint, 'available') $$,
  'the item becomes one used copy that cost the offer'
);

select * from finish();
rollback;
