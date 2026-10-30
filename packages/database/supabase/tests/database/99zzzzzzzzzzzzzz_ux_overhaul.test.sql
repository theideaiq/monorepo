-- The UX overhaul: Plus availability in words, Staff's Demand view, and
-- Family (kids' profiles, a teen's requests to their guardian).
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

truncate public.products, public.orders, public.rentals, public.family_profiles, public.family_requests cascade;
delete from public.staff;

-- M is a Plus member and guardian of T (15); K is a kid's profile in M's
-- Pass; S is support; X has no Plus.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f0001', 'm-ux@example.iq'),
  ('00000000-0000-0000-0000-0000000f0002', 't-ux@example.iq'),
  ('00000000-0000-0000-0000-0000000f0003', 's-ux@example.iq'),
  ('00000000-0000-0000-0000-0000000f0004', 'x-ux@example.iq');
update public.profiles set birthday = date '1985-05-05' where id in (
  '00000000-0000-0000-0000-0000000f0001', '00000000-0000-0000-0000-0000000f0003', '00000000-0000-0000-0000-0000000f0004');
update public.profiles set birthday = (now() at time zone 'Asia/Baghdad')::date - interval '15 years', full_name = 'Taha'
where id = '00000000-0000-0000-0000-0000000f0002';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000f0003', 'support');
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000f0001', 'plus-blaze', 'active', 'wayl', now(), now() + interval '30 days');
insert into public.guardian_links (teen_id, guardian_id, status, accepted_at)
values ('00000000-0000-0000-0000-0000000f0002', '00000000-0000-0000-0000-0000000f0001', 'active', now());

insert into public.products (id, slug, name_ar, name_en, price, status, category_id, images, age_rating) values
  ('9f100000-0000-0000-0000-000000000001', 'ux-now', 'متوفر', 'Now', 39750, 'active', '50000000-0000-0000-0000-000000000001', '{a.jpg}', 7),
  ('9f100000-0000-0000-0000-000000000002', 'ux-out', 'خارج', 'Out', 39750, 'active', '50000000-0000-0000-0000-000000000001', '{b.jpg}', 12),
  ('9f100000-0000-0000-0000-000000000003', 'ux-none', 'قريبًا', 'None', 39750, 'active', '50000000-0000-0000-0000-000000000001', '{c.jpg}', 18),
  ('9f100000-0000-0000-0000-000000000004', 'ux-album', 'ألبوم', 'Album', 24750, 'active', '50000000-0000-0000-0000-000000000005', '{d.jpg}', null);
insert into public.stock_items (product_id, condition, purpose, status) values
  ('9f100000-0000-0000-0000-000000000001', 'used', 'rental', 'available'),
  ('9f100000-0000-0000-0000-000000000002', 'used', 'rental', 'rented');

-- ── Availability ──
select pg_temp.login_anon();
select results_eq(
  $$ select public.plus_availability(id) from public.products where slug in ('ux-now', 'ux-out', 'ux-none', 'ux-album') order by slug $$,
  $$ values (null::text), ('coming'), ('now'), ('short') $$,
  'Available now, Short wait, Coming to Plus; nothing for what is not in Plus'
);
select pg_temp.reset_role();
insert into public.rental_queue_items (user_id, product_id, position) values
  ('00000000-0000-0000-0000-0000000f0001', '9f100000-0000-0000-0000-000000000002', 1),
  ('00000000-0000-0000-0000-0000000f0004', '9f100000-0000-0000-0000-000000000002', 1);
select is(
  public.plus_availability('9f100000-0000-0000-0000-000000000002'), 'long',
  'more people queued than copies is a long wait'
);
delete from public.rental_queue_items;

-- ── Demand ──
insert into public.rental_queue_items (user_id, product_id, position) values
  ('00000000-0000-0000-0000-0000000f0001', '9f100000-0000-0000-0000-000000000003', 1),
  ('00000000-0000-0000-0000-0000000f0004', '9f100000-0000-0000-0000-000000000003', 1),
  ('00000000-0000-0000-0000-0000000f0003', '9f100000-0000-0000-0000-000000000003', 1),
  ('00000000-0000-0000-0000-0000000f0001', '9f100000-0000-0000-0000-000000000001', 2);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0004');
select throws_ok($$ select * from public.staff_plus_demand() $$, '42501', 'Staff only', 'Demand is for staff');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0003', 'aal2');
select results_eq(
  $$ select slug, queued, copies, available, rented_out, suggested from public.staff_plus_demand() $$,
  $$ values ('ux-none', 3, 0, 0, 0, 1), ('ux-now', 1, 1, 1, 0, 0) $$,
  'queued products with their copies and how many to buy, most needed first'
);
select pg_temp.reset_role();
delete from public.rental_queue_items;

-- ── Kids' profiles ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select lives_ok(
  $$ select public.add_family_profile('Ali', ((now() at time zone 'Asia/Baghdad')::date - interval '8 years')::date) $$,
  'a manager adds a kid under 13'
);
select throws_ok(
  $$ select public.add_family_profile('Sara', ((now() at time zone 'Asia/Baghdad')::date - interval '14 years')::date) $$,
  '23514', 'Kids'' profiles are for under 13s; teens use their own Pass',
  'teens use their own Pass'
);
select lives_ok(
  $$ select public.queue_add_for_profile('9f100000-0000-0000-0000-000000000001',
       (select id from public.family_profiles where name = 'Ali')) $$,
  'the manager queues a PEGI 7 game for Ali'
);
select is(
  (select for_profile from public.rental_queue_items where product_id = '9f100000-0000-0000-0000-000000000001'),
  (select id from public.family_profiles where name = 'Ali'),
  'marked for Ali'
);
select throws_ok(
  $$ select public.queue_add_for_profile('9f100000-0000-0000-0000-000000000002',
       (select id from public.family_profiles where name = 'Ali')) $$,
  '23514', 'Not for this age', 'not a PEGI 12 game for an 8-year-old'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0004');
select is_empty($$ select 1 from public.family_profiles $$, 'nobody else sees the profiles');

-- ── A teen asks ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0002');
select throws_ok(
  $$ select public.ask_family('9f100000-0000-0000-0000-000000000003') $$,
  '23514', 'Not available under 18', 'never an 18+ item'
);
select isnt(public.ask_family('9f100000-0000-0000-0000-000000000002'), null, 'a teen asks their guardian');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0001');
select lives_ok(
  $$ select public.decide_family_request((select id from public.family_requests limit 1), true) $$,
  'the guardian approves'
);
select is(
  (select for_user from public.rental_queue_items where product_id = '9f100000-0000-0000-0000-000000000002'),
  '00000000-0000-0000-0000-0000000f0002'::uuid,
  'it joins the guardian''s queue for the teen'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f0004');
select throws_ok(
  $$ select public.ask_family('9f100000-0000-0000-0000-000000000002') $$,
  '42501', 'Ask a guardian to link with your Pass first', 'only a linked teen asks'
);

select * from finish();
rollback;
