-- People selling: who can list (adults with a verified identity), what
-- visitors see (first name only, no 18-rated products for minors), offers
-- and buying at the price, messages, agreeing, calling off, sold, support
-- take-downs and expiry.
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
select plan(39);

-- S sells (identity verified), U isn't verified, K is 16, B and C buy, H is support.
delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000a8d1', 's9zzz@example.iq', '{"full_name":"Sara Kareem"}'),
  ('00000000-0000-0000-0000-00000000a8d2', 'u9zzz@example.iq', '{"full_name":"Usama"}'),
  ('00000000-0000-0000-0000-00000000a8d3', 'k9zzz@example.iq', '{"full_name":"Kid"}'),
  ('00000000-0000-0000-0000-00000000a8d4', 'b9zzz@example.iq', '{"full_name":"Basim Ali"}'),
  ('00000000-0000-0000-0000-00000000a8d5', 'c9zzz@example.iq', '{"full_name":"Chiman"}'),
  ('00000000-0000-0000-0000-00000000a8d6', 'h9zzz@example.iq', '{"full_name":"Hala"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set birthday = (current_date - interval '16 years')::date
where id = '00000000-0000-0000-0000-00000000a8d3';
update public.profiles set full_name = 'Sara Kareem' where id = '00000000-0000-0000-0000-00000000a8d1';
update public.profiles set full_name = 'Basim Ali' where id = '00000000-0000-0000-0000-00000000a8d4';
insert into public.identity_verifications (user_id, legal_name) values
  ('00000000-0000-0000-0000-00000000a8d1', 'Sara Kareem'),
  ('00000000-0000-0000-0000-00000000a8d3', 'Kid');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000a8d6', 'support');
update public.delivery_zones set active = true where governorate = 'baghdad';
update public.store_settings set require_verified_phone = true;
insert into storage.objects (bucket_id, name)
select 'member-listing-photos', u || '/' || n || '.jpg'
from unnest(array['00000000-0000-0000-0000-00000000a8d1', '00000000-0000-0000-0000-00000000a8d2', '00000000-0000-0000-0000-00000000a8d3']) u,
  generate_series(1, 9) n;
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, age_rating) values
  ('9a8d0000-0000-0000-0000-000000000001', 'mature-9zzz', 'للكبار', 'Mature game', 59750, 5, 'active', 'sale', 18);

create temporary table made (name text primary key, id uuid);
grant all on made to anon, authenticated;

