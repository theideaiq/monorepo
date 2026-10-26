-- Affiliates: applying, approval, attribution, discounts, commissions, Plus and payouts.
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
select plan(20);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- A applies to be an affiliate; F and P follow A; G was invited by I and
-- also followed A; M is marketing, N finance, S support.
truncate public.products, public.orders, public.bulb_entries, public.referrals,
  public.affiliates, public.notifications cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'aa@example.iq', '{"full_name":"Ali Affiliate"}'),
  ('00000000-0000-0000-0000-0000000000d2', 'af@example.iq', '{"full_name":"Follower F"}'),
  ('00000000-0000-0000-0000-0000000000d3', 'ag@example.iq', '{"full_name":"Guest G"}'),
  ('00000000-0000-0000-0000-0000000000d4', 'ai@example.iq', '{"full_name":"Inviter I"}'),
  ('00000000-0000-0000-0000-0000000000d5', 'ap@example.iq', '{"full_name":"Plus P"}'),
  ('00000000-0000-0000-0000-0000000000d6', 'am@example.iq', '{"full_name":"Marketing M"}'),
  ('00000000-0000-0000-0000-0000000000d7', 'an@example.iq', '{"full_name":"Finance N"}'),
  ('00000000-0000-0000-0000-0000000000d8', 'as@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-0000000000d9', 'ah@example.iq', '{"full_name":"Household H"}');
-- Fixture members are adults (ages: a date of birth is needed to buy).
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000d6', 'marketing'),
  ('00000000-0000-0000-0000-0000000000d7', 'finance'),
  ('00000000-0000-0000-0000-0000000000d8', 'support');

insert into public.product_categories (id, slug, name_ar, name_en, affiliate_rate) values
  ('69000000-0000-0000-0000-0000000000c1', 'aff-vinyl', 'فاينل', 'Vinyl', 8),
  ('69000000-0000-0000-0000-0000000000c2', 'aff-consoles', 'أجهزة', 'Consoles', 3);

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('69000000-0000-0000-0000-000000000001', 'aff-record', 'أسطوانة', 'Record', 200000, 20, 'active', 'sale', '69000000-0000-0000-0000-0000000000c1'),
  ('69000000-0000-0000-0000-000000000002', 'aff-console', 'جهاز', 'Console', 100000, 20, 'active', 'sale', '69000000-0000-0000-0000-0000000000c2');

update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set free_from = null, plus_free_delivery = false;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

-- A once ordered to +9647700000691.
insert into public.orders (user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('00000000-0000-0000-0000-0000000000d1', 'delivered', 1000, 0, 1000, '{"phone":"+9647700000691","address":"Zayouna 1"}');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier) values
  ('aff-plus-monthly', 'Plus monthly', 30000, 'month', 'plus', 2, 1);

