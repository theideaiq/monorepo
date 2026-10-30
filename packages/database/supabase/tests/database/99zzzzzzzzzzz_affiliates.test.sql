-- Affiliates in Partners: applying, approval with a coupon, commissions and payouts. Run with `bun run db:test`.
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

select plan(16);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- O owns the organization, M is a plain member, K marketing, F finance,
-- B a follower who buys with the code.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000af01', 'ao@example.iq'),
  ('00000000-0000-0000-0000-00000000af02', 'am@example.iq'),
  ('00000000-0000-0000-0000-00000000af03', 'ak@example.iq'),
  ('00000000-0000-0000-0000-00000000af04', 'af@example.iq'),
  ('00000000-0000-0000-0000-00000000af05', 'ab@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000af03', 'marketing'),
  ('00000000-0000-0000-0000-00000000af04', 'finance');
insert into public.organizations (id, name, slug, created_by, features) values
  ('9af00000-0000-0000-0000-0000000000a1', 'Vinyl Club', 'vinyl-club-af', '00000000-0000-0000-0000-00000000af01', '{affiliate}');
insert into public.organization_members (organization_id, user_id, role) values
  ('9af00000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000af01', 'owner'),
  ('9af00000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000af02', 'member');

-- ── Applying ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000af02');
select throws_ok(
  $$ select public.apply_affiliate('9af00000-0000-0000-0000-0000000000a1', 'We review records weekly.') $$,
  '42501', null, 'a plain member cannot apply'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000af01');
select lives_ok(
  $$ select public.apply_affiliate('9af00000-0000-0000-0000-0000000000a1',
       'We review records weekly for 40,000 followers.', 'Instagram @vinylclub', 'zaincash', '07701234567') $$,
  'the owner applies with payout details'
);
select is(
  (select status::text from public.affiliates where organization_id = '9af00000-0000-0000-0000-0000000000a1'),
  'applied', 'and sees the application'
);

-- ── Deciding ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000af01', 'aal2');
select throws_ok(
  $$ select public.decide_affiliate('9af00000-0000-0000-0000-0000000000a1', 'approved', 'VINYL5') $$,
  '42501', null, 'an organization cannot approve itself'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000af03', 'aal2');
select public.decide_affiliate('9af00000-0000-0000-0000-0000000000a1', 'approved', 'vinyl5');
select pg_temp.reset_role();
select results_eq(
  $$ select a.status::text, a.code, c.kind::text, c.amount, c.uses_per_member, c.active
     from public.affiliates a join public.coupons c on c.id = a.coupon_id
     where a.organization_id = '9af00000-0000-0000-0000-0000000000a1' $$,
  $$ values ('approved'::text, 'VINYL5'::text, 'percent'::text, 5::bigint, 1, true) $$,
  'marketing approves with a code: a 5% coupon, once per member'
);
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000af01' and event = 'affiliate_approved'),
  1, 'the owner is told'
);

-- ── Earning ────────────────────────────────────────────────────────────────

-- B's order with the code: a record (music, 8%) of 100,000 with 5,000 off.
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, discount, discount_source, coupon_id, shipping_address)
select '9af00000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000af05', 'shipped',
  100000, 0, 95000, 5000, 'coupon', a.coupon_id, '{}'
from public.affiliates a where a.organization_id = '9af00000-0000-0000-0000-0000000000a1';
insert into public.order_items (order_id, product_id, name_ar, name_en, unit_price, quantity)
select '9af00000-0000-0000-0000-0000000000b1', p.id, 'تسجيل', 'Record', 100000, 1
from public.products p where p.name_en = 'Kind of Blue';

update public.orders set status = 'delivered' where id = '9af00000-0000-0000-0000-0000000000b1';
select is(
  (select amount from public.affiliate_commissions where order_id = '9af00000-0000-0000-0000-0000000000b1'),
  7600::bigint, 'delivery earns 8% of what was paid for the record'
);
select ok(
  (select available_at > now() from public.affiliate_commissions where order_id = '9af00000-0000-0000-0000-0000000000b1'),
  'payable after the return window'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000af02');
select is(
  (select count(*)::integer from public.affiliate_commissions), 1,
  'members of the organization see its commissions'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000af05');
select is(
  (select count(*)::integer from public.affiliate_commissions), 0, 'others don''t'
);

-- ── Paying out ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000af04', 'aal2');
select throws_ok(
  $$ select public.record_affiliate_payout('9af00000-0000-0000-0000-0000000000a1', 'ZC-1') $$,
  '23514', null, 'nothing is paid below 25,000 IQD'
);

select pg_temp.reset_role();
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('9af00000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000af05', 'delivered', 400000, 0, 400000, '{}');
insert into public.affiliate_commissions (organization_id, order_id, amount, available_at) values
  ('9af00000-0000-0000-0000-0000000000a1', '9af00000-0000-0000-0000-0000000000b2', 30000, now() - interval '1 day');
update public.affiliate_commissions set available_at = now() - interval '1 day'
where order_id = '9af00000-0000-0000-0000-0000000000b1';

select pg_temp.login_as('00000000-0000-0000-0000-00000000af04', 'aal2');
select is(
  (select payable from public.affiliate_balances() where organization_id = '9af00000-0000-0000-0000-0000000000a1'),
  37600::bigint, 'finance sees what is payable'
);
select lives_ok(
  $$ select public.record_affiliate_payout('9af00000-0000-0000-0000-0000000000a1', 'ZC-42') $$,
  'and records the payout'
);
select pg_temp.reset_role();
select results_eq(
  $$ select amount, method, reference from public.affiliate_payouts
     where organization_id = '9af00000-0000-0000-0000-0000000000a1' $$,
  $$ values (37600::bigint, 'zaincash'::text, 'ZC-42'::text) $$,
  'to the method the organization chose'
);

-- ── A refund after payout ──────────────────────────────────────────────────

update public.orders set status = 'refunded' where id = '9af00000-0000-0000-0000-0000000000b1';
select is(
  (select amount from public.affiliate_commissions
   where order_id = '9af00000-0000-0000-0000-0000000000b1' and clawback_of is not null),
  -7600::bigint, 'a refunded order claws the paid commission back from the next payout'
);

-- ── Suspending ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000af03', 'aal2');
select public.decide_affiliate('9af00000-0000-0000-0000-0000000000a1', 'suspended', null, 'Spam');
select pg_temp.reset_role();
select is(
  (select c.active from public.coupons c join public.affiliates a on a.coupon_id = c.id
   where a.organization_id = '9af00000-0000-0000-0000-0000000000a1'),
  false, 'suspending turns the code off'
);

select * from finish();
rollback;
