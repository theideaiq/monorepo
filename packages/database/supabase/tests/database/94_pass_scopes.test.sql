-- Sign in with The IDEA Pass: every scope, the kept university email, refresh tokens.
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

-- A is an adult AUIB student with an order and a WhatsApp number.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000941', 'a41@example.iq', now());
update public.profiles set full_name = 'Sara Ahmed', birthday = date '2001-05-06',
  whatsapp_phone = '+9647701234567', avatar_url = 'https://cdn.example/a.png'
where id = '00000000-0000-0000-0000-000000000941';
insert into public.pass_partners (client_id, name, website, redirect_uris, answers, secret_hash)
values ('pass_00000000000000000000sal4', 'SAL', 'https://auibsal.org', '{https://auibsal.org/auth/pass}',
  '{profile,email,membership,student,student_email,adult,plus,phone,birthdate,address,card,offline_access}', repeat('b', 64));
insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
values ('00000000-0000-0000-0000-000000000941', 'pending', 1000, 0, 1000, 0,
  '{"full_name":"Sara","phone":"0770","address":"Street 5, House 10","city":"Karrada","governorate":"baghdad","notes":""}',
  'delivery', 'cash_on_delivery');

-- ── What partners may ask ──
select throws_ok(
  $$ update public.pass_partners set answers = '{orders}' where client_id = 'pass_00000000000000000000sal4' $$,
  '23514', null, 'only the known scopes'
);

-- ── The university email is kept when it's verified ──
create temporary table issued as
select public.issue_student_code('00000000-0000-0000-0000-000000000941', 'auib', 'Sara@AUIB.edu.iq') as code;
grant select on issued to authenticated;
select pg_temp.login_as('00000000-0000-0000-0000-000000000941');
select is((public.confirm_student_email((select code from issued))).university_email, 'sara@auib.edu.iq',
  'confirming keeps the university email');
select is((select university_email from public.student_badges), 'sara@auib.edu.iq', 'the student sees it');

-- ── Consent to some of it ──
create temporary table codes (code text);
grant all on codes to authenticated;
insert into codes select public.approve_pass_sign_in('pass_00000000000000000000sal4', 'https://auibsal.org/auth/pass',
  '{openid,profile,email,membership,student,student_email,plus,phone,birthdate,address,offline_access}', repeat('x', 43));
select pg_temp.reset_role();
create temporary table claimed as
select public.pass_claims('00000000-0000-0000-0000-000000000941', 'pass_00000000000000000000sal4',
  '{openid,profile,email,membership,student,student_email,plus,phone,birthdate,address,offline_access}') as c;
select results_eq(
  $$ select c ->> 'student_email', c ->> 'student_email_verified', c -> 'student' ->> 'university' from claimed $$,
  $$ values ('sara@auib.edu.iq', 'true', 'auib') $$,
  'student and university email'
);
select results_eq(
  $$ select c ->> 'picture', c ->> 'member_number' is not null, c ->> 'member_since' is not null from claimed $$,
  $$ values ('https://cdn.example/a.png', true, true) $$,
  'picture and membership'
);
select results_eq(
  $$ select c ->> 'phone_number', c ->> 'phone_number_verified', c ->> 'birthdate' from claimed $$,
  $$ values ('+9647701234567', 'false', '2001-05-06') $$,
  'phone and date of birth'
);
select results_eq(
  $$ select c -> 'address' ->> 'street_address', c -> 'address' ->> 'locality', c -> 'address' ->> 'country' from claimed $$,
  $$ values ('Street 5, House 10', 'Karrada', 'IQ') $$,
  'the latest delivery address'
);
select results_eq(
  $$ select c ->> 'plus', c ? 'plus_plan' from claimed $$,
  $$ values ('false', false) $$,
  'not a Plus member: no plan'
);
select is(
  (select public.pass_claims('00000000-0000-0000-0000-000000000941', 'pass_00000000000000000000sal4', '{openid,student}')
    - 'sub' - 'student'),
  '{}'::jsonb, 'nothing beyond what was shared'
);

-- ── Refresh tokens ──
insert into public.pass_refresh_tokens (token_hash, client_id, user_id, scopes)
values (repeat('e', 64), 'pass_00000000000000000000sal4', '00000000-0000-0000-0000-000000000941', '{openid,offline_access}');
select is((select expires_at - created_at from public.pass_refresh_tokens), interval '90 days', 'refresh tokens last 90 days');
select pg_temp.login_as('00000000-0000-0000-0000-000000000941');
select throws_ok($$ select * from public.pass_refresh_tokens $$, '42501', null, 'refresh tokens are the API''s only');
select public.disconnect_pass_partner('pass_00000000000000000000sal4');
select pg_temp.reset_role();
select is((select count(*) from public.pass_refresh_tokens), 0::bigint, 'disconnecting ends refresh tokens');

-- ── A badge from a card photo has no email ──
update public.student_badges set university_email = null where user_id = '00000000-0000-0000-0000-000000000941';
insert into public.pass_connections (user_id, client_id, scopes)
values ('00000000-0000-0000-0000-000000000941', 'pass_00000000000000000000sal4', '{student_email}');
select ok(not (public.pass_claims('00000000-0000-0000-0000-000000000941', 'pass_00000000000000000000sal4', '{student_email}') ? 'student_email'),
  'no university email on file: none shared');
select ok(public.pass_claims('00000000-0000-0000-0000-000000000941', 'pass_00000000000000000000sal4', '{student}') -> 'student' ->> 'verified' = 'true',
  'still a verified student');

select * from finish();
rollback;
