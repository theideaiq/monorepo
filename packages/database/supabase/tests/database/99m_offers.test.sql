-- Selling: Make an offer (settings, offers, counters, auto answers, the cart price, deadlines).
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
  ('00000000-0000-0000-0000-000000000e01', 'o9m@example.iq'),
  ('00000000-0000-0000-0000-000000000e02', 'm9m@example.iq'),
  ('00000000-0000-0000-0000-000000000e03', 'b9m@example.iq'),
  ('00000000-0000-0000-0000-000000000e04', 'c9m@example.iq'),
  ('00000000-0000-0000-0000-000000000e05', 'e9m@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000e05', 'editor');
insert into public.organizations (id, name, slug, created_by) values
  ('9c100000-0000-0000-0000-0000000000c1', 'Record Shop', 'records-9m', '00000000-0000-0000-0000-000000000e01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9c100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000e01', 'owner'),
  ('9c100000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000e02', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9c100000-0000-0000-0000-0000000000d1', '9c100000-0000-0000-0000-0000000000c1', 'Record Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9c100000-0000-0000-0000-000000000001', 'blonde-9m', 'بلوند', 'Blonde', 39750, 'active', 'sale', 'new'),
  ('9c100000-0000-0000-0000-000000000002', 'house-9m', 'بيت', 'House record', 99750, 'active', 'sale', 'new'),
  ('9c100000-0000-0000-0000-000000000003', 'sale-9m', 'تخفيض', 'On sale', 29750, 'active', 'sale', 'new');
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;
insert into ids select 'v', id from public.product_variants where product_id = '9c100000-0000-0000-0000-000000000001';
insert into ids select 'house', id from public.product_variants where product_id = '9c100000-0000-0000-0000-000000000002';
insert into ids select 'sale', id from public.product_variants where product_id = '9c100000-0000-0000-0000-000000000003';
-- Two new copies and one of each other condition at the shop; a house
-- copy that cost 30,000; the sale item's copy.
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9c100000-0000-0000-0000-000000000001', c::public.product_condition, 'sale', 39750, '9c100000-0000-0000-0000-0000000000d1'
from unnest(array['new', 'new', 'used', 'open_box', 'refurbished']) c;
insert into public.stock_items (product_id, condition, purpose, price, cost) values
  ('9c100000-0000-0000-0000-000000000002', 'new', 'sale', 99750, 30000);
insert into public.stock_items (product_id, condition, purpose, price, seller_id) values
  ('9c100000-0000-0000-0000-000000000003', 'new', 'sale', 29750, '9c100000-0000-0000-0000-0000000000d1');
-- The sale item was 34,750 for the 20 days before today: its "was" price.
insert into public.price_history (variant_id, seller_id, condition, price, started_at, ended_at)
select id, '9c100000-0000-0000-0000-0000000000d1', 'new', 34750, now() - interval '20 days', now()
from ids where name = 'sale';
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── Settings ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e03');
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 30000) $$,
  '23514', null, 'a listing takes offers only when its seller says so'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e02');
select throws_ok(
  $$ select public.set_offer_settings('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', true) $$,
  '42501', null, 'a member can''t change offer settings'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select ok(
  (public.set_offer_settings('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', true, 38000, 26000)).accept_offers,
  'the owner turns offers on, with automatic amounts'
);
select public.set_offer_settings('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), c::public.product_condition, true)
from unnest(array['used', 'open_box', 'refurbished']) c;
select public.set_offer_settings('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'sale'), 'new', true);
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 30000) $$,
  '23514', null, 'not to your own shop'
);
select pg_temp.login_anon();
select results_eq(
  $$ select condition::text, min_offer from public.offerable_listings('9c100000-0000-0000-0000-000000000001') where condition = 'new' $$,
  $$ values ('new', 23850::bigint) $$,
  'anyone sees which listings take offers and the lowest offer (60%)'
);
select is_empty(
  $$ select 1 from public.offerable_listings('9c100000-0000-0000-0000-000000000003') $$,
  'items on sale take no offers'
);
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 30000) $$,
  '42501', null, 'signed-out visitors can''t make offers'
);

-- ── Offers ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e03');
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 20000) $$,
  '23514', null, 'offers start at 60% of the price'
);
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 39750) $$,
  '23514', null, 'an offer is below the price'
);
select is(
  (public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 25000)).status,
  'declined'::public.offer_status, 'below the seller''s decline amount, it''s declined at once'
);
with made as (
  select o.id from public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 30000) o
)
insert into ids select 'offer', id from made;
select is((select status::text from public.offers where id = (select id from ids where name = 'offer')), 'open',
  'an offer in between waits for the seller');