-- ── Listing ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d3');
select throws_ok(
  $$ select public.create_member_listing('Old console', 'used', 'Works, a few scratches on top',
     array['00000000-0000-0000-0000-00000000a8d3/1.jpg', '00000000-0000-0000-0000-00000000a8d3/2.jpg', '00000000-0000-0000-0000-00000000a8d3/3.jpg'],
     'baghdad', 50000) $$,
  '23514', 'You need to be 18 or over to sell', 'sellers are adults'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d2');
select throws_ok(
  $$ select public.create_member_listing('Old console', 'used', 'Works, a few scratches on top',
     array['00000000-0000-0000-0000-00000000a8d2/1.jpg', '00000000-0000-0000-0000-00000000a8d2/2.jpg', '00000000-0000-0000-0000-00000000a8d2/3.jpg'],
     'baghdad', 50000) $$,
  '23514', 'Verify your identity first', 'sellers have a verified identity'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select throws_ok(
  $$ select public.create_member_listing('Turntable', 'used', 'Belt replaced last year, plays well',
     array['00000000-0000-0000-0000-00000000a8d1/1.jpg', '00000000-0000-0000-0000-00000000a8d2/1.jpg', '00000000-0000-0000-0000-00000000a8d1/3.jpg'],
     'baghdad', 50000) $$,
  '23514', 'Add 3 to 8 photos of the item', 'only the seller''s own photos'
);
select throws_ok(
  $$ select public.create_member_listing('Turntable', 'used', 'Belt replaced last year, plays well',
     array['00000000-0000-0000-0000-00000000a8d1/1.jpg', '00000000-0000-0000-0000-00000000a8d1/2.jpg', '00000000-0000-0000-0000-00000000a8d1/3.jpg'],
     'baghdad', 500) $$,
  '23514', 'The price is at least 1,000 IQD', 'a price of at least 1,000 IQD'
);
insert into made select 'one', (public.create_member_listing(
  'Turntable', 'used', 'Belt replaced last year, plays well',
  array['00000000-0000-0000-0000-00000000a8d1/1.jpg', '00000000-0000-0000-0000-00000000a8d1/2.jpg', '00000000-0000-0000-0000-00000000a8d1/3.jpg'],
  'Baghdad', 50000, true
)).id;
insert into made select 'two', (public.create_member_listing(
  'Board game', 'open_box', 'Played once, every piece is there',
  array['00000000-0000-0000-0000-00000000a8d1/4.jpg', '00000000-0000-0000-0000-00000000a8d1/5.jpg', '00000000-0000-0000-0000-00000000a8d1/6.jpg'],
  'baghdad', 20000
)).id;
select results_eq(
  $$ select status::text, governorate, accepts_offers, expires_at from public.member_listings
     where id = (select id from made where name = 'one') $$,
  $$ values ('active', 'baghdad', true, now() + interval '30 days') $$,
  'a listing runs 30 days'
);

-- ── Browsing ──
select pg_temp.reset_role();
insert into public.member_listings (user_id, product_id, title, condition, description, photos, governorate, price)
values ('00000000-0000-0000-0000-00000000a8d1', '9a8d0000-0000-0000-0000-000000000001', 'Mature game', 'used',
  'Disc and case, no scratches', array['00000000-0000-0000-0000-00000000a8d1/7.jpg', '00000000-0000-0000-0000-00000000a8d1/8.jpg', '00000000-0000-0000-0000-00000000a8d1/9.jpg'],
  'baghdad', 15000);
select pg_temp.login_anon();
select results_eq(
  $$ select count(*)::integer, min(first_name), bool_or(mine) from public.member_listings_for_sale() $$,
  $$ values (3, 'Sara', false) $$,
  'visitors see live listings with the seller''s first name only'
);
select is(
  (select count(*)::integer from public.member_listings_for_sale(search => 'turn')),
  1, 'and can search them'
);
select ok(
  private.can_see_listing_photo('00000000-0000-0000-0000-00000000a8d1/1.jpg'),
  'and see their photos'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d3');
select is(
  (select count(*)::integer from public.member_listings_for_sale()),
  2, 'minors don''t see 18-rated products'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d4');
select is(
  (select count(*)::integer from public.member_listings), 0, 'buyers never read listings directly'
);

-- ── Buying ──
select throws_ok(
  $$ select public.buy_member_listing((select id from made where name = 'one'), 40000) $$,
  '23514', 'Verify your phone number first', 'buyers verify their phone'
);
select pg_temp.reset_role();
insert into public.verified_phones (user_id, phone) values
  ('00000000-0000-0000-0000-00000000a8d1', '+9647700008301'),
  ('00000000-0000-0000-0000-00000000a8d4', '+9647700008302'),
  ('00000000-0000-0000-0000-00000000a8d5', '+9647700008303');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select throws_ok(
  $$ select public.buy_member_listing((select id from made where name = 'one')) $$,
  '23514', 'You can''t buy your own item', 'sellers don''t buy their own items'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d4');
select throws_ok(
  $$ select public.buy_member_listing((select id from made where name = 'two'), 15000) $$,
  '23514', 'This item is sold at its price', 'offers only where the seller allows them'
);
insert into made select 'offer b', (public.buy_member_listing(
  (select id from made where name = 'one'), 40000, 'Can collect in Mansour'
)).id;
select results_eq(
  $$ select kind, status::text, expires_at from public.member_deals where id = (select id from made where name = 'offer b') $$,
  $$ values ('offer', 'sent', now() + interval '72 hours') $$,
  'an offer stands for 72 hours'
);
select throws_ok(
  $$ select public.buy_member_listing((select id from made where name = 'one'), 42000) $$,
  '23505', 'You already have an offer on this', 'one live offer per buyer'
);
select results_eq(
  $$ select other_first_name, selling from public.my_member_deals() $$,
  $$ values ('Sara', false) $$,
  'the buyer sees the seller''s first name'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d5');
insert into made select 'offer c', (public.buy_member_listing((select id from made where name = 'one'), 45000)).id;

select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select results_eq(
  $$ select count(*)::integer, bool_and(selling) from public.my_member_deals() $$,
  $$ values (2, true) $$,
  'the seller sees every offer'
);
select is(
  (select count(*)::integer from public.notifications where event = 'member_offer_received'),
  2, 'and hears about each'
);

-- ── Messages ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d4');
select lives_ok(
  $$ select public.send_member_message((select id from made where name = 'offer b'), 'Is the belt new?') $$,
  'the buyer writes to the seller'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select results_eq(
  $$ select from_seller, body from public.member_messages $$,
  $$ values (false, 'Is the belt new?') $$,
  'the seller reads it'
);
select throws_ok(
  $$ select author_id from public.member_messages $$,
  '42501', null, 'without who wrote it'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d5');
select is(
  (select count(*)::integer from public.member_messages), 0, 'other buyers don''t see it'
);

-- ── Agreeing ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select lives_ok(
  $$ select public.answer_member_deal((select id from made where name = 'offer b'), true) $$,
  'the seller accepts an offer'
);
select results_eq(
  $$ select (select status::text from public.member_listings where id = (select id from made where name = 'one')),
       (select status::text from public.member_deals where id = (select id from made where name = 'offer c')) $$,
  $$ values ('reserved', 'declined') $$,
  'which reserves the listing and declines the others'
);
select pg_temp.login_anon();
select is(
  (select count(*)::integer from public.member_listings_for_sale()), 2, 'a reserved listing isn''t for sale'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d4');
select is(
  (select status::text from public.member_listing((select listing_number from public.my_member_deals() limit 1))),
  'reserved', 'but its buyer still sees it'
);
select throws_ok(
  $$ select public.finish_member_deal((select id from made where name = 'offer b'), true) $$,
  '23514', 'The seller marks the item sold', 'only the seller marks it sold'
);
select lives_ok(
  $$ select public.finish_member_deal((select id from made where name = 'offer b'), false) $$,
  'the buyer calls it off'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select results_eq(
  $$ select (select status::text from public.member_listings where id = (select id from made where name = 'one')),
       (select count(*)::integer from public.notifications where event = 'member_deal_cancelled') $$,
  $$ values ('active', 1) $$,
  'and the listing is live again, and the seller is told'
);

-- ── Buying at the price ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d5');
insert into made select 'buy c', (public.buy_member_listing((select id from made where name = 'one'))).id;
select results_eq(
  $$ select kind, status::text, amount from public.member_deals where id = (select id from made where name = 'buy c') $$,
  $$ values ('buy', 'accepted', 50000::bigint) $$,
  'buying at the price is agreed at once'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select lives_ok(
  $$ select public.finish_member_deal((select id from made where name = 'buy c'), true) $$,
  'the seller marks it sold'
);
select results_eq(
  $$ select status::text, sold_at is not null from public.member_listings where id = (select id from made where name = 'one') $$,
  $$ values ('sold', true) $$,
  'and the listing is sold'
);
select throws_ok(
  $$ select public.send_member_message((select id from made where name = 'buy c'), 'Thanks!') $$,
  '23514', 'This deal is closed', 'no messages once it''s done'
);
select throws_ok(
  $$ select public.update_member_listing((select id from made where name = 'one'), 60000, false, 'Belt replaced last year, plays well') $$,
  '23514', 'Only a live listing can be changed', 'a sold listing can''t be changed'
);

-- ── Support ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d4');
select throws_ok(
  $$ select public.take_down_member_listing((select id from made where name = 'two'), 'Counterfeit item') $$,
  '42501', 'Not allowed', 'only support take listings down'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d6', 'aal2');
select lives_ok(
  $$ select public.take_down_member_listing((select id from made where name = 'two'), 'Counterfeit item') $$,
  'support take down a listing that breaks the policy'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select results_eq(
  $$ select l.status::text, n.data ->> 'reason' from public.member_listings l
     join public.notifications n on n.event = 'member_listing_removed'
     where l.id = (select id from made where name = 'two') $$,
  $$ values ('removed', 'Counterfeit item') $$,
  'and the seller is told why'
);

-- ── Deadlines ──
select pg_temp.reset_role();
update public.member_listings set expires_at = now() - interval '1 minute' where title = 'Mature game';
select is(public.sweep_member_listings(), 1, 'the sweep expires listings past their 30 days');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a8d1');
select is(
  (select (public.renew_member_listing(id)).status::text from public.member_listings where title = 'Mature game'),
  'active', 'and the seller can renew them'
);

select * from finish();
rollback;
