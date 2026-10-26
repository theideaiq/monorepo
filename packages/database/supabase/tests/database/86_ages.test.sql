-- Program revision v1, step 4: ages, guardians and PEGI 18.
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
select plan(24);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- T is 15, G (T's guardian) is 40, Y is 16, K is 12 (no birthday yet).
truncate public.products, public.orders, public.bulb_entries cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000861', 'teen@example.iq', '{"full_name":"Teen Tamara"}'),
  ('00000000-0000-0000-0000-000000000862', 'guardian@example.iq', '{"full_name":"Guardian Ghada"}'),
  ('00000000-0000-0000-0000-000000000863', 'young@example.iq', '{"full_name":"Young Yusuf"}'),
  ('00000000-0000-0000-0000-000000000864', 'kid@example.iq', '{"full_name":"Kid Karim"}');
update public.profiles set birthday = (now() at time zone 'Asia/Baghdad')::date - interval '15 years'
where id = '00000000-0000-0000-0000-000000000861';
update public.profiles set birthday = date '1986-05-01' where id = '00000000-0000-0000-0000-000000000862';
update public.profiles set birthday = (now() at time zone 'Asia/Baghdad')::date - interval '16 years'
where id = '00000000-0000-0000-0000-000000000863';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, age_rating) values
  ('86000000-0000-0000-0000-000000000001', 'ages-family', 'عائلية', 'Family game', 59750, 5, 'active', 'sale', 3),
  ('86000000-0000-0000-0000-000000000002', 'ages-mature', 'للكبار', 'Mature game', 59750, 5, 'active', 'sale', 18);

update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

-- ── Birthdays ───────────────────────────────────────────────────────────────

select throws_ok(
  $$ update public.profiles set birthday = (now() at time zone 'Asia/Baghdad')::date - interval '12 years'
     where id = '00000000-0000-0000-0000-000000000864' $$,
  '23514', 'The IDEA Pass is for people aged 13 and over',
  'the Pass is for people aged 13 and over'
);

-- ── PEGI 18 ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select results_eq(
  $$ select slug from public.products where slug like 'ages-%' order by slug $$,
  $$ values ('ages-family') $$,
  'PEGI 18 products are hidden from under-18 Passes'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select results_eq(
  $$ select slug from public.products where slug like 'ages-%' order by slug $$,
  $$ values ('ages-family'), ('ages-mature') $$,
  'adults see them'
);
select pg_temp.login_anon();
select is(
  (select count(*) from public.products where slug like 'ages-%')::integer, 2,
  'and so do visitors who are not signed in'
);

-- ── Guardians ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select throws_ok(
  $$ select public.invite_guardian() $$,
  '23514', 'Only members under 18 link a guardian',
  'adults don''t invite guardians'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
insert into public.cart_items (product_id, quantity) values ('86000000-0000-0000-0000-000000000001', 1);
select throws_ok(
  $$ select public.create_order('{"full_name":"T","phone":"+9647700000861","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online') $$,
  '23514', 'A guardian must approve your orders',
  'a teen without a guardian can''t order'
);

create temporary table invite (code text) on commit drop;
grant all on invite to authenticated;
insert into invite select public.invite_guardian();
select ok((select length(code) = 10 from invite), 'a teen gets an invite code for a guardian');
select results_eq(
  $$ select minor, has_birthday, status, guardian_name from public.my_guardian() $$,
  $$ values (true, true, 'invited', null::text) $$,
  'the teen sees the invite waiting'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000863');
select throws_ok(
  $$ select public.accept_guardian((select code from invite)) $$,
  '23514', 'A guardian must be 18 or over',
  'a guardian must be 18 or over'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select results_eq(
  $$ select teen_name, status from public.guardian_invite((select code from invite)) $$,
  $$ values ('Teen', 'invited') $$,
  'the guardian sees whose invite it is'
);
select lives_ok(
  $$ select public.accept_guardian((select code from invite)) $$,
  'an adult accepts the invite'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select results_eq(
  $$ select status, guardian_name, allows_plus from public.my_guardian() $$,
  $$ values ('active', 'Guardian', false) $$,
  'the teen now has a guardian'
);

-- ── Orders wait for the guardian ────────────────────────────────────────────

select lives_ok(
  $$ select public.create_order('{"full_name":"T","phone":"+9647700000861","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery') $$,
  'with a guardian, a teen places an order'
);
select results_eq(
  $$ select status::text, guardian_status from public.orders order by number desc limit 1 $$,
  $$ values ('pending', 'pending') $$,
  'a cash order waits for the guardian instead of being confirmed'
);

select pg_temp.reset_role();
select throws_ok(
  $$ update public.orders set status = 'confirmed'
     where user_id = '00000000-0000-0000-0000-000000000861' $$,
  '23514', 'Waiting for the guardian''s approval',
  'nothing moves forward before the guardian approves'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select is(
  (select jsonb_array_length(pending_orders) from public.my_teens()), 1,
  'the guardian sees the order waiting'
);
select is(
  (select count(*) from public.notifications where event = 'guardian_order_request')::integer, 1,
  'and was told about it'
);
select lives_ok(
  $$ select public.decide_guardian_order((select (pending_orders -> 0 ->> 'id')::uuid from public.my_teens()), true) $$,
  'the guardian approves'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select results_eq(
  $$ select status::text, guardian_status from public.orders order by number desc limit 1 $$,
  $$ values ('confirmed', 'approved') $$,
  'an approved cash order is confirmed'
);

-- Declined orders are cancelled.
insert into public.cart_items (product_id, quantity) values ('86000000-0000-0000-0000-000000000001', 1);
select public.create_order('{"full_name":"T","phone":"+9647700000861","governorate":"baghdad","address":"Karrada"}',
  'delivery', 'online');
select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select public.decide_guardian_order((select (pending_orders -> 0 ->> 'id')::uuid from public.my_teens()), false);
select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select results_eq(
  $$ select status::text, guardian_status from public.orders order by number desc limit 1 $$,
  $$ values ('cancelled', 'declined') $$,
  'a declined order is cancelled'
);

-- PEGI 18 can't be ordered even if it reaches the cart.
select pg_temp.reset_role();
insert into public.cart_items (user_id, product_id, quantity)
values ('00000000-0000-0000-0000-000000000861', '86000000-0000-0000-0000-000000000002', 1);
select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select throws_ok(
  $$ select public.create_order('{"full_name":"T","phone":"+9647700000861","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'online') $$,
  '23514', 'Not available under 18',
  'teens can''t order PEGI 18 items'
);

-- ── 18+ actions ─────────────────────────────────────────────────────────────

select throws_ok(
  $$ select public.apply_affiliate('My channel') $$,
  '23514', 'You need to be 18 or over',
  'affiliates are 18+'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000862');
select lives_ok(
  $$ select public.set_guardian_plus((select link_id from public.my_teens()), true) $$,
  'the guardian allows The IDEA Plus'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000861');
select is((select allows_plus from public.my_guardian()), true, 'the teen may join The IDEA Plus');

select * from finish();
rollback;
