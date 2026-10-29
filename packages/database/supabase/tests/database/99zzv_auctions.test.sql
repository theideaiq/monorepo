-- Auctions: which copies, photos and start prices, proxy bidding with a
-- hidden reserve and anti-sniping, who may bid, settling, unpaid wins and
-- strikes, second chances, and reviewed marks.
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
select plan(49);

-- O owns the shop, W works there, A and B bid, K is 16, E an editor.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a5c1', 'o9zzv@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c2', 'w9zzv@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c3', 'a9zzv@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c4', 'b9zzv@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c5', 'k9zzv@example.iq'),
  ('00000000-0000-0000-0000-00000000a5c6', 'e9zzv@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.profiles set birthday = (current_date - interval '16 years')::date
where id = '00000000-0000-0000-0000-00000000a5c5';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000a5c6', 'editor');
insert into public.organizations (id, name, slug, created_by) values
  ('9a5c0000-0000-0000-0000-0000000000c1', 'Card Shop', 'cards-9zzv', '00000000-0000-0000-0000-00000000a5c1');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a5c0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a5c1', 'owner'),
  ('9a5c0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a5c2', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9a5c0000-0000-0000-0000-0000000000d1', '9a5c0000-0000-0000-0000-0000000000c1', 'Card Shop', 'approved');

-- Trading cards are open for auctions; its subcategory inherits that.
insert into public.product_categories (id, slug, name_ar, name_en, auctions, parent_id) values
  ('9a5c0000-0000-0000-0000-0000000000e1', 'cards-9zzv', 'بطاقات', 'Cards', true, null),
  ('9a5c0000-0000-0000-0000-0000000000e2', 'pokemon-9zzv', 'بوكيمون', 'Pokémon', false, '9a5c0000-0000-0000-0000-0000000000e1'),
  ('9a5c0000-0000-0000-0000-0000000000e3', 'pens-9zzv', 'أقلام', 'Pens', false, null);
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id, collectible) values
  ('9a5c0000-0000-0000-0000-000000000001', 'charizard-9zzv', 'شاريزارد', 'Charizard', 30000, 'active', 'sale', 'used', '9a5c0000-0000-0000-0000-0000000000e2', false),
  ('9a5c0000-0000-0000-0000-000000000002', 'pen-9zzv', 'قلم', 'Pen', 30000, 'active', 'sale', 'used', '9a5c0000-0000-0000-0000-0000000000e3', false),
  ('9a5c0000-0000-0000-0000-000000000003', 'vinyl-9zzv', 'أسطوانة', 'First pressing', 90000, 'active', 'sale', 'new', '9a5c0000-0000-0000-0000-0000000000e3', true),
  ('9a5c0000-0000-0000-0000-000000000004', 'console-9zzv', 'جهاز', 'Rented console', 90000, 'active', 'rental', 'used', '9a5c0000-0000-0000-0000-0000000000e1', false);
create temporary table ids (name text primary key, id uuid);
grant all on ids to anon, authenticated;
insert into ids select 'card', id from public.product_variants where product_id = '9a5c0000-0000-0000-0000-000000000001';
insert into ids select 'pen', id from public.product_variants where product_id = '9a5c0000-0000-0000-0000-000000000002';
insert into ids select 'vinyl', id from public.product_variants where product_id = '9a5c0000-0000-0000-0000-000000000003';
insert into ids select 'console', id from public.product_variants where product_id = '9a5c0000-0000-0000-0000-000000000004';
-- The shop has two used cards and a new one for sale; The IDEA a first pressing.
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9a5c0000-0000-0000-0000-000000000001', c::public.product_condition, 'sale', 30000, '9a5c0000-0000-0000-0000-0000000000d1'
from unnest(array['used', 'used', 'new']) c;
insert into public.stock_items (product_id, condition, purpose, price) values
  ('9a5c0000-0000-0000-0000-000000000003', 'new', 'sale', 90000);
insert into ids select 'house copy', id from public.stock_items where product_id = '9a5c0000-0000-0000-0000-000000000003';
-- The shop's photos, and one in another folder.
insert into storage.objects (bucket_id, name)
select 'auction-photos', '9a5c0000-0000-0000-0000-0000000000d1/' || n || '.jpg' from generate_series(1, 4) n;
insert into storage.objects (bucket_id, name)
select 'auction-photos', '00000000-0000-4000-8000-000000000001/' || n || '.jpg' from generate_series(1, 3) n;

create temporary table made (name text primary key, id uuid);
grant all on made to anon, authenticated;

-- ── Photos ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('auction-photos', '9a5c0000-0000-0000-0000-0000000000d1/extra.jpg') $$,
  'a shop''s owner uploads photos to its folder'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('auction-photos', '9a5c0000-0000-0000-0000-0000000000d1/fake.jpg') $$,
  '42501', null, 'others can''t'
);