select throws_ok(
  $$ select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 31000) $$,
  '23505', null, 'one open offer per listing'
);
select throws_ok(
  $$ select public.answer_offer((select id from ids where name = 'offer'), 'accept') $$,
  '23514', null, 'the buyer can''t answer their own open offer'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e04');
select is_empty($$ select 1 from public.offers $$, 'other people see no offers');
select pg_temp.login_as('00000000-0000-0000-0000-000000000e02');
select is((select count(*)::integer from public.offers), 2, 'shop members see their offers');
select throws_ok(
  $$ select public.answer_offer((select id from ids where name = 'offer'), 'accept') $$,
  'P0002', null, 'members don''t answer offers; owners and admins do'
);

-- ── Counters ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select throws_ok(
  $$ select public.answer_offer((select id from ids where name = 'offer'), 'counter', 40000) $$,
  '23514', null, 'a counter is below the price'
);
select is(
  (public.answer_offer((select id from ids where name = 'offer'), 'counter', 36000)).status,
  'countered'::public.offer_status, 'the owner counters'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e03');
select is(
  (public.answer_offer((select id from ids where name = 'offer'), 'counter', 33000)).status,
  'open'::public.offer_status, 'the buyer counters back'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select throws_ok(
  $$ select public.answer_offer((select id from ids where name = 'offer'), 'counter', 35000) $$,
  '23514', null, 'each side counters once'
);
select is(
  (public.answer_offer((select id from ids where name = 'offer'), 'accept')).status,
  'accepted'::public.offer_status, 'the owner accepts'
);
select pg_temp.reset_role();
select is(
  (select quantity from public.cart_items where user_id = '00000000-0000-0000-0000-000000000e03'),
  1, 'one copy goes to the buyer''s cart'
);
select ok(
  exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000e03' and event = 'offer_accepted'),
  'the buyer hears the answer'
);
select is(
  (private.price_checkout('00000000-0000-0000-0000-000000000e03', 'baghdad', 'delivery', 'online', null, 0) -> 'lines' -> 0 ->> 'unit_price')::bigint,
  33000::bigint, 'checkout charges the agreed price'
);
update public.cart_items set quantity = 2 where user_id = '00000000-0000-0000-0000-000000000e03';
select throws_ok(
  $$ select private.price_checkout('00000000-0000-0000-0000-000000000e03', 'baghdad', 'delivery', 'online', null, 0) $$,
  '23514', null, 'the agreed price is for one copy'
);

-- ── Limits and automatic acceptance ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e04');
select is(
  (public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 38000)).status,
  'accepted'::public.offer_status, 'at the seller''s accept amount, it''s accepted at once'
);
select public.make_offer('9c100000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), c::public.product_condition, 30000)
from unnest(array['used', 'open_box', 'refurbished']) c;
select is(
  (select count(*)::integer from public.offers where buyer_id = '00000000-0000-0000-0000-000000000e04' and status = 'open'),
  3, 'three open offers with one seller'
);
select is(
  (public.withdraw_offer((select id from public.offers where buyer_id = '00000000-0000-0000-0000-000000000e04' and condition = 'used'))).status,
  'withdrawn'::public.offer_status, 'the buyer withdraws one'
);

-- ── The IDEA's own stock ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000e05', 'aal2');
select ok(
  (public.set_offer_settings('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new', true)).accept_offers,
  'staff turn offers on for The IDEA''s stock'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e04');
select is(
  (public.make_offer('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new', 60000)).status,
  'declined'::public.offer_status, 'below The IDEA''s margin floor, it''s declined'
);
select is(
  (public.make_offer('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new', 95000)).status,
  'open'::public.offer_status, 'above it, it waits for staff'
);

-- ── Deadlines and orders ──
select pg_temp.reset_role();
update public.offers set expires_at = now() - interval '1 minute'
where buyer_id = '00000000-0000-0000-0000-000000000e04' and status = 'open' and condition = 'open_box';
update public.offers set cart_until = now() - interval '1 minute'
where buyer_id = '00000000-0000-0000-0000-000000000e04' and status = 'accepted';
select is((select count(*)::integer from public.sweep_offers()), 2, 'the sweep expires unanswered and unordered offers');
select is(
  (select count(*)::integer from public.cart_items where user_id = '00000000-0000-0000-0000-000000000e04'),
  0, 'and takes the expired offer''s line out of the cart'
);
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
values ('9c100000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000e03', 'pending', 33000, 0, 33000, 0,
  '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9","city":"Karrada","governorate":"baghdad"}',
  'delivery', 'online');
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name, condition)
values ('9c100000-0000-0000-0000-0000000000e1', '9c100000-0000-0000-0000-000000000001', (select id from ids where name = 'v'),
  'بلوند', 'Blonde', 33000, 1, '9c100000-0000-0000-0000-0000000000d1', 'Record Shop', 'new');
select is(
  (select status::text from public.offers where id = (select id from ids where name = 'offer')),
  'purchased', 'ordering the copy closes the offer'
);

select * from finish();
rollback;
