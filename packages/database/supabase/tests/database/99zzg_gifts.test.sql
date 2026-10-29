-- Send as a gift: checkout without an address, the link, the preview with
-- the price hidden, claiming with the recipient's address, and holding the
-- order until then.
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

select plan(21);

-- ── Fixtures ────────────────────────────────────────────────────────────────
truncate public.products, public.orders cascade;

-- B buys, R receives, S is staff.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000f01', 'buyer-gift@example.iq', '{"full_name":"Bashar B"}'),
  ('00000000-0000-0000-0000-000000000f02', 'recipient-gift@example.iq', '{"full_name":"Rana R"}'),
  ('00000000-0000-0000-0000-000000000f03', 'staff-gift@example.iq', '{"full_name":"Staff S"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000f03', 'admin');

update public.store_settings set cash_on_delivery_enabled = true, require_verified_phone = true;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('9ff00000-0000-0000-0000-000000000001', 'gift-9zzg', 'هدية', 'Board game', 40000, 3, 'active', 'sale');

create temporary table made (name text primary key, value text);
grant all on made to anon, authenticated;
create temporary table zone_id as
  select id from public.delivery_zones where governorate = 'baghdad' order by position limit 1;
grant select on zone_id to anon, authenticated;

-- ── Checkout ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
insert into public.cart_items (product_id, quantity) values ('9ff00000-0000-0000-0000-000000000001', 1);

select throws_ok(
  $$ select public.create_gift_order(null) $$,
  '23514', 'Choose where the gift goes',
  'a gift needs the area it goes to'
);

insert into made
select 'order', (public.create_gift_order((select id from zone_id), '  Happy birthday!  ', true)).id;

select pg_temp.reset_role();
select results_eq(
  $$ select is_gift, status::text, shipping_fee, total, shipping_address, payment_method::text
     from public.orders where id = (select value::uuid from made where name = 'order') $$,
  $$ values (true, 'pending', 5000::bigint, 45000::bigint, '{"governorate":"baghdad"}'::jsonb, 'online') $$,
  'the gift is an online order to the area, without an address or the phone check'
);
select results_eq(
  $$ select sender_id, message, hide_price, token_hash is null, claimed_at is null
     from public.gifts where order_id = (select value::uuid from made where name = 'order') $$,
  $$ values ('00000000-0000-0000-0000-000000000f01'::uuid, 'Happy birthday!', true, true, true) $$,
  'with the message and the hidden price'
);
select is(
  (select count(*)::int from public.cart_items where user_id = '00000000-0000-0000-0000-000000000f01'),
  0, 'the cart is emptied'
);

-- ── The link ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select throws_ok(
  $$ select public.gift_link((select value::uuid from made where name = 'order')) $$,
  'P0002', 'Gift not found',
  'only the buyer makes the link'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
insert into made values ('old', public.gift_link((select value::uuid from made where name = 'order')));
insert into made values ('token', public.gift_link((select value::uuid from made where name = 'order')));

select pg_temp.login_anon();
select throws_ok(
  $$ select public.gift_preview((select value from made where name = 'old')) $$,
  'P0002', 'Gift not found',
  'a new link replaces the old one'
);
select is(
  public.gift_preview((select value from made where name = 'token')) - 'order_id' - 'items' - 'zone_id',
  '{"from":"Bashar","message":"Happy birthday!","claimed":false,"ready":false,"status":"pending","governorate":"baghdad","total":null}'::jsonb,
  'anyone with the link sees who it''s from, the message and no price'
);
select is(
  (public.gift_preview((select value from made where name = 'token')) -> 'items' -> 0) - 'image',
  '{"name_ar":"هدية","name_en":"Board game","quantity":1,"slug":"gift-9zzg","unit_price":null}'::jsonb,
  'and what''s inside'
);
select is(
  (public.gift_preview((select value from made where name = 'token')) ->> 'zone_id')::uuid,
  (select id from zone_id),
  'and the zone it goes to, for the recipient''s address'
);

-- ── Claiming ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select throws_ok(
  $$ select public.claim_gift((select value from made where name = 'token'),
       '{"full_name":"Rana","phone":"+9647700000f02","address":"Karrada"}') $$,
  '23514', 'This gift isn''t ready yet',
  'an unpaid gift can''t be claimed'
);

select pg_temp.reset_role();
select public.complete_order_payment((select value::uuid from made where name = 'order'));

select throws_ok(
  $$ update public.orders set status = 'shipped' where id = (select value::uuid from made where name = 'order') $$,
  '23514', 'Waiting for the recipient''s address',
  'an unclaimed gift doesn''t ship'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select throws_ok(
  $$ select public.claim_gift((select value from made where name = 'token'),
       '{"full_name":"B","phone":"+9647700000901","address":"Mansour"}') $$,
  '23514', 'This gift is from you',
  'the buyer can''t claim it'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select throws_ok(
  $$ select public.claim_gift((select value from made where name = 'token'),
       '{"full_name":"Rana","address":"Karrada"}') $$,
  '23514', 'Invalid shipping address',
  'the recipient gives a name, phone and address'
);
select throws_ok(
  $$ select public.claim_gift((select value from made where name = 'token'),
       '{"full_name":"Rana","phone":"+9647700000902","address":"Karrada"}') $$,
  '23514', 'Verify your phone number first',
  'with a phone they''ve verified'
);

select pg_temp.reset_role();
insert into public.verified_phones (user_id, phone)
values ('00000000-0000-0000-0000-000000000f02', '+9647700000902');

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select is(
  public.claim_gift((select value from made where name = 'token'),
    '{"full_name":"Rana","phone":"+9647700000902","governorate":"basra","city":"Karrada","address":"Street 9"}'),
  (select value::uuid from made where name = 'order'),
  'the recipient claims it'
);

select pg_temp.reset_role();
select is(
  (select shipping_address - 'notes' - 'landmark' from public.orders where id = (select value::uuid from made where name = 'order')),
  '{"full_name":"Rana","phone":"+9647700000902","governorate":"baghdad","city":"Karrada","address":"Street 9"}'::jsonb,
  'their address goes on the order, in the gift''s area'
);
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000f01' and event = 'gift_claimed'),
  1, 'the buyer is told'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select public.gift_preview((select value from made where name = 'token')) $$,
  'P0002', 'Gift not found',
  'the link is spent'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select results_eq(
  $$ select (g ->> 'claimed')::boolean, (g ->> 'ready')::boolean, g ->> 'total' from public.received_gifts() g $$,
  $$ values (true, true, null::text) $$,
  'the recipient sees it among their gifts, still without the price'
);

-- ── Shipping ────────────────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.orders set status = 'shipped' where id = (select value::uuid from made where name = 'order');
select is(
  (select count(*)::int from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000f02' and event = 'gift_shipped'),
  1, 'a claimed gift ships, and the recipient is told'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select is(
  (select count(*)::int from public.orders where id = (select value::uuid from made where name = 'order')),
  0, 'the recipient doesn''t see the buyer''s order itself'
);

select * from finish();
rollback;