-- ── Listing ──
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Light wear on the corners') $$,
  '42501', 'Not allowed', 'only the shop''s owners and admins list auctions'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'new', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Sealed, as new') $$,
  '23514', 'New copies need to be collectible, or marked signed, limited or rare',
  'a new copy in an auction category stays at its price'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'pen'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Light wear on the cap') $$,
  '23514', 'This category isn''t open for auctions', 'other categories need a flag or a mark'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'console'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Works, scratches on top') $$,
  '23514', 'Rentals can''t be auctioned', 'never rentals'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 20000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Light wear on the corners') $$,
  '23514', 'Auctions start at 25000 IQD or more', 'the start price is at least the minimum'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 6,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Light wear on the corners') $$,
  '23514', 'Auctions run 3, 5, 7 or 10 days', 'it runs 3, 5, 7 or 10 days'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg'],
     'Light wear on the corners') $$,
  '23514', 'Add 3 to 12 photos of this copy', 'at least 3 photos'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '00000000-0000-4000-8000-000000000001/1.jpg'],
     'Light wear on the corners') $$,
  '23514', 'Add 3 to 12 photos of this copy', 'the seller''s own photos'
);
select throws_ok(
  $$ select public.start_auction('9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 7,
     array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
     'Light wear on the corners', 30000) $$,
  '23514', 'A reserve is above the start price', 'a reserve is above the start price'
);

insert into made select 'one', (public.start_auction(
  '9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 7,
  array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/3.jpg'],
  'Light wear on the corners', 45000
)).id;
select pg_temp.reset_role();
select results_eq(
  $$ select a.status::text, a.ends_at, a.has_reserve, a.reserve_met, s.status::text
     from public.auctions a join public.stock_items s on s.id = a.stock_item_id
     where a.id = (select id from made where name = 'one') $$,
  $$ values ('live', now() + interval '7 days', true, false, 'reserved') $$,
  'a used card in a subcategory of Cards goes up for 7 days, its copy held'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
select is(
  (select count(*)::integer from public.auction_reserves where auction_id = (select id from made where name = 'one')),
  1, 'the shop sees its reserve'
);

select pg_temp.login_anon();
select is(
  (select count(*)::integer from public.auctions where id = (select id from made where name = 'one')),
  1, 'visitors see the auction'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select is(
  (select count(*)::integer from public.auction_reserves), 0, 'bidders never see a reserve'
);

-- ── Who bids ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c2');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 40000) $$,
  '23514', 'You can''t bid on your own auction', 'people at the shop can''t bid'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c5');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 40000) $$,
  '23514', 'You need to be 18 or over to bid', 'bidders are adults'
);
select pg_temp.reset_role();
update public.store_settings set require_verified_phone = true;
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 40000) $$,
  '23514', 'Verify your phone number to bid', 'with phone checks on, bidders verify their number'
);
select pg_temp.reset_role();
insert into public.verified_phones (user_id, phone) values
  ('00000000-0000-0000-0000-00000000a5c3', '+9647700005301'),
  ('00000000-0000-0000-0000-00000000a5c4', '+9647700005302');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 29000) $$,
  '23514', 'Bid at least 30000 IQD', 'the first bid is at least the start price'
);

