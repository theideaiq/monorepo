-- Store, Plus, editorial and back-office rules. Run with `bun run db:test`.
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

select plan(51);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- Start from an empty store and no staff so existing data (the local seed,
-- or data imported into a real project) doesn't change the counts. The
-- transaction is rolled back at the end.
truncate public.products, public.orders, public.rentals, public.posts, public.events,
  public.chart_of_accounts cascade;
delete from public.staff;

-- U is a customer, V another customer, S a superadmin, E an editor,
-- P a support agent, F finance.

insert into auth.users (id, email, phone, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'u@example.iq', '9647700000101', '{"full_name":"Customer U"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'v@example.iq', '9647700000102', '{"full_name":"Customer V"}'),
  ('00000000-0000-0000-0000-0000000000a3', 's@example.iq', '9647700000103', '{"full_name":"Super S"}'),
  ('00000000-0000-0000-0000-0000000000a4', 'e@example.iq', '9647700000104', '{"full_name":"Editor E"}'),
  ('00000000-0000-0000-0000-0000000000a5', 'p@example.iq', '9647700000105', '{"full_name":"Support P"}'),
  ('00000000-0000-0000-0000-0000000000a6', 'f@example.iq', '9647700000106', '{"full_name":"Finance F"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a3', 'superadmin'),
  ('00000000-0000-0000-0000-0000000000a4', 'editor'),
  ('00000000-0000-0000-0000-0000000000a5', 'support'),
  ('00000000-0000-0000-0000-0000000000a6', 'finance');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('20000000-0000-0000-0000-000000000001', 'ps5', 'بلايستيشن ٥', 'PS5', 700000, 2, 'active', 'sale'),
  ('20000000-0000-0000-0000-000000000002', 'draft-item', 'مسودة', 'Draft', 1000, 5, 'draft', 'sale'),
  ('20000000-0000-0000-0000-000000000003', 'elden-ring', 'إلدن رينغ', 'Elden Ring', 60000, 1, 'active', 'rental');

-- The PS5 got its default variant (the disc edition) with its price and
-- stock; the digital edition is a second variant.
insert into public.product_variants (id, product_id, label_en, label_ar, attributes, price, stock_count) values
  ('21000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Digital', 'رقمي', '{"Edition":"Digital"}', 650000, 3);

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-test', 'Plus', 25000, 'month', 'plus', 1, 1);

update public.store_settings set shipping_fee = 5000;
update public.delivery_zones set free_from = 1000000, plus_free_delivery = false;

-- ── Catalog ─────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select is((select count(*)::int from public.products), 2, 'anon sees only active products');
select throws_ok(
  $$ insert into public.products (slug, name_ar, name_en, price) values ('x', 'x', 'x', 1) $$,
  '42501', null, 'anon cannot add products'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is(
  (select count(*)::int from public.products where status = 'draft'), 0,
  'customers do not see drafts'
);
update public.products set price = 1 where slug = 'ps5';
select pg_temp.reset_role();
select is((select price from public.products where slug = 'ps5'), 650000::bigint, 'customer price change had no effect (the price is the cheapest variant''s)');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select lives_ok(
  $$ update public.products set featured = true where slug = 'ps5' $$,
  'superadmins edit products'
);
select is((select count(*)::int from public.products), 3, 'staff see drafts');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal1');
select is(
  (select count(*)::int from public.products), 2,
  'staff rights need an authenticator-app session'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select ok(
  exists (select 1 from public.audit_logs where entity_type = 'products' and action = 'update'),
  'product edits are audited'
);

-- ── Cart and orders ─────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000101","governorate":"Baghdad","address":"Karrada"}') $$,
  'P0002', 'Cart is empty', 'an empty cart cannot be ordered'
);

select throws_ok(
  $$ insert into public.cart_items (product_id, quantity) values ('20000000-0000-0000-0000-000000000001', 1) $$,
  '23514', 'Choose a variant', 'a product with several variants needs one chosen'
);
insert into public.cart_items (product_id, variant_id, quantity)
  select product_id, id, 1 from public.product_variants
  where product_id = '20000000-0000-0000-0000-000000000001' and label_en is null;
insert into public.cart_items (product_id, variant_id, quantity)
  values ('20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 2);
select throws_ok(
  $$ insert into public.cart_items (product_id, variant_id, quantity, user_id)
     values ('20000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 1, '00000000-0000-0000-0000-0000000000a2') $$,
  '42501', null, 'users cannot fill someone else''s cart'
);
select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"0770","governorate":"Baghdad","address":"Karrada"}') $$,
  '23514', 'Invalid shipping address', 'phone numbers must be E.164'
);

select lives_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000101","governorate":"Baghdad","address":"Karrada"}') $$,
  'customers place an order from their cart'
);
select is(
  (select total from public.orders where user_id = '00000000-0000-0000-0000-0000000000a1'),
  (700000 + 2 * 650000)::bigint,
  'orders are priced from the catalog; free delivery above the threshold'
);
select is((select count(*)::int from public.cart_items), 0, 'ordering empties the cart');
select is((select count(*)::int from public.order_items), 2, 'order lines are snapshotted');

update public.orders set status = 'paid';
select is(
  (select status::text from public.orders), 'pending',
  'customers cannot mark orders paid'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is((select count(*)::int from public.orders), 0, 'customers only see their own orders');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a5', 'aal2');
select is((select count(*)::int from public.orders), 1, 'support sees every order');
select throws_ok(
  $$ update public.orders set status = 'paid' $$,
  '23514', null, 'support cannot mark orders paid'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ select public.complete_order_payment((select id from public.orders limit 1)) $$,
  '42501', null, 'only the server completes payments'
);

select pg_temp.reset_role();
set local role service_role;
select lives_ok(
  $$ select public.complete_order_payment((select id from public.orders limit 1)) $$,
  'the server completes a payment'
);
select public.complete_order_payment((select id from public.orders limit 1));
select pg_temp.reset_role();
select is((select status::text from public.orders), 'paid', 'the order is paid');
select is(
  (select stock_count from public.product_variants
   where product_id = '20000000-0000-0000-0000-000000000001' and label_en is null), 1,
  'stock is taken once, even if the webhook repeats'
);
select is(
  (select stock_count from public.product_variants where id = '21000000-0000-0000-0000-000000000001'), 1,
  'variant stock is taken'
);
select is(
  (select stock_count from public.products where slug = 'ps5'), 2,
  'the product''s stock is every variant''s'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a5', 'aal2');
select lives_ok(
  $$ update public.orders set status = 'shipped', tracking_number = 'TRK1' $$,
  'support ships paid orders'
);

-- ── Plus rentals ────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ select public.request_rental('20000000-0000-0000-0000-000000000003') $$,
  '23514', 'No free rental slots', 'renting needs a Plus membership'
);

select pg_temp.reset_role();
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000000a2', 'plus-test', 'active', 'wayl', now(), now() + interval '30 days');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select is(
  (select slots from public.my_rental_allowance()), 1,
  'members see their rental allowance'
);
select lives_ok(
  $$ select public.request_rental('20000000-0000-0000-0000-000000000003') $$,
  'members rent within their slots'
);
select throws_ok(
  $$ select public.request_rental('20000000-0000-0000-0000-000000000003') $$,
  '23514', 'No free rental slots', 'members cannot exceed their slots'
);
select is(
  (select count(*)::int from public.subscriptions), 1,
  'members see their own subscription'
);
select lives_ok(
  $$ select public.cancel_rental((select id from public.rentals limit 1)) $$,
  'members cancel undelivered requests'
);
select pg_temp.reset_role();
select is(
  (select stock_count from public.products where slug = 'elden-ring'), 1,
  'cancelling puts the copy back'
);

-- ── Editorial ───────────────────────────────────────────────────────────────

insert into public.events (id, slug, title_ar, title_en, location, starts_at, published, capacity) values
  ('30000000-0000-0000-0000-000000000001', 'reading', 'أمسية', 'Reading', 'Baghdad', now() + interval '7 days', true, 1),
  ('30000000-0000-0000-0000-000000000002', 'draft-event', 'مسودة', 'Draft', 'Baghdad', now() + interval '7 days', false, null);
insert into public.posts (slug, title_ar, title_en, published_at) values
  ('hello', 'مرحبا', 'Hello', now()),
  ('later', 'لاحقا', 'Later', null);

select pg_temp.login_anon();
select is((select count(*)::int from public.events), 1, 'anon sees published events');
select is((select count(*)::int from public.posts), 1, 'anon sees published posts');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$ insert into public.event_rsvps (event_id) values ('30000000-0000-0000-0000-000000000001') $$,
  'members RSVP'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2');
select throws_ok(
  $$ insert into public.event_rsvps (event_id) values ('30000000-0000-0000-0000-000000000001') $$,
  '23514', 'This event is full', 'full events refuse RSVPs'
);
select is(
  public.event_rsvp_count('30000000-0000-0000-0000-000000000001'), 1::bigint,
  'RSVP counts are public'
);

select lives_ok(
  $$ insert into public.submissions (title, type, body) values ('Poem', 'poetry', 'Words') $$,
  'members submit work'
);
select throws_ok(
  $$ insert into public.submissions (title, type, body, file_path)
     values ('Art', 'visual_art', null, '00000000-0000-0000-0000-0000000000a1/x.png') $$,
  '42501', null, 'files must be in the author''s own folder'
);
select throws_ok(
  $$ update public.submissions set decision_note = 'Accept me' $$,
  '42501', null, 'authors cannot write the decision'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select is((select count(*)::int from public.submissions), 0, 'authors only see their own submissions');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4', 'aal2');
select is(
  (select author_name from public.review_queue() limit 1), null,
  'reviews are blind until a decision'
);
update public.submissions set status = 'accepted';
select is(
  (select author_name from public.review_queue() limit 1), 'Customer V',
  'the author is revealed after the decision'
);
select is((select count(*)::int from public.orders), 0, 'editors do not see orders');

-- ── Back office ─────────────────────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.chart_of_accounts (id, code, name, type) values
  ('40000000-0000-0000-0000-000000000001', '1000', 'Cash', 'asset'),
  ('40000000-0000-0000-0000-000000000002', '4000', 'Sales', 'revenue');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a6', 'aal2');
select throws_ok(
  $$ select public.post_journal_entry(current_date, 'Unbalanced',
       '[{"account_id":"40000000-0000-0000-0000-000000000001","debit":100},
         {"account_id":"40000000-0000-0000-0000-000000000002","credit":90}]') $$,
  '23514', 'Debits and credits must balance', 'journal entries must balance'
);
select lives_ok(
  $$ select public.post_journal_entry(current_date, 'Sale',
       '[{"account_id":"40000000-0000-0000-0000-000000000001","debit":100},
         {"account_id":"40000000-0000-0000-0000-000000000002","credit":100}]') $$,
  'finance posts balanced entries'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4', 'aal2');
select is((select count(*)::int from public.ledger_entries), 0, 'editors cannot read the ledger');

-- ── Staff management ────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a4', 'aal2');
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000a4', 'superadmin') $$,
  '42501', null, 'staff cannot promote themselves'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000a3', 'aal2');
select throws_ok(
  $$ select public.set_staff_role('00000000-0000-0000-0000-0000000000a3', null) $$,
  '23514', 'There must be at least one superadmin', 'the last superadmin stays'
);

select * from finish();
rollback;
