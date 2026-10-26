-- Invite friends: codes, claiming an invite, the first-order discount and the inviter's reward.
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

select plan(15);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- I invites F; G shares I's phone number; O already ordered before.
truncate public.products, public.orders, public.bulb_entries, public.referrals cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'ri@example.iq', '{"full_name":"Inviter Ilham"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'rf@example.iq', '{"full_name":"Friend F"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'rg@example.iq', '{"full_name":"Same Phone G"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'ro@example.iq', '{"full_name":"Old O"}');

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('68000000-0000-0000-0000-000000000001', 'invite-switch', 'سويتش', 'Switch', 200000, 20, 'active', 'sale'),
  ('68000000-0000-0000-0000-000000000002', 'invite-pin', 'دبوس', 'Pin', 50000, 20, 'active', 'sale');

update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set free_from = null, plus_free_delivery = false;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

-- I once ordered to +9647700000401; O has a paid order.
insert into public.orders (user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('00000000-0000-0000-0000-0000000000c1', 'delivered', 1000, 0, 1000, '{"phone":"+9647700000401","address":"Karrada 1"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'paid', 1000, 0, 1000, '{"phone":"+9647700000404","address":"Old street"}');

-- Members read only their own code (my_invites); the fixtures note all.
create temporary table codes as
  select id, invite_code from public.profiles where id::text like '00000000-0000-0000-0000-0000000000c%';
grant select on codes to public;

-- ── Codes ───────────────────────────────────────────────────────────────────

select ok(
  (select bool_and(invite_code ~ '^[a-z0-9]{8}$') from public.profiles
   where id::text like '00000000-0000-0000-0000-0000000000c%'),
  'every member has an invite code'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
select throws_ok($$ select public.claim_invite('nope-nope') $$, '23514', 'Invalid invite', 'unknown codes are refused');
select throws_ok(
  $$ select public.claim_invite((select invite_code from codes where id = auth.uid())) $$,
  '23514', 'Invalid invite', 'members cannot invite themselves'
);
select is(
  public.claim_invite((select invite_code from codes where id = '00000000-0000-0000-0000-0000000000c1')),
  'Inviter', 'a new member joins through an invite and sees who invited them'
);
select throws_ok(
  $$ select public.claim_invite((select invite_code from codes where id = '00000000-0000-0000-0000-0000000000c3')) $$,
  '23514', 'Invites are for new members', 'a member is invited once'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c4');
select throws_ok(
  $$ select public.claim_invite((select invite_code from codes where id = '00000000-0000-0000-0000-0000000000c1')) $$,
  '23514', 'Invites are for new members', 'members who already ordered cannot use an invite'
);

-- ── The friend's first order ────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
insert into public.cart_items (product_id, quantity) values ('68000000-0000-0000-0000-000000000001', 1);
select public.create_order('{"full_name":"F","phone":"+9647700000402","governorate":"baghdad","address":"Mansour 2"}');
select results_eq(
  $$ select discount, discount_source, total from public.orders where user_id = auth.uid() $$,
  $$ values (15000::bigint, 'invite', 190000::bigint) $$,
  'the first order gets 10% off, at most 15,000 IQD'
);

insert into public.cart_items (product_id, quantity) values ('68000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"F","phone":"+9647700000402","governorate":"baghdad","address":"Mansour 2"}');
select is(
  (select discount from public.orders where user_id = auth.uid() order by number desc limit 1),
  0::bigint, 'only one order gets the invite discount'
);

-- ── The inviter's reward ────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.orders set status = 'delivered'
where user_id = '00000000-0000-0000-0000-0000000000c2' and discount_source = 'invite';
select results_eq(
  $$ select amount, status::text from public.bulb_entries
     where user_id = '00000000-0000-0000-0000-0000000000c1' and reason = 'invite' $$,
  $$ values (50, 'pending') $$,
  'the inviter earns 50 Bulbs, pending through the return window'
);
select is(
  (select status::text from public.referrals where invitee_id = '00000000-0000-0000-0000-0000000000c2'),
  'rewarded', 'the invite is marked rewarded'
);

update public.orders set status = 'refunded'
where user_id = '00000000-0000-0000-0000-0000000000c2' and discount_source = 'invite';
select is(
  (select status::text from public.bulb_entries
   where user_id = '00000000-0000-0000-0000-0000000000c1' and reason = 'invite'),
  'void', 'a refund takes the reward back'
);

-- G claims I's invite and orders to I's phone number: no reward.
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c3');
select public.claim_invite((select invite_code from codes where id = '00000000-0000-0000-0000-0000000000c1'));
insert into public.cart_items (product_id, quantity) values ('68000000-0000-0000-0000-000000000002', 1);
select public.create_order('{"full_name":"G","phone":"+9647700000401","governorate":"baghdad","address":"Elsewhere"}');
select pg_temp.reset_role();
update public.orders set status = 'delivered' where user_id = '00000000-0000-0000-0000-0000000000c3';
select is(
  (select status::text from public.referrals where invitee_id = '00000000-0000-0000-0000-0000000000c3'),
  'void', 'no reward when the friend''s order shares the inviter''s phone'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select ok(
  (select code = (select invite_code from codes where id = auth.uid()) from public.my_invites()),
  'members read their own invite code'
);
select results_eq(
  $$ select invited, rewarded from public.my_invites() $$,
  $$ values (2::bigint, 1::bigint) $$,
  'members see how their invites are doing'
);
select is(
  (select count(*)::int from public.referrals),
  2, 'inviters see the referrals they made'
);

select * from finish();
rollback;
