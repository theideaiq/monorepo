-- Auctions, part 2: a won auction in the cart, paid online at its final
-- price, selling the copy held; a cancelled order puts it back; a payment
-- that comes late settles an unpaid win, or takes nothing once the copy
-- went to a second chance.
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
select plan(19);

-- O owns the shop; A and B bid.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a6c1', 'o9zzw@example.iq'),
  ('00000000-0000-0000-0000-00000000a6c3', 'a9zzw@example.iq'),
  ('00000000-0000-0000-0000-00000000a6c4', 'b9zzw@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.organizations (id, name, slug, created_by) values
  ('9a6c0000-0000-0000-0000-0000000000c1', 'Card Shop', 'cards-9zzw', '00000000-0000-0000-0000-00000000a6c1');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a6c0000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000a6c1', 'owner');
insert into public.sellers (id, organization_id, name, status, kind) values
  ('9a6c0000-0000-0000-0000-0000000000d1', '9a6c0000-0000-0000-0000-0000000000c1', 'Card Shop', 'approved', 'registered');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, collectible) values
  ('9a6c0000-0000-0000-0000-000000000001', 'charizard-9zzw', 'شاريزارد', 'Charizard', 30000, 'active', 'sale', 'used', true);
create temporary table ids (name text primary key, id uuid);
grant all on ids to anon, authenticated;
insert into ids select 'card', id from public.product_variants where product_id = '9a6c0000-0000-0000-0000-000000000001';
-- Four used cards at the shop: three to auction, one for sale.
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9a6c0000-0000-0000-0000-000000000001', 'used', 'sale', 30000, '9a6c0000-0000-0000-0000-0000000000d1'
from generate_series(1, 4);
insert into storage.objects (bucket_id, name)
select 'auction-photos', '9a6c0000-0000-0000-0000-0000000000d1/' || n || '.jpg' from generate_series(1, 3) n;
update public.delivery_zones set active = true where governorate = 'baghdad';
update public.store_settings set cash_on_delivery_enabled = true;

create temporary table made (name text primary key, id uuid);
grant all on made to anon, authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c1');
insert into made
select 'auction ' || n, (public.start_auction(
  '9a6c0000-0000-0000-0000-0000000000d1', (select id from ids where name = 'card'), 'used', 30000, 3,
  array['9a6c0000-0000-0000-0000-0000000000d1/1.jpg', '9a6c0000-0000-0000-0000-0000000000d1/2.jpg', '9a6c0000-0000-0000-0000-0000000000d1/3.jpg'],
  'Light wear on the corners'
)).id
from generate_series(1, 3) n;

-- A wins the first two alone; on the third A's 50,000 beats B's 40,000.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
select public.place_bid((select id from made where name = 'auction 1'), 40000);
select public.place_bid((select id from made where name = 'auction 2'), 40000);
select public.place_bid((select id from made where name = 'auction 3'), 50000);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c4');
select public.place_bid((select id from made where name = 'auction 3'), 40000);
select pg_temp.reset_role();
update public.auctions set starts_at = now() - interval '4 days', ends_at = now() - interval '1 second';
select public.settle_auctions();

