-- Sign in with The IDEA Pass: partners, consent, codes, claims, disconnecting.
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

select plan(29);

-- A is an adult AUIB student, B an adult with a Pass, S is support.
delete from public.staff;
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000931', 'a@example.iq', now()),
  ('00000000-0000-0000-0000-000000000932', 'b@example.iq', now()),
  ('00000000-0000-0000-0000-000000000933', 's@example.iq', now());
update public.profiles set full_name = 'Sara Ahmed Ali', birthday = date '2000-01-01', locale = 'ar'
where id = '00000000-0000-0000-0000-000000000931';
update public.profiles set full_name = 'Basim', birthday = date '1990-01-01'
where id = '00000000-0000-0000-0000-000000000932';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000933', 'support');
insert into public.student_badges (user_id, university_id, valid_until, method) values
  ('00000000-0000-0000-0000-000000000931', 'auib', private.baghdad_today() + 100, 'email');

-- ── Partners ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000932');
select throws_ok(
  $$ insert into public.pass_partners (client_id, name, website, redirect_uris, secret_hash)
     values ('pass_aaaaaaaaaaaaaaaaaaaaaaaa', 'Not me', 'https://x.org', '{https://x.org/cb}', repeat('a', 64)) $$,
  '42501', null, 'members can''t add partners'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000933', 'aal2');
select lives_ok(
  $$ insert into public.pass_partners (client_id, name, website, redirect_uris, answers, secret_hash)
     values ('pass_00000000000000000000sal1', 'AUIB SAL', 'https://auibsal.org',
       '{https://auibsal.org/auth/pass,https://auibsal.org/ar/auth/pass,http://localhost:3000/auth/pass}',
       '{profile,email,student,adult}', repeat('b', 64)) $$,
  'support adds a partner'
);
select throws_ok(
  $$ insert into public.pass_partners (client_id, name, website, redirect_uris, secret_hash)
     values ('pass_00000000000000000000bad1', 'Bad', 'https://bad.org', '{http://bad.org/cb}', repeat('c', 64)) $$,
  '23514', null, 'return addresses must be https (or localhost)'
);
select throws_ok(
  $$ select secret_hash from public.pass_partners $$,
  '42501', null, 'nobody reads the secret''s hash back'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000931');
select is((select name from public.pass_partners where client_id = 'pass_00000000000000000000sal1'), 'AUIB SAL',
  'members see active partners (for the consent screen)');

-- ── Consent ──
select throws_ok(
  $$ select public.approve_pass_sign_in('pass_00000000000000000000sal1', 'https://evil.org/cb', '{openid,email}', repeat('x', 43)) $$,
  'P0002', 'Unknown site', 'only a registered return address'
);
select throws_ok(
  $$ select public.approve_pass_sign_in('pass_00000000000000000000sal1', 'https://auibsal.org/auth/pass', '{openid,plus}', repeat('x', 43)) $$,
  '23514', 'Invalid request', 'only what the partner may ask'
);
select throws_ok(
  $$ select public.approve_pass_sign_in('pass_00000000000000000000sal1', 'https://auibsal.org/auth/pass', '{email}', repeat('x', 43)) $$,
  '23514', 'Invalid request', 'openid is required'
);

create temporary table codes (code text);
grant all on codes to authenticated;
insert into codes select public.approve_pass_sign_in('pass_00000000000000000000sal1', 'https://auibsal.org/auth/pass',
  '{openid,email,profile,student,adult}', repeat('x', 43), 'n-1');
select matches((select code from codes), '^[0-9a-f]{64}$', 'allowing returns a code');
select results_eq(
  $$ select scopes from public.pass_connections where client_id = 'pass_00000000000000000000sal1' $$,
  $$ values ('{adult,email,profile,student}'::text[]) $$,
  'and remembers what was shared'
);
select throws_ok($$ select * from public.pass_sign_in_codes $$, '42501', null, 'codes are the API''s only');
select throws_ok($$ select public.pass_claims('00000000-0000-0000-0000-000000000931', 'pass_00000000000000000000sal1', '{email}') $$,
  '42501', null, 'members can''t read claims directly');

-- ── Claims (as the API) ──
select pg_temp.reset_role();
select is(
  (select code_hash from public.pass_sign_in_codes),
  encode(sha256(convert_to((select code from codes), 'UTF8')), 'hex'),
  'only the code''s hash is stored'
);
select is(
  (select redirect_uri || ' ' || nonce || ' ' || (expires_at - created_at)::text from public.pass_sign_in_codes),
  'https://auibsal.org/auth/pass n-1 00:05:00', 'the code keeps the request and lasts 5 minutes'
);

create temporary table claimed as
select public.pass_claims('00000000-0000-0000-0000-000000000931', 'pass_00000000000000000000sal1',
  '{openid,email,profile,student,adult}') as c;
select is((select c ->> 'sub' from claimed), (select subject::text from public.pass_connections where client_id = 'pass_00000000000000000000sal1'),
  'sub is the partner''s own id for the person');
select isnt((select c ->> 'sub' from claimed), '00000000-0000-0000-0000-000000000931', 'not the Pass id');
select results_eq(
  $$ select c ->> 'given_name', c ->> 'family_name', c ->> 'email', c -> 'student' ->> 'university', c ->> 'adult' from claimed $$,
  $$ values ('Sara', 'Ahmed Ali', 'a@example.iq', 'auib', 'true') $$,
  'names, email and yes/no answers'
);
select is(
  (select public.pass_claims('00000000-0000-0000-0000-000000000931', 'pass_00000000000000000000sal1', '{openid}') - 'sub'),
  '{}'::jsonb, 'nothing beyond what was shared'
);

-- ── Card checks ──
select pg_temp.reset_role();
insert into private.pass_secrets (user_id, secret) values ('00000000-0000-0000-0000-000000000931', '\x0102030405060708090a0b0c0d0e0f1011121314');
create temporary table scan as
select 'IDEA:' || p.member_number || ':' || private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint) as code,
  'IDEA:' || p.member_number || ':' || lpad(((private.pass_code(s.secret, floor(extract(epoch from now()) / 30)::bigint)::int + 1) % 1000000)::text, 6, '0') as wrong
from public.profiles p join private.pass_secrets s on s.user_id = p.id
where p.id = '00000000-0000-0000-0000-000000000931';
create temporary table checked as select public.pass_card_check('pass_00000000000000000000sal1', (select code from scan)) as c;
select results_eq(
  $$ select c ->> 'valid', c ->> 'given_name', c -> 'student' ->> 'university', c ->> 'adult', c ? 'plus',
       c ->> 'sub' = (select subject::text from public.pass_connections where client_id = 'pass_00000000000000000000sal1')
     from checked $$,
  $$ values ('true', 'Sara', 'auib', 'true', false, true) $$,
  'a partner checks a current card: first name, the answers it may ask, its own id for them'
);
select is(public.pass_card_check('pass_00000000000000000000sal1', (select wrong from scan)) ->> 'valid', 'false',
  'a wrong code is not valid');
select is(public.pass_card_check('pass_00000000000000000000sal1', 'IDEA:1:000000') ->> 'valid', 'false',
  'nor an unknown card');
select is((select count(*) from public.pass_card_checks where valid and client_id = 'pass_00000000000000000000sal1'), 1::bigint, 'every check is logged');

select pg_temp.login_as('00000000-0000-0000-0000-000000000931');
select is((select count(*) from public.pass_card_checks), 1::bigint, 'the holder sees checks of their card');
select throws_ok($$ select public.pass_card_check('pass_00000000000000000000sal1', 'IDEA:1:000000') $$,
  '42501', null, 'only the API checks cards');

select pg_temp.reset_role();
insert into public.pass_card_checks (client_id, valid)
select 'pass_00000000000000000000sal1', false from generate_series(1, 30);
select throws_ok($$ select public.pass_card_check('pass_00000000000000000000sal1', (select code from scan)) $$,
  'P0001', 'Too many checks', '30 failed checks in 10 minutes pause the partner');

select results_eq(
  $$ select public.pass_card('00000000-0000-0000-0000-000000000931') ->> 'name',
       public.pass_card('00000000-0000-0000-0000-000000000931') ->> 'student' $$,
  $$ values ('Sara Ahmed Ali', 'true') $$,
  'the card for a partner''s site: name and badges'
);
select ok(not (public.pass_card('00000000-0000-0000-0000-000000000931') ? 'code'), 'and never the code');

-- ── Disconnecting ──
insert into public.pass_access_tokens (token_hash, client_id, user_id, scopes, expires_at)
values (repeat('d', 64), 'pass_00000000000000000000sal1', '00000000-0000-0000-0000-000000000931', '{openid}', now() + interval '1 hour');
select pg_temp.login_as('00000000-0000-0000-0000-000000000931');
select public.disconnect_pass_partner('pass_00000000000000000000sal1');
select pg_temp.reset_role();
select is((select count(*) from public.pass_access_tokens), 0::bigint, 'disconnecting ends the partner''s tokens');
select is(public.pass_claims('00000000-0000-0000-0000-000000000931', 'pass_00000000000000000000sal1', '{email}'), null,
  'and it learns nothing more');

select * from finish();
rollback;
