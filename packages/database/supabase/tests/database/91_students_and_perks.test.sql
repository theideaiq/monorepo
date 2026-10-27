-- Program revision v1, step 5e: student verification (email, card), the student price and deposits, partner perks.
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

select plan(32);

-- A verifies by email, B by card, C is neither, S is support, P works at
-- the partner.
truncate public.products, public.orders, public.rentals cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000911', 'a@example.iq', '{"full_name":"Ali A"}'),
  ('00000000-0000-0000-0000-000000000912', 'b@example.iq', '{"full_name":"Bana B"}'),
  ('00000000-0000-0000-0000-000000000913', 'c@example.iq', '{"full_name":"Chro C"}'),
  ('00000000-0000-0000-0000-000000000914', 's@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-000000000915', 'p@example.iq', '{"full_name":"Partner P"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000914', 'support');

update public.store_settings set rental_deposit_rate = 50;
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('91000000-0000-0000-0000-000000000001', 'student-game', 'لعبة', 'Game', 59750, 3, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001');

create temporary table codes (code text);
grant all on codes to authenticated;

-- ── The academic year ──
select is(private.academic_year_end(date '2026-10-27'), date '2027-06-30', 'October counts to next June');
select is(private.academic_year_end(date '2027-03-01'), date '2027-06-30', 'March counts to this June');

-- ── Email ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000911');
select throws_ok(
  $$ select public.issue_student_code('00000000-0000-0000-0000-000000000911', 'auib', 'a@auib.edu.iq') $$,
  '42501', null, 'only the API issues codes'
);
select pg_temp.reset_role();
select throws_ok(
  $$ select public.issue_student_code('00000000-0000-0000-0000-000000000911', 'auib', 'a@gmail.com') $$,
  '23514', 'Use your university email', 'the address must be the university''s'
);
insert into codes select public.issue_student_code('00000000-0000-0000-0000-000000000911', 'auib', 'Ali@Student.AUIB.edu.iq');
select matches((select code from codes), '^[0-9]{8}$', 'a subdomain counts, and the code has 8 digits');

select pg_temp.login_as('00000000-0000-0000-0000-000000000911');
select throws_ok(
  $$ select public.confirm_student_email('00000000') $$,
  '23514', 'Wrong code', 'a wrong code is refused'
);
select lives_ok(
  $$ select public.confirm_student_email((select code from codes)) $$,
  'the right code verifies'
);
select results_eq(
  $$ select verified, university_id, valid_until from public.my_student() $$,
  $$ values (true, 'auib'::text, private.academic_year_end(private.baghdad_today())) $$,
  'student at AUIB until the end of the academic year'
);
select is(
  (select count(*)::integer from public.student_requests where user_id = '00000000-0000-0000-0000-000000000911' and email is not null),
  0, 'the address isn''t kept'
);
select pg_temp.reset_role();
select throws_ok(
  $$ select public.issue_student_code('00000000-0000-0000-0000-000000000913', 'auib', 'ali@student.auib.edu.iq') $$,
  '23514', 'This email already verified another Pass', 'one address verifies one Pass'
);

-- ── Deposits ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000911');
select is((select deposit from public.rental_quote('91000000-0000-0000-0000-000000000001')), 0::bigint,
  'a verified student rents without a deposit');
select pg_temp.login_as('00000000-0000-0000-0000-000000000913');
select is((select deposit from public.rental_quote('91000000-0000-0000-0000-000000000001')), 29750::bigint,
  'others pay the deposit');
select pg_temp.reset_role();
insert into public.orders (id, user_id, subtotal, total, shipping_address)
values ('91000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000911', 0, 0, '{}');
insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
values ('91000000-0000-0000-0000-0000000000d1', 'تأمين', 'Deposit', 0, 1, 'deposit');
select is((select count(*)::integer from public.order_items where order_id = '91000000-0000-0000-0000-0000000000d1'), 0,
  'a waived deposit leaves no order line');

-- ── Card ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000912');
select throws_ok(
  $$ select public.request_student_review('uobaghdad', 'someone-else/card.jpg') $$,
  '23514', 'Invalid photo', 'the photo must be the student''s own'
);
select lives_ok(
  $$ select public.request_student_review('uobaghdad', '00000000-0000-0000-0000-000000000912/card.jpg') $$,
  'a card photo goes to review'
);
select throws_ok(
  $$ select public.request_student_review('uobaghdad', '00000000-0000-0000-0000-000000000912/card2.jpg') $$,
  '23514', 'Your card is already waiting for review', 'one review at a time'
);
select throws_ok(
  $$ select public.review_student_card((select id from public.student_requests where method = 'card'), true) $$,
  '42501', 'Not allowed', 'students don''t review cards'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000914', 'aal2');
select is(
  public.review_student_card((select id from public.student_requests where method = 'card'), true),
  '00000000-0000-0000-0000-000000000912/card.jpg',
  'support approves and gets the photo to delete'
);
select pg_temp.reset_role();
select ok(
  private.is_student('00000000-0000-0000-0000-000000000912')
  and (select card_path is null from public.student_requests where method = 'card'),
  'the badge is given and the photo''s path is gone'
);
select is(
  (select event from public.notifications where user_id = '00000000-0000-0000-0000-000000000912' order by created_at desc limit 1),
  'student_verified', 'the student is told'
);

-- ── The student price ──
select throws_ok(
  $$ insert into public.subscriptions (user_id, plan_id, status, provider)
     values ('00000000-0000-0000-0000-000000000913', 'plus-glow-student', 'active', 'wayl') $$,
  '23514', 'The student price needs a verified student badge', 'only students get the student price'
);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000913', 'plus-glow', 'active', 'wayl', now(), now() + interval '30 days');
select throws_ok(
  $$ update public.subscriptions set next_plan_id = 'plus-shine-student'
     where user_id = '00000000-0000-0000-0000-000000000913' $$,
  '23514', 'The student price needs a verified student badge', 'nor change to it'
);
update public.subscriptions set plan_id = 'plus-glow-student' where user_id = '00000000-0000-0000-0000-000000000913';
select is(
  (select plan_id from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000913'),
  'plus-glow', 'a renewal onto the student price without a badge takes the full price'
);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000912', 'plus-glow-student', 'active', 'wayl', now(), now() + interval '30 days');
update public.student_badges set valid_until = private.baghdad_today() - 1
where user_id = '00000000-0000-0000-0000-000000000912';
select is(public.run_student_expiry(), 1, 'a badge that ended moves the plan');
select is(
  (select next_plan_id from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000912'),
  'plus-glow', 'to the full price at the next renewal'
);

-- ── Perks ──
insert into public.organizations (id, name, slug, created_by) values
  ('91000000-0000-0000-0000-0000000000c1', 'Bean Café', 'bean-cafe', '00000000-0000-0000-0000-000000000915');
insert into public.memberships (organization_id, user_id, role) values
  ('91000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000915', 'owner');
insert into public.perks (id, organization_id, partner_name, kind, title_ar, title_en, audience) values
  ('91000000-0000-0000-0000-0000000000e1', '91000000-0000-0000-0000-0000000000c1', 'Bean Café', 'cafe',
   'خصم ١٠٪', '10% off', 'students');
insert into public.perks (organization_id, partner_name, title_ar, title_en, active) values
  ('91000000-0000-0000-0000-0000000000c1', 'Bean Café', 'قديم', 'Old', false);
insert into private.pass_secrets (user_id) values
  ('00000000-0000-0000-0000-000000000911'), ('00000000-0000-0000-0000-000000000913');
create temporary table cards as
  select p.id, 'IDEA:' || p.member_number || ':' || private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint) as code
  from public.profiles p join private.pass_secrets s on s.user_id = p.id;
grant select on cards to authenticated;

select pg_temp.login_anon();
select is((select count(*)::integer from public.perks), 1, 'visitors see the perks on offer');

select pg_temp.login_as('00000000-0000-0000-0000-000000000913');
select throws_ok(
  $$ select public.partner_check('91000000-0000-0000-0000-0000000000c1', 'IDEA:1:000000') $$,
  '42501', 'Not allowed', 'only the partner''s team checks cards'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000915');
select is(
  (select public.partner_check('91000000-0000-0000-0000-0000000000c1',
     (select code from cards where id = '00000000-0000-0000-0000-000000000911')) -> 'perks' -> 0 ->> 'open'),
  'true', 'a student''s card opens the student perk'
);
select lives_ok(
  $$ select public.redeem_perk('91000000-0000-0000-0000-0000000000e1',
       (select code from cards where id = '00000000-0000-0000-0000-000000000911')) $$,
  'the partner records the use'
);
select throws_ok(
  $$ select public.redeem_perk('91000000-0000-0000-0000-0000000000e1',
       (select code from cards where id = '00000000-0000-0000-0000-000000000911')) $$,
  '23514', 'Already used today', 'once a day per person'
);
select throws_ok(
  $$ select public.redeem_perk('91000000-0000-0000-0000-0000000000e1',
       (select code from cards where id = '00000000-0000-0000-0000-000000000913')) $$,
  '23514', 'This perk isn''t open to them', 'a student perk needs a student'
);
select results_eq(
  $$ select uses, people from public.perk_stats('91000000-0000-0000-0000-0000000000c1') $$,
  $$ values (1::bigint, 1::bigint) $$,
  'the partner sees the month''s count'
);

select * from finish();
rollback;
