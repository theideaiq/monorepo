-- Bulbs at checkout: spending Bulbs, giving them back, and the tiers' free delivery.
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

select plan(17);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- U holds 500 usable Bulbs; R is on a Plus plan with free delivery; Q is
-- invited and on the same plan.
truncate public.products, public.orders, public.bulb_entries cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f7', 'cu@example.iq', '{"full_name":"Customer U"}'),
  ('00000000-0000-0000-0000-0000000000f8', 'cr@example.iq', '{"full_name":"Customer R"}'),
  ('00000000-0000-0000-0000-0000000000f9', 'cq@example.iq', '{"full_name":"Customer Q"}');
-- Fixture members are adults (ages: a date of birth is needed to buy).
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier, bulb_rate, free_delivery)
values ('plus-free-test', 'Plus Test', 22750, 'month', 'plus', 2, 2, 5, true);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end) values
  ('00000000-0000-0000-0000-0000000000f8', 'plus-free-test', 'active', 'wayl', now(), now() + interval '30 days'),
  ('00000000-0000-0000-0000-0000000000f9', 'plus-free-test', 'active', 'wayl', now(), now() + interval '30 days');
insert into public.referrals (invitee_id, inviter_id)
values ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000f7');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('67000000-0000-0000-0000-000000000001', 'bulb-switch', 'سويتش', 'Switch', 100000, 20, 'active', 'sale'),
  ('67000000-0000-0000-0000-000000000002', 'bulb-pin', 'دبوس', 'Pin', 3000, 20, 'active', 'sale');

update public.store_settings set
  cash_on_delivery_enabled = true, bulb_rate = 3, max_giveaway_rate = 20, cash_limit = 500000;
update public.delivery_zones set free_from = null, plus_free_delivery = false;
update public.delivery_zones set active = true, fee = 5000, free_from = 150000, plus_free_delivery = true
where governorate = 'baghdad';
update public.delivery_zones set active = true, fee = 8000 where governorate = 'basra';

insert into public.bulb_entries (user_id, amount, kind, reason, created_by)
values ('00000000-0000-0000-0000-0000000000f7', 500, 'adjustment', 'Test balance', '00000000-0000-0000-0000-0000000000f8');

insert into public.orders (user_id, status, subtotal, shipping_fee, total, shipping_address)
values ('00000000-0000-0000-0000-0000000000f8', 'delivered', 800000, 0, 800000, '{}');

-- ── Spending ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f7');
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000001', 1);
select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online', null, 600) $$,
  '23514', 'Not enough Bulbs', 'members spend only the Bulbs they have'
);
select lives_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online', null, 300) $$,
  'members spend Bulbs at checkout'
);
select results_eq(
  $$ select bulbs_used, bulbs_discount, total, status::text from public.orders order by number desc limit 1 $$,
  $$ values (300, 30000::bigint, 75000::bigint, 'pending') $$,
  '300 Bulbs take 30,000 IQD off; the rest is paid online'
);
select is(
  (select available from public.my_bulbs()), 200::bigint,
  'the Bulbs leave the balance'
);

select public.cancel_order((select id from public.orders order by number desc limit 1));
select is(
  (select available from public.my_bulbs()), 500::bigint,
  'cancelling the order gives the Bulbs back'
);

-- A small order paid in full with Bulbs: 3,000 + 5,000 delivery = 80 Bulbs.
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000002', 1);
select lives_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online', null, 500) $$,
  'Bulbs can pay a whole order'
);
select results_eq(
  $$ select bulbs_used, total, status::text from public.orders order by number desc limit 1 $$,
  $$ values (80, 0::bigint, 'paid') $$,
  'only what the order costs is spent, and it is paid at once'
);

-- ── Earning on the money part ───────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.orders (id, user_id, status, subtotal, shipping_fee, bulbs_used, bulbs_discount, total, shipping_address)
values ('67000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f7', 'shipped',
  100000, 0, 500, 50000, 50000, '{}');
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity)
values ('67000000-0000-0000-0000-0000000000a1', '67000000-0000-0000-0000-000000000001', 'سويتش', 'Switch', 100000, 1);
update public.orders set status = 'delivered' where id = '67000000-0000-0000-0000-0000000000a1';
-- Half paid in money: 100,000 × ½ × 3% = 1,500 IQD = 15 Bulbs.
select is(
  (select amount from public.bulb_entries where order_id = '67000000-0000-0000-0000-0000000000a1' and kind = 'purchase'),
  15, 'cashback is earned only on what was paid in money'
);

