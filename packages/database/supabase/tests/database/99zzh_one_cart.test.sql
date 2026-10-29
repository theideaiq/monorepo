-- One cart: single rentals beside what's bought, priced together with one
-- delivery fee, placed in one order with their rentals.
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

select plan(14);

-- ── Fixtures ────────────────────────────────────────────────────────────────
truncate public.products, public.orders, public.rentals cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000c01', 'onecart@example.iq', '{"full_name":"One C"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;

update public.store_settings set cash_on_delivery_enabled = true, rental_deposit_rate = 50, cash_limit = null;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';
insert into public.rental_rates (category_id, price, days, late_fee)
values ('50000000-0000-0000-0000-000000000002', 19750, 7, 2750)
on conflict (category_id) do nothing;

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('9fc00000-0000-0000-0000-000000000001', 'game-9zzh', 'لعبة', 'Game', 59750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000001'),
  ('9fc00000-0000-0000-0000-000000000002', 'book-9zzh', 'كتاب', 'Book', 19750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000004'),
  ('9fc00000-0000-0000-0000-000000000003', 'film-9zzh', 'فيلم', 'Film', 9750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000006'),
  ('9fc00000-0000-0000-0000-000000000004', 'manga-9zzh', 'مانغا', 'Manga', 9750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000007'),
  ('9fc00000-0000-0000-0000-000000000005', 'camera-9zzh', 'كاميرا', 'Camera', 299750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000002'),
  ('9fc00000-0000-0000-0000-000000000006', 'record-9zzh', 'أسطوانة', 'Record', 20000, 3, 'active', 'sale', '50000000-0000-0000-0000-000000000005');

create temporary table made (name text primary key, id uuid);
grant all on made to authenticated;
create temporary table zone_id as
  select id from public.delivery_zones where governorate = 'baghdad' order by position limit 1;
grant select on zone_id to authenticated;
create temporary table rates as
  select q.price, q.deposit from private.rental_quote('9fc00000-0000-0000-0000-000000000001') q;
grant select on rates to authenticated;

-- ── The cart ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');
insert into public.cart_items (product_id, quantity) values ('9fc00000-0000-0000-0000-000000000006', 2);
select lives_ok(
  $$ insert into public.cart_items (product_id, purpose) values ('9fc00000-0000-0000-0000-000000000001', 'rent') $$,
  'a rental goes in the cart beside what''s bought'
);
select throws_ok(
  $$ insert into public.cart_items (product_id, purpose) values ('9fc00000-0000-0000-0000-000000000005', 'rent') $$,
  '23514', 'Only films, books and games rent together',
  'gear rents on its own'
);
select throws_ok(
  $$ insert into public.cart_items (product_id, purpose, quantity) values ('9fc00000-0000-0000-0000-000000000002', 'rent', 2) $$,
  '23514', null,
  'a rent line is one copy'
);
select throws_ok(
  $$ insert into public.cart_items (product_id, purpose) values ('9fc00000-0000-0000-0000-000000000006', 'rent') $$,
  'P0002', 'Item not available',
  'only rentable items rent'
);
insert into public.cart_items (product_id, purpose) values
  ('9fc00000-0000-0000-0000-000000000002', 'rent'),
  ('9fc00000-0000-0000-0000-000000000003', 'rent');
select throws_ok(
  $$ insert into public.cart_items (product_id, purpose) values ('9fc00000-0000-0000-0000-000000000004', 'rent') $$,
  '23514', 'Rent 1 to 3 items at a time',
  'at most three rentals'
);

-- ── The quote ───────────────────────────────────────────────────────────────

delete from public.cart_items where purpose = 'rent' and product_id <> '9fc00000-0000-0000-0000-000000000001';
select results_eq(
  $$ select (q ->> 'goods')::bigint, (q ->> 'rent')::bigint, (q ->> 'deposits')::bigint,
       (q ->> 'subtotal')::bigint, (q ->> 'shipping_fee')::bigint, (q ->> 'total')::bigint
     from public.checkout_quote(delivery_zone => (select id from zone_id)) q $$,
  $$ select 40000::bigint, price, deposit, 40000 + price + deposit, 5000::bigint, 45000 + price + deposit from rates $$,
  'the quote adds the rent and the deposit to what''s bought, with one delivery fee'
);
select pg_temp.reset_role();
select results_eq(
  $$ select jsonb_array_length(q -> 'lines'), jsonb_array_length(q -> 'rentals')
     from private.price_checkout('00000000-0000-0000-0000-000000000c01', null, 'delivery', 'online', (select id from zone_id), 0) q $$,
  $$ values (1, 1) $$,
  'its lines are what''s bought, and the rentals to make'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');

select pg_temp.reset_role();
update public.delivery_zones set free_from = 40000 + (select price from rates) where governorate = 'baghdad';
select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');
select is(
  (public.checkout_quote(delivery_zone => (select id from zone_id)) ->> 'shipping_fee')::bigint,
  0::bigint, 'the rent counts towards free delivery'
);
select pg_temp.reset_role();
update public.delivery_zones set free_from = 40001 + (select price from rates) where governorate = 'baghdad';
select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');
select is(
  (public.checkout_quote(delivery_zone => (select id from zone_id)) ->> 'shipping_fee')::bigint,
  5000::bigint, 'the deposit doesn''t'
);

-- ── The order ───────────────────────────────────────────────────────────────

select throws_ok(
  $$ select public.create_gift_order((select id from zone_id)) $$,
  '23514', 'Rentals can''t be sent as gifts',
  'a cart with a rental isn''t a gift'
);

insert into made
select 'order', (public.create_order(
  '{"full_name":"O","phone":"+9647700000951","governorate":"baghdad","address":"Karrada"}',
  'delivery', 'cash_on_delivery'
)).id;

select pg_temp.reset_role();
select results_eq(
  $$ select kind::text, quantity from public.order_items
     where order_id = (select id from made where name = 'order') order by kind::text $$,
  $$ values ('deposit', 1), ('rental', 1), ('sale', 2) $$,
  'one order: what''s bought, the rent and the deposit'
);
select results_eq(
  $$ select r.kind::text, s.status::text from public.rentals r
     join public.stock_items s on s.rental_id = r.id
     where r.order_id = (select id from made where name = 'order') $$,
  $$ values ('single', 'rented') $$,
  'the rental holds its copy'
);
select is(
  (select count(*)::int from public.stock_items s
   join public.order_items i on i.id = s.order_item_id
   where i.order_id = (select id from made where name = 'order') and s.status = 'sold'),
  2, 'and the bought copies are set aside'
);
select is(
  (select count(*)::int from public.cart_items where user_id = '00000000-0000-0000-0000-000000000c01'),
  0, 'the cart is emptied'
);

select * from finish();
rollback;
