-- Wishlists, reviews, support, notifications, rental tiers and finance
-- extras. Run with `bun run db:test`.
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

select plan(37);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U and V are customers, P is support, F is finance.

truncate public.products, public.orders, public.rentals, public.chart_of_accounts cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'u@example.iq', '{"full_name":"Customer Uday"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'v@example.iq', '{"full_name":"Customer Vian"}'),
  ('00000000-0000-0000-0000-0000000000b3', 'p@example.iq', '{"full_name":"Support Pari"}'),
  ('00000000-0000-0000-0000-0000000000b4', 'f@example.iq', '{"full_name":"Finance Firas"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000b3', 'support'),
  ('00000000-0000-0000-0000-0000000000b4', 'finance');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, rental_tier) values
  ('60000000-0000-0000-0000-000000000001', 'console', 'جهاز', 'Console', 500000, 5, 'active', 'sale', null),
  ('60000000-0000-0000-0000-000000000002', 'new-game', 'لعبة', 'New game', 70000, 3, 'active', 'rental', 2),
  ('60000000-0000-0000-0000-000000000003', 'old-game', 'لعبة قديمة', 'Old game', 30000, 3, 'active', 'rental', null);

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-basic-test', 'Plus Basic', 15000, 'month', 'plus', 2, 1);

insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000000b1', 'plus-basic-test', 'active', 'wayl', now(), now() + interval '30 days');

-- U bought the console.
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address)
values ('61000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'paid', 500000, 0, 500000, '{}');
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity)
values ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001', 'جهاز', 'Console', 500000, 1);

-- ── Wishlists ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select lives_ok(
  $$ insert into public.wishlist_items (product_id) values ('60000000-0000-0000-0000-000000000001') $$,
  'customers save products'
);
select throws_ok(
  $$ insert into public.wishlist_items (product_id, user_id)
     values ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2') $$,
  '42501', null, 'nobody fills someone else''s wishlist'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.wishlist_items), 0, 'wishlists are private');

-- ── Reviews ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select lives_ok(
  $$ insert into public.product_reviews (product_id, rating, comment)
     values ('60000000-0000-0000-0000-000000000001', 5, 'Great') $$,
  'customers review products'
);
select is(
  (select verified_purchase from public.product_reviews where user_id = '00000000-0000-0000-0000-0000000000b1'),
  true, 'buyers are marked as verified purchases'
);
select throws_ok(
  $$ insert into public.product_reviews (product_id, rating) values ('60000000-0000-0000-0000-000000000001', 4) $$,
  '23505', null, 'one review per product'
);
select throws_ok(
  $$ update public.product_reviews set status = 'hidden' $$,
  '42501', null, 'authors cannot hide reviews'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select lives_ok(
  $$ insert into public.product_reviews (product_id, rating) values ('60000000-0000-0000-0000-000000000001', 2) $$,
  'anyone signed in may review'
);
select is(
  (select verified_purchase from public.product_reviews where user_id = '00000000-0000-0000-0000-0000000000b2'),
  false, 'non-buyers are not verified'
);
select throws_ok(
  $$ insert into public.product_reviews (product_id, rating) values ('60000000-0000-0000-0000-000000000003', 9) $$,
  '23514', null, 'ratings are 1 to 5'
);

select pg_temp.login_anon();
select is(
  (select average from public.product_ratings where product_id = '60000000-0000-0000-0000-000000000001'),
  3.5::numeric, 'ratings are averaged publicly'
);
select is(
  (select author_name from public.product_review_list('60000000-0000-0000-0000-000000000001') where rating = 5),
  'Customer', 'review authors show by first name only'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b3', 'aal2');
select lives_ok(
  $$ update public.product_reviews set status = 'hidden' where rating = 2 $$,
  'support hides reviews'
);
select pg_temp.login_anon();
select is(
  (select count from public.product_ratings where product_id = '60000000-0000-0000-0000-000000000001'),
  1, 'hidden reviews leave the public ratings'
);

-- ── Rental tiers ────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is((select tier from public.my_rental_allowance()), 1, 'members see their plan tier');
select throws_ok(
  $$ select public.request_rental('60000000-0000-0000-0000-000000000002') $$,
  '23514', 'This item needs a higher plan', 'tiered items need a higher plan'
);
select lives_ok(
  $$ select public.request_rental('60000000-0000-0000-0000-000000000003') $$,
  'untiered items rent as before'
);

-- ── Support tickets ─────────────────────────────────────────────────────────

select lives_ok(
  $$ select public.create_support_ticket('Where is my order?', 'It has not arrived.', 'order',
       '61000000-0000-0000-0000-000000000001') $$,
  'customers open tickets'
);
select throws_ok(
  $$ select public.create_support_ticket('Hi', 'Body', 'order', gen_random_uuid()) $$,
  'P0002', 'Order not found', 'tickets only reference the customer''s own orders'
);
select is((select count(*)::int from public.support_messages), 1, 'the first message is stored');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::int from public.support_tickets), 0, 'tickets are private');
select throws_ok(
  $$ insert into public.support_messages (ticket_id, body)
     values ((select id from public.support_tickets limit 1), 'Hijack') $$,
  '42501', null, 'others cannot post on a ticket'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b3', 'aal2');
select lives_ok(
  $$ insert into public.support_messages (ticket_id, body, internal)
     values ((select id from public.support_tickets limit 1), 'Check the courier', true) $$,
  'support adds internal notes'
);
select lives_ok(
  $$ insert into public.support_messages (ticket_id, body)
     values ((select id from public.support_tickets limit 1), 'It ships today') $$,
  'support replies'
);
select is((select status::text from public.support_tickets), 'pending', 'a staff reply waits on the customer');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.support_messages), 2, 'customers never see internal notes');
select is(
  (select count(*)::int from public.notifications where event = 'support_reply'),
  1, 'a staff reply notifies the customer (internal notes do not)'
);
select lives_ok(
  $$ select public.close_support_ticket((select id from public.support_tickets limit 1)) $$,
  'customers close their tickets'
);
select throws_ok(
  $$ insert into public.support_messages (ticket_id, body)
     values ((select id from public.support_tickets limit 1), 'One more thing') $$,
  '23514', 'This ticket is closed', 'closed tickets take no replies'
);