-- ── In the cart ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
select is(
  (select count(*)::integer from public.cart_auctions), 3, 'each win goes to the winner''s cart'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c4');
select throws_ok(
  $$ insert into public.cart_auctions (auction_id) values ((select id from made where name = 'auction 3')) $$,
  '42501', null, 'nobody else can put it in their cart'
);

-- A pays for the first only.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
delete from public.cart_auctions where auction_id <> (select id from made where name = 'auction 1');
select pg_temp.reset_role();
select throws_ok(
  $$ select private.price_checkout('00000000-0000-0000-0000-00000000a6c3', 'baghdad', 'delivery', 'cash_on_delivery', null, 0) $$,
  '23514', 'Auctions are paid online', 'a win is paid online'
);
select results_eq(
  $$ select (q ->> 'goods')::bigint, jsonb_array_length(q -> 'auctions'), q -> 'auctions' -> 0 ->> 'unit_price', (q ->> 'ships')::boolean
     from private.price_checkout('00000000-0000-0000-0000-00000000a6c3', 'baghdad', 'delivery', 'online', null, 0) q $$,
  $$ values (30000::bigint, 1, '30000', true) $$,
  'it is priced at the final price and delivered'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');

insert into made select 'order 1', (public.create_order(
  '{"full_name":"A","phone":"+9647700006301","governorate":"baghdad","address":"Karrada"}'
)).id;
select pg_temp.reset_role();
select results_eq(
  $$ select auction_id, unit_price, quantity, commission > 0 from public.order_items
     where order_id = (select id from made where name = 'order 1') $$,
  $$ values ((select id from made where name = 'auction 1'), 30000::bigint, 1, true) $$,
  'the order has one line for the auction, with the shop''s commission'
);
select is(
  (select count(*)::integer from public.cart_auctions where user_id = '00000000-0000-0000-0000-00000000a6c3'
   and auction_id = (select id from made where name = 'auction 1')),
  0, 'and it leaves the cart'
);

-- While the payment is on its way, it can't be ordered again, and the
-- deadline doesn't settle it as unpaid.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
insert into public.cart_auctions (auction_id) values ((select id from made where name = 'auction 1'));
select pg_temp.reset_role();
select throws_ok(
  $$ select private.price_checkout('00000000-0000-0000-0000-00000000a6c3', 'baghdad', 'delivery', 'online', null, 0) $$,
  '23514', 'This auction is already in an order', 'one order per win'
);
delete from public.cart_auctions where user_id = '00000000-0000-0000-0000-00000000a6c3';
update public.auctions set pay_by = now() - interval '1 second' where id = (select id from made where name = 'auction 1');
select public.settle_auctions();
select is(
  (select status::text from public.auctions where id = (select id from made where name = 'auction 1')),
  'won', 'a win with a payment on its way isn''t settled as unpaid'
);

select public.complete_order_payment((select id from made where name = 'order 1'));
select results_eq(
  $$ select a.status::text, s.status::text, s.order_item_id = i.id
     from public.auctions a
     join public.stock_items s on s.id = a.stock_item_id
     join public.order_items i on i.order_id = (select id from made where name = 'order 1')
     where a.id = (select id from made where name = 'auction 1') $$,
  $$ values ('paid', 'sold', true) $$,
  'paying sells the copy held and marks the auction paid'
);
select is(
  (select count(*)::integer from public.stock_items
   where seller_id = '9a6c0000-0000-0000-0000-0000000000d1' and status = 'available'),
  1, 'the shop''s copy for sale is untouched'
);

-- ── A cancelled order ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
insert into public.cart_auctions (auction_id) values ((select id from made where name = 'auction 2'));
insert into made select 'order 2', (public.create_order(
  '{"full_name":"A","phone":"+9647700006301","governorate":"baghdad","address":"Karrada"}'
)).id;
select pg_temp.reset_role();
update public.orders set status = 'cancelled' where id = (select id from made where name = 'order 2');
select is(
  (select count(*)::integer from public.cart_auctions where auction_id = (select id from made where name = 'auction 2')),
  1, 'a cancelled order puts the win back in the cart'
);

-- It isn't paid in time: a strike, and out of the cart.
update public.auctions set pay_by = now() - interval '1 second' where id = (select id from made where name = 'auction 2');
select public.settle_auctions();
select results_eq(
  $$ select a.status::text,
       (select count(*)::integer from public.cart_auctions c where c.auction_id = a.id),
       (select count(*)::integer from public.bidding_strikes s where s.auction_id = a.id)
     from public.auctions a where a.id = (select id from made where name = 'auction 2') $$,
  $$ values ('unpaid', 0, 1) $$,
  'an unpaid win leaves the cart and gives a strike'
);

-- The cancelled order's payment comes in late: it settles the win.
select public.complete_order_payment((select id from made where name = 'order 2'));
select results_eq(
  $$ select a.status::text, s.status::text,
       (select count(*)::integer from public.bidding_strikes x where x.auction_id = a.id)
     from public.auctions a join public.stock_items s on s.id = a.stock_item_id
     where a.id = (select id from made where name = 'auction 2') $$,
  $$ values ('paid', 'sold', 0) $$,
  'a late payment sells the copy and lifts the strike'
);

-- ── A second chance, and a payment that comes after it ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c3');
insert into public.cart_auctions (auction_id) values ((select id from made where name = 'auction 3'));
insert into made select 'order 3', (public.create_order(
  '{"full_name":"A","phone":"+9647700006301","governorate":"baghdad","address":"Karrada"}'
)).id;
select pg_temp.reset_role();
update public.orders set status = 'cancelled' where id = (select id from made where name = 'order 3');
update public.auctions set pay_by = now() - interval '1 second' where id = (select id from made where name = 'auction 3');
select public.settle_auctions();
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c1');
select public.offer_second_chance((select id from made where name = 'auction 3'));
select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c4');
select results_eq(
  $$ select auction_id from public.cart_auctions $$,
  $$ values ((select id from made where name = 'auction 3')) $$,
  'the second chance goes to B''s cart'
);
select pg_temp.reset_role();
select is(
  (private.price_checkout('00000000-0000-0000-0000-00000000a6c4', 'baghdad', 'delivery', 'online', null, 0) -> 'auctions' -> 0 ->> 'unit_price'),
  '40000', 'at B''s last bid'
);

select public.complete_order_payment((select id from made where name = 'order 3'));
select results_eq(
  $$ select a.status::text, s.status::text
     from public.auctions a join public.stock_items s on s.id = a.stock_item_id
     where a.id = (select id from made where name = 'auction 3') $$,
  $$ values ('won', 'reserved') $$,
  'A''s late payment takes nothing once the copy is offered to B'
);
select is(
  (select count(*)::integer from public.stock_items s
   join public.order_items i on i.id = s.order_item_id
   where i.order_id = (select id from made where name = 'order 3')),
  0, 'and no other copy is sold in its place'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a6c4');
insert into made select 'order 4', (public.create_order(
  '{"full_name":"B","phone":"+9647700006302","governorate":"baghdad","address":"Mansour"}'
)).id;
select pg_temp.reset_role();
select public.complete_order_payment((select id from made where name = 'order 4'));
select results_eq(
  $$ select a.status::text, s.status::text
     from public.auctions a join public.stock_items s on s.id = a.stock_item_id
     where a.id = (select id from made where name = 'auction 3') $$,
  $$ values ('paid', 'sold') $$,
  'B pays and the copy is B''s'
);
select is(
  (select count(*)::integer from public.cart_auctions where user_id = '00000000-0000-0000-0000-00000000a6c4'),
  0, 'B''s cart is empty again'
);

select * from finish();
rollback;