-- ── Proxy bidding ──
select is(
  public.place_bid((select id from made where name = 'one'), 40000) - 'ends_at',
  '{"winning": true, "current_price": 30000, "max_amount": 40000, "reserve_met": false}'::jsonb,
  'A leads at the start price; the reserve isn''t met'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c4');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 30500) $$,
  '23514', 'Bid at least 31000 IQD', 'the next bid is one increment up'
);
select is(
  public.place_bid((select id from made where name = 'one'), 35000) ->> 'winning',
  'false', 'B''s lower maximum doesn''t lead'
);
select is(
  (select current_price from public.auctions where id = (select id from made where name = 'one')),
  36000::bigint, 'A''s proxy answers one increment above B'
);
select is(
  (select count(*)::integer from public.bids where auction_id = (select id from made where name = 'one')),
  1, 'B sees only their own bid'
);
select pg_temp.login_anon();
select results_eq(
  $$ select alias, amount from public.bid_events
     where auction_id = (select id from made where name = 'one') order by id $$,
  $$ values (1::smallint, 30000::bigint), (2::smallint, 35000::bigint), (1::smallint, 36000::bigint) $$,
  'the history shows each price by alias'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c4');
select is(
  public.place_bid((select id from made where name = 'one'), 50000) - 'ends_at',
  '{"winning": true, "current_price": 45000, "max_amount": 50000, "reserve_met": true}'::jsonb,
  'B outbids A, and the price jumps to the reserve B''s maximum reaches'
);
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000a5c3' and event = 'auction_outbid'),
  1, 'A hears they were outbid'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c4');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 50000) $$,
  '23514', 'Raise your maximum above 50000 IQD', 'the leader can only raise their maximum'
);
select is(
  public.place_bid((select id from made where name = 'one'), 60000) ->> 'current_price',
  '45000', 'raising it leaves the price where it is'
);

-- ── Identity and the last minutes ──
select pg_temp.reset_role();
update public.store_settings set auction_identity_above = 100000;
update public.auctions set ends_at = now() + interval '1 minute' where id = (select id from made where name = 'one');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'one'), 150000) $$,
  '23514', 'Verify your identity to bid more than 100000 IQD', 'a maximum above the set amount needs an identity check'
);
select is(
  public.place_bid((select id from made where name = 'one'), 70000) ->> 'current_price',
  '62500', 'A takes the lead one increment above B''s maximum'
);
select is(
  (select ends_at from public.auctions where id = (select id from made where name = 'one')),
  now() + interval '3 minutes', 'a bid in the last 2 minutes adds 2 minutes'
);

-- ── Settling ──
select pg_temp.reset_role();
update public.auctions set starts_at = now() - interval '8 days', ends_at = now() - interval '1 second'
where id = (select id from made where name = 'one');
select pg_temp.login_anon();
select is(public.settle_auctions(), 1, 'anyone can settle what''s due');
select pg_temp.reset_role();
select results_eq(
  $$ select status::text, final_price, pay_by from public.auctions where id = (select id from made where name = 'one') $$,
  $$ values ('won', 62500::bigint, now() + interval '48 hours') $$,
  'A wins at the price showing, with 48 hours to pay'
);
select results_eq(
  $$ select bidder_id, outcome from public.bids where auction_id = (select id from made where name = 'one') order by alias $$,
  $$ values ('00000000-0000-0000-0000-00000000a5c3'::uuid, 'won'), ('00000000-0000-0000-0000-00000000a5c4'::uuid, 'lost') $$,
  'each bidder learns how it ended'
);
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000a5c3' and event = 'auction_won'),
  1, 'the winner hears'
);