-- ── Notifications ───────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b3', 'aal2');
update public.orders set status = 'shipped', tracking_number = 'TRK9';

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is(
  (select data ->> 'tracking' from public.notifications where event = 'order_shipped'),
  'TRK9', 'shipping an order notifies the customer'
);
select throws_ok(
  $$ insert into public.notifications (user_id, kind, event)
     values ('00000000-0000-0000-0000-0000000000b1', 'promo', 'fake') $$,
  '42501', null, 'customers cannot create notifications'
);
select is(public.mark_notifications_read(), 2, 'customers mark notifications read');

-- ── Finance extras ──────────────────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.chart_of_accounts (id, code, name, type) values
  ('62000000-0000-0000-0000-000000000001', '1000', 'Cash', 'asset'),
  ('62000000-0000-0000-0000-000000000002', '4000', 'Sales', 'revenue');
insert into public.fixed_assets (name, purchase_date, cost, salvage_value, useful_life_months)
values ('Laptop', current_date - interval '12 months', 1200000, 0, 24);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b4', 'aal2');
select lives_ok(
  $$ select public.post_journal_entry(current_date, 'Forecast sale',
       '[{"account_id":"62000000-0000-0000-0000-000000000001","debit":500,"dimensions":{"line":"plus"}},
         {"account_id":"62000000-0000-0000-0000-000000000002","credit":500}]',
       null, 'forecast') $$,
  'finance posts forecast entries'
);
select is(
  (select coalesce(sum(revenue), 0)::int from public.ledger_monthly_summary(current_date - 31, current_date, 'actual')),
  0, 'forecasts stay out of the actual figures'
);
select is(
  (select sum(revenue)::int from public.ledger_monthly_summary(current_date - 31, current_date, 'forecast')),
  500, 'forecasts have their own summary'
);
select is(
  (select book_value from public.fixed_asset_schedule()),
  600000::bigint, 'straight-line depreciation halves a 2-year asset after a year'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select is((select count(*)::int from public.fixed_assets), 0, 'customers cannot see fixed assets');

select * from finish();
rollback;
