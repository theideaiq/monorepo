-- Bulbs: tiers, cashback on delivered orders, bonuses, trade-in payouts, adjustments and expiry.
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

select plan(25);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- M is a member, P a Plus member, S support, F finance.
delete from public.staff;
truncate public.bulb_entries;
update public.store_settings set bulb_rate = 3, bulb_half_from = 500000, return_days = 14;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'bm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'bp@example.iq', '{"full_name":"Plus P"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'bs@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000000e4', 'bf@example.iq', '{"full_name":"Finance F"}');
-- Fixture members are adults (ages: a date of birth is needed to buy).
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000e3', 'support'),
  ('00000000-0000-0000-0000-0000000000e4', 'finance');

insert into public.product_categories (id, slug, name_ar, name_en, bulb_multiplier) values
  ('66000000-0000-0000-0000-0000000000c1', 'bulb-books', 'كتب', 'Books', 1),
  ('66000000-0000-0000-0000-0000000000c2', 'bulb-laptops', 'حواسيب', 'Laptops', 0.5);

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id, bulb_multiplier) values
  ('66000000-0000-0000-0000-0000000000a1', 'bulb-book', 'كتاب', 'Book', 100000, 10, 'active', 'sale', '66000000-0000-0000-0000-0000000000c1', null),
  ('66000000-0000-0000-0000-0000000000a2', 'bulb-laptop', 'حاسوب', 'Laptop', 1000000, 10, 'active', 'sale', '66000000-0000-0000-0000-0000000000c2', null),
  ('66000000-0000-0000-0000-0000000000a3', 'bulb-console', 'جهاز', 'Console', 400000, 10, 'active', 'sale', '66000000-0000-0000-0000-0000000000c1', 0.5);

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier, bulb_rate)
values ('plus-bulbs-test', 'Plus Test', 22750, 'month', 'plus', 2, 2, 5);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000000e2', 'plus-bulbs-test', 'active', 'wayl', now(), now() + interval '30 days');

-- M's order: a book (100,000) and a laptop (1,000,000); P's orders: a book.
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('66000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'shipped', 1100000, 5000, 1105000, '{}'),
  ('66000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000e2', 'shipped', 100000, 0, 100000, '{}'),
  ('66000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000e2', 'shipped', 100000, 0, 100000, '{}');
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity) values
  ('66000000-0000-0000-0000-0000000000b1', '66000000-0000-0000-0000-0000000000a1', 'كتاب', 'Book', 100000, 1),
  ('66000000-0000-0000-0000-0000000000b1', '66000000-0000-0000-0000-0000000000a2', 'حاسوب', 'Laptop', 1000000, 1),
  ('66000000-0000-0000-0000-0000000000b2', '66000000-0000-0000-0000-0000000000a1', 'كتاب', 'Book', 100000, 1),
  ('66000000-0000-0000-0000-0000000000b3', '66000000-0000-0000-0000-0000000000a1', 'كتاب', 'Book', 100000, 1);

-- ── Rates ───────────────────────────────────────────────────────────────────

select is(private.bulb_rate('00000000-0000-0000-0000-0000000000e1'), 3::numeric, 'everyone earns the store rate');
select is(private.bulb_rate('00000000-0000-0000-0000-0000000000e2'), 5::numeric, 'Plus members earn their plan''s rate');
select is(
  private.bulb_multiplier('66000000-0000-0000-0000-0000000000a1', 600000), 0.5,
  'items over 500,000 IQD earn half'
);
select is(
  private.bulb_multiplier('66000000-0000-0000-0000-0000000000a3', 400000), 0.5,
  'a product can earn half on its own (consoles)'
);
select is(
  private.bulb_multiplier('66000000-0000-0000-0000-0000000000a2', 1000000), 0.5,
  'half stays half: a laptop over 500,000 isn''t halved twice'
);

-- ── Cashback on delivery ────────────────────────────────────────────────────

update public.orders set status = 'delivered' where id = '66000000-0000-0000-0000-0000000000b1';

-- M earns 3%: book 100,000 × 3% = 30 Bulbs, laptop 1,000,000 × 3% × ½ =
-- 150 Bulbs. Delivery earns nothing.
select is(
  (select amount from public.bulb_entries where order_id = '66000000-0000-0000-0000-0000000000b1' and kind = 'purchase'),
  180, 'a delivered order earns the flat rate, half on laptops'
);
select results_eq(
  $$ select status::text, available_at > now() + interval '13 days' and available_at <= now() + interval '14 days'
     from public.bulb_entries where order_id = '66000000-0000-0000-0000-0000000000b1' and kind = 'purchase' $$,
  $$ values ('pending', true) $$,
  'cashback is pending for the 14-day return window'
);
select is(
  (select amount from public.bulb_entries where user_id = '00000000-0000-0000-0000-0000000000e1' and reason = 'first_order'),
  20, 'the first delivered order earns a 20-Bulb bonus'
);