select throws_ok(
  $$ insert into public.orders (user_id, status, subtotal, shipping_fee, bulbs_used, bulbs_discount, total, shipping_address)
     values ('00000000-0000-0000-0000-0000000000f7', 'pending', 1000, 0, 1, 50, 950, '{}') $$,
  '23514', null, 'each Bulb is worth exactly 100 IQD off'
);

-- ── Delivery ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f7');
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}');
select is(
  (select shipping_fee from public.orders where user_id = auth.uid() order by number desc limit 1),
  5000::bigint, 'a small order pays for delivery'
);

insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000001', 2);
select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}');
select is(
  (select shipping_fee from public.orders where user_id = auth.uid() order by number desc limit 1),
  0::bigint, 'delivery in Baghdad is free for everyone from 150,000 IQD'
);

-- The quote is what the order will be: 100,000 + 5,000 delivery, 30 Bulbs
-- back (3%), at most 200 under the 20% cap.
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000001', 1);
select results_eq(
  $$ select (q ->> 'subtotal')::bigint, (q ->> 'shipping_fee')::bigint, (q ->> 'total')::bigint,
            (q ->> 'bulbs_to_earn')::int, (q ->> 'max_bulbs')::int, q ->> 'free_delivery'
     from public.checkout_quote('delivery', 'online', null, 0, 'baghdad') q $$,
  $$ values (100000::bigint, 5000::bigint, 105000::bigint, 30, 200, null::text) $$,
  'the checkout quote prices the cart'
);
delete from public.cart_items where user_id = auth.uid();

insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000001', 6);
select throws_ok(
  $$ select public.create_order('{"full_name":"U","phone":"+9647700000301","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery') $$,
  '23514', 'Cash payment is not available', 'orders over 500,000 IQD aren''t paid in cash on delivery'
);
delete from public.cart_items where user_id = auth.uid();

select pg_temp.login_as('00000000-0000-0000-0000-0000000000f8');
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"R","phone":"+9647700000302","governorate":"baghdad","address":"Mansour"}');
select is(
  (select shipping_fee from public.orders where user_id = auth.uid() order by number desc limit 1),
  0::bigint, 'a plan with free delivery delivers free in Baghdad on any order'
);

insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"R","phone":"+9647700000302","governorate":"basra","address":"Ashar"}');
select is(
  (select shipping_fee from public.orders where user_id = auth.uid() order by number desc limit 1),
  8000::bigint, 'but not outside Baghdad'
);

-- ── The giveaway cap ────────────────────────────────────────────────────────

-- Q's first order (100,000): delivery waived (5,000) and the invite's 10%
-- would give away 15,000; at a 12% cap (12,000) the discount is 7,000 and
-- no cashback is left.
select pg_temp.reset_role();
update public.store_settings set max_giveaway_rate = 12;
select pg_temp.login_as('00000000-0000-0000-0000-0000000000f9');
insert into public.cart_items (product_id, quantity) values ('67000000-0000-0000-0000-000000000001', 1);
select public.create_order('{"full_name":"Q","phone":"+9647700000303","governorate":"baghdad","address":"Jadriya"}');
select results_eq(
  $$ select shipping_fee, discount, discount_source, max_bulbs from public.orders
     where user_id = auth.uid() order by number desc limit 1 $$,
  $$ values (0::bigint, 7000::bigint, 'invite', 0) $$,
  'the discount shrinks to keep the order within the giveaway cap'
);

select pg_temp.reset_role();
update public.orders set status = 'delivered'
where user_id = '00000000-0000-0000-0000-0000000000f9';
select is(
  (select count(*)::int from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-0000000000f9' and kind = 'purchase'),
  0, 'an order at the cap earns no cashback'
);

select * from finish();
rollback;