-- A doesn't pay.
update public.auctions set pay_by = now() - interval '1 second' where id = (select id from made where name = 'one');
select public.settle_auctions();
select results_eq(
  $$ select a.status::text, (select count(*)::integer from public.bidding_strikes s where s.user_id = '00000000-0000-0000-0000-00000000a5c3')
     from public.auctions a where a.id = (select id from made where name = 'one') $$,
  $$ values ('unpaid', 1) $$,
  'an unpaid win is a strike'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
select results_eq(
  $$ select status::text, final_price, second_chance
     from public.offer_second_chance((select id from made where name = 'one')) $$,
  $$ values ('won', 60000::bigint, true) $$,
  'the shop offers B a second chance at B''s last bid'
);
select throws_ok(
  $$ select public.offer_second_chance((select id from made where name = 'one')) $$,
  '23514', 'A second chance is offered once, after an unpaid win', 'once'
);

-- B lets it pass: no strike, and the copy goes back on sale.
select pg_temp.reset_role();
update public.auctions set pay_by = now() - interval '1 second' where id = (select id from made where name = 'one');
select public.settle_auctions();
select results_eq(
  $$ select a.status::text, s.status::text,
       (select count(*)::integer from public.bidding_strikes x where x.user_id = '00000000-0000-0000-0000-00000000a5c4')
     from public.auctions a join public.stock_items s on s.id = a.stock_item_id
     where a.id = (select id from made where name = 'one') $$,
  $$ values ('unsold', 'available', 0) $$,
  'a lapsed second chance closes without a strike'
);

-- ── Cancelling, marks, The IDEA ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c1');
insert into made select 'signed', (public.start_auction(
  '9a5c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'new', 50000, 3,
  array['9a5c0000-0000-0000-0000-0000000000d1/1.jpg', '9a5c0000-0000-0000-0000-0000000000d1/2.jpg', '9a5c0000-0000-0000-0000-0000000000d1/4.jpg'],
  'Signed by the illustrator, sealed', null, 'signed'
)).id;
select is(
  (select status::text from public.auctions where id = (select id from made where name = 'signed')),
  'live', 'a new copy marked signed can be auctioned'
);
select is(
  (public.cancel_auction((select id from made where name = 'signed'))).status::text,
  'cancelled', 'an auction without bids can be cancelled'
);
select pg_temp.reset_role();
select is(
  (select s.status::text from public.auctions a join public.stock_items s on s.id = a.stock_item_id
   where a.id = (select id from made where name = 'signed')),
  'available', 'and its copy goes back on sale'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c6', 'aal2');
select is(
  (public.review_auction_mark((select id from made where name = 'signed'), false)).mark_review,
  'wrong', 'Staff find a mark wrong'
);
select pg_temp.reset_role();
select is(
  private.seller_score('9a5c0000-0000-0000-0000-0000000000d1'), 0::numeric,
  'a wrong mark counts against the shop''s score'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c6', 'aal2');
insert into made select 'house', (public.start_auction(
  '00000000-0000-4000-8000-000000000001', (select id from ids where name = 'vinyl'), 'new', 90000, 10,
  array['00000000-0000-4000-8000-000000000001/1.jpg', '00000000-0000-4000-8000-000000000001/2.jpg', '00000000-0000-4000-8000-000000000001/3.jpg'],
  'First pressing, sleeve as new', null, null, (select id from ids where name = 'house copy')
)).id;
select is(
  (select stock_item_id from public.auctions where id = (select id from made where name = 'house')),
  (select id from ids where name = 'house copy'), 'Staff auction The IDEA''s collectible copy'
);

-- ── Strikes ──
select pg_temp.reset_role();
insert into public.bidding_strikes (user_id, auction_id, created_at) values
  ('00000000-0000-0000-0000-00000000a5c3', (select id from made where name = 'signed'), now() - interval '10 days');
-- A's own strike from the first auction is now; two within 12 months.
update public.bidding_strikes set created_at = now()
where user_id = '00000000-0000-0000-0000-00000000a5c3' and auction_id = (select id from made where name = 'one');
select is(
  private.bidding_blocked_until('00000000-0000-0000-0000-00000000a5c3'), now() + interval '90 days',
  '2 strikes in 12 months block bidding for 90 days'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a5c3');
select throws_ok(
  $$ select public.place_bid((select id from made where name = 'house'), 90000) $$,
  '23514', 'Bidding is blocked after unpaid wins', 'a blocked member can''t bid'
);
select pg_temp.reset_role();
insert into public.bidding_strikes (user_id, auction_id, created_at) values
  ('00000000-0000-0000-0000-00000000a5c3', (select id from made where name = 'house'), now() - interval '20 days');
select is(
  private.bidding_blocked_until('00000000-0000-0000-0000-00000000a5c3'), 'infinity'::timestamptz,
  '3 strikes block it for good'
);

select * from finish();
rollback;