-- ── Applying and approval ───────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select is(
  (select status::text from public.apply_affiliate('My Instagram, 40k followers', 'instagram.com/ali')),
  'applied', 'a member applies to be an affiliate'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select throws_ok(
  $$ select public.touch_affiliate('ALIAFF', 'link') $$, '23514', 'Invalid code',
  'codes work only once approved'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d8', 'aal2');
select throws_ok(
  $$ select public.decide_affiliate('00000000-0000-0000-0000-0000000000d1', 'approved', 'ALIAFF') $$,
  '42501', 'Not allowed', 'only marketing decides on affiliates'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d6', 'aal2');
select is(
  (select status::text from public.decide_affiliate('00000000-0000-0000-0000-0000000000d1', 'approved', 'aliaff')),
  'approved', 'marketing approves an affiliate with their code'
);

select pg_temp.reset_role();
select is(
  (select data ->> 'code' from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000d1' and event = 'affiliate_approved'),
  'ALIAFF', 'the affiliate is told their code'
);

-- ── Following a link ────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select throws_ok(
  $$ select public.touch_affiliate('ALIAFF', 'link') $$, '23514', 'Invalid code',
  'affiliates cannot follow their own link'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select results_eq(
  $$ select code, name from public.touch_affiliate('aliaff', 'link') $$,
  $$ values ('ALIAFF', 'Ali') $$,
  'a follower opens the link and sees whose it is'
);
select is(
  (select code from public.my_affiliate_referrer()), 'ALIAFF',
  'the follower''s next orders count for the affiliate'
);

-- ── Orders ──────────────────────────────────────────────────────────────────

insert into public.cart_items (product_id, quantity) values ('69000000-0000-0000-0000-000000000001', 1);
select public.create_order('{"full_name":"F","phone":"+9647700000692","governorate":"baghdad","address":"Mansour 2"}');
select results_eq(
  $$ select discount, discount_source, affiliate_id, total from public.orders where user_id = auth.uid() $$,
  $$ values (10000::bigint, 'affiliate', '00000000-0000-0000-0000-0000000000d1'::uuid, 195000::bigint) $$,
  'the follower gets 5% off and the order counts for the affiliate'
);

-- G was invited by I: on 100,000 IQD the invite (10,000) beats 5% (5,000).
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d4');
select pg_temp.reset_role();
insert into public.referrals (invitee_id, inviter_id) values
  ('00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d4');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d3');
select public.touch_affiliate('ALIAFF', 'code');
insert into public.cart_items (product_id, quantity) values ('69000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"G","phone":"+9647700000693","governorate":"baghdad","address":"Adhamiya 3"}');
select results_eq(
  $$ select discount, discount_source, affiliate_id from public.orders where user_id = auth.uid() $$,
  $$ values (10000::bigint, 'invite', null::uuid) $$,
  'one discount per order: the larger one wins'
);

-- ── Commissions ─────────────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.orders set status = 'delivered' where user_id = '00000000-0000-0000-0000-0000000000d2';
-- 8% of the record after the follower's 5%: 200,000 × 8% × 95% = 15,200.
select results_eq(
  $$ select amount, status::text, available_at > now() from public.affiliate_commissions where kind = 'order' $$,
  $$ values (15200::bigint, 'pending', true) $$,
  'a delivered order earns the category rate, held through the return window'
);

-- H shares A's phone number: no commission.
insert into public.affiliate_attributions (member_id, affiliate_id, via) values
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d1', 'link');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d9');
insert into public.cart_items (product_id, quantity) values ('69000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"H","phone":"+9647700000691","governorate":"baghdad","address":"Other 9"}');
select pg_temp.reset_role();
update public.orders set status = 'delivered' where user_id = '00000000-0000-0000-0000-0000000000d9';
select is(
  (select count(*) from public.affiliate_commissions c join public.orders o on o.id = c.order_id
   where o.user_id = '00000000-0000-0000-0000-0000000000d9'),
  0::bigint, 'no commission on orders that share the affiliate''s phone or address'
);

-- ── Plus ────────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d5');
select public.touch_affiliate('ALIAFF', 'code');
select pg_temp.reset_role();
insert into public.subscriptions (id, user_id, plan_id, status, provider) values
  ('69000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d5', 'aff-plus-monthly', 'active', 'wayl');
insert into public.payments (user_id, subscription_id, reference_id, provider, amount, status, paid_at)
select '00000000-0000-0000-0000-0000000000d5', '69000000-0000-0000-0000-0000000000a1',
  'aff-plus-' || n, 'wayl', 30000, 'paid', now()
from generate_series(1, 4) n;
select results_eq(
  $$ select count(*), sum(amount) from public.affiliate_commissions where kind = 'plus' $$,
  $$ values (3::bigint, 18000::numeric) $$,
  'a new Plus member earns the affiliate 20% of their first 3 months'
);
select is(
  (select affiliate_id from public.subscriptions where id = '69000000-0000-0000-0000-0000000000a1'),
  '00000000-0000-0000-0000-0000000000d1'::uuid, 'the membership remembers its affiliate'
);

-- ── Payouts ─────────────────────────────────────────────────────────────────

update public.affiliate_commissions set available_at = now() - interval '1 minute';
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d1');
select results_eq(
  $$ select available, pending, orders, plus_members from public.my_affiliate() $$,
  $$ values (33200::bigint, 0::bigint, 1::bigint, 1::bigint) $$,
  'the affiliate sees their balance'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d2');
select is(
  (select count(*) from public.affiliate_commissions), 0::bigint,
  'followers cannot see commissions'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000d6', 'aal2');
select throws_ok(
  $$ select public.record_affiliate_payout('00000000-0000-0000-0000-0000000000d1') $$,
  '42501', 'Not allowed', 'only finance records payouts'
);

-- Paid as Bulbs, with 20% more: 33,200 × 1.2 ÷ 100 = 398 Bulbs.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000d7', 'aal2');
select results_eq(
  $$ select amount, bulbs from public.record_affiliate_payout('00000000-0000-0000-0000-0000000000d1') $$,
  $$ values (33200::bigint, 398) $$,
  'finance pays out everything ready, as Bulbs with 20% more'
);

select pg_temp.reset_role();
select results_eq(
  $$ select amount, status::text from public.bulb_entries
     where user_id = '00000000-0000-0000-0000-0000000000d1' and reason = 'affiliate_payout' $$,
  $$ values (398, 'available') $$,
  'the Bulbs are usable at once'
);

-- A refund after the payout is clawed back from the next one.
update public.orders set status = 'refunded' where user_id = '00000000-0000-0000-0000-0000000000d2';
select results_eq(
  $$ select available from private.affiliate_balance('00000000-0000-0000-0000-0000000000d1') $$,
  $$ values (-15200::bigint) $$,
  'a refunded order''s paid commission is clawed back'
);

select * from finish();
rollback;