update public.orders set status = 'delivered' where id = '66000000-0000-0000-0000-0000000000b2';
-- P is on a 5% plan: 100,000 × 5% = 5,000 IQD = 50 Bulbs.
select is(
  (select amount from public.bulb_entries where order_id = '66000000-0000-0000-0000-0000000000b2' and kind = 'purchase'),
  50, 'Plus members earn their plan''s rate'
);

update public.orders set status = 'shipped' where id = '66000000-0000-0000-0000-0000000000b2';
update public.orders set status = 'delivered' where id = '66000000-0000-0000-0000-0000000000b2';
select is(
  (select count(*)::int from public.bulb_entries where order_id = '66000000-0000-0000-0000-0000000000b2'),
  2, 'an order earns once, however often it is marked delivered'
);

update public.orders set status = 'delivered' where id = '66000000-0000-0000-0000-0000000000b3';
select is(
  (select count(*)::int from public.bulb_entries where user_id = '00000000-0000-0000-0000-0000000000e2' and reason = 'first_order'),
  1, 'the first-order bonus comes once'
);

update public.orders set status = 'refunded' where id = '66000000-0000-0000-0000-0000000000b3';
select is(
  (select status::text from public.bulb_entries where order_id = '66000000-0000-0000-0000-0000000000b3'),
  'void', 'a refund voids the order''s Bulbs'
);

-- ── Balances ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select results_eq(
  $$ select available, pending, rate from public.my_bulbs() $$,
  $$ values (0::bigint, 200::bigint, 3::numeric) $$,
  'members see their pending Bulbs and rate'
);
select throws_ok(
  $$ insert into public.bulb_entries (user_id, amount, kind) values (auth.uid(), 1000, 'adjustment') $$,
  '42501', null, 'members cannot write Bulbs'
);
select is(
  (select count(*)::int from public.bulb_entries where user_id <> auth.uid()),
  0, 'members see only their own Bulbs'
);

select pg_temp.reset_role();
update public.bulb_entries set available_at = now() - interval '1 minute'
where user_id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select available from private.bulb_balance('00000000-0000-0000-0000-0000000000e1')),
  200::bigint, 'Bulbs become usable when the return window closes'
);

-- ── Trade-ins ───────────────────────────────────────────────────────────────

insert into public.trade_ins (id, user_id, category, title, condition, payout, photos, contact_phone, status, offer_amount)
values ('66000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'vinyl', 'Record',
  'like_new', 'store_credit', array['00000000-0000-0000-0000-0000000000e1/a.jpg'], '+9647701234567', 'accepted', 25000);
update public.trade_ins set status = 'completed' where id = '66000000-0000-0000-0000-0000000000d1';
select results_eq(
  $$ select kind::text, amount from public.bulb_entries where trade_in_id = '66000000-0000-0000-0000-0000000000d1' order by kind $$,
  $$ values ('bonus', 10), ('trade_in', 300) $$,
  'a store-credit trade-in pays 20% more in Bulbs, plus a bonus'
);

-- ── Staff ───────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
select throws_ok(
  $$ select public.adjust_bulbs('00000000-0000-0000-0000-0000000000e1', 50, '') $$,
  '23514', 'A reason is required', 'adjustments need a reason'
);
select lives_ok(
  $$ select public.adjust_bulbs('00000000-0000-0000-0000-0000000000e1', -30, 'Damaged sleeve goodwill reversal') $$,
  'support adjusts Bulbs with a reason'
);
select results_eq(
  $$ select available, rate from public.member_bulbs('00000000-0000-0000-0000-0000000000e1') $$,
  $$ values (480::bigint, 3::numeric) $$,
  'support sees a member''s balance and rate'
);
select throws_ok(
  $$ select public.set_money_rules('{"bulb_rate": 4}') $$,
  '42501', null, 'only finance sets the money rules'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e4', 'aal2');
select ok(
  (select value_iqd > 0 from public.bulbs_outstanding()),
  'finance sees what members hold'
);
select lives_ok(
  $$ select public.set_money_rules('{"bulb_rate": 2.5, "return_days": 10}', '{"66000000-0000-0000-0000-0000000000c1": 1.5}') $$,
  'finance sets the rate, the return window and category multipliers'
);
select results_eq(
  $$ select s.bulb_rate, s.return_days, s.max_giveaway_rate, c.bulb_multiplier
     from public.store_settings s, public.product_categories c
     where c.id = '66000000-0000-0000-0000-0000000000c1' $$,
  $$ values (2.5::numeric(4, 2), 10::smallint, 20::numeric(4, 2), 1.5::numeric(3, 2)) $$,
  'the rules given are saved and the others kept'
);

-- ── Expiry ──────────────────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.bulb_entries set created_at = now() - interval '13 months'
where user_id = '00000000-0000-0000-0000-0000000000e1';
update public.orders set created_at = now() - interval '13 months'
where user_id = '00000000-0000-0000-0000-0000000000e1';
select private.run_bulb_expiry();
select is(
  (select available from private.bulb_balance('00000000-0000-0000-0000-0000000000e1')),
  0::bigint, 'Bulbs expire after 12 months without activity'
);

select * from finish();
rollback;
