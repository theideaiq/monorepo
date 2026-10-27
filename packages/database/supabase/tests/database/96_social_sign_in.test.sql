-- Signing in with Google: a university Google account verifies the student.
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

select plan(6);

-- A signs in with an AUIB Google Workspace account, B with Gmail, C with a
-- university address Google doesn't vouch for (no hd).
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000961', 'sara@auib.edu.iq', now()),
  ('00000000-0000-0000-0000-000000000962', 'basim@gmail.com', now()),
  ('00000000-0000-0000-0000-000000000963', 'omar@auib.edu.iq', now());
insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) values
  ('g-961', '00000000-0000-0000-0000-000000000961',
   '{"sub":"g-961","email":"Sara@auib.edu.iq","email_verified":true,"custom_claims":{"hd":"auib.edu.iq"}}', 'google', now(), now(), now()),
  ('g-962', '00000000-0000-0000-0000-000000000962',
   '{"sub":"g-962","email":"basim@gmail.com","email_verified":true}', 'google', now(), now(), now()),
  ('g-963', '00000000-0000-0000-0000-000000000963',
   '{"sub":"g-963","email":"omar@auib.edu.iq","email_verified":true}', 'google', now(), now(), now());

select pg_temp.login_as('00000000-0000-0000-0000-000000000961');
select results_eq(
  $$ select university_id, method, university_email from public.claim_student_from_identity() $$,
  $$ values ('auib'::text, 'email'::text, 'sara@auib.edu.iq'::text) $$,
  'a university Workspace account verifies the student'
);
select ok((select valid_until >= private.baghdad_today() from public.student_badges), 'until the academic year ends');
select is((public.claim_student_from_identity()).user_id, null, 'a current badge is kept as it is');

select pg_temp.login_as('00000000-0000-0000-0000-000000000962');
select is((public.claim_student_from_identity()).user_id, null, 'Gmail verifies nothing');

select pg_temp.login_as('00000000-0000-0000-0000-000000000963');
select is((public.claim_student_from_identity()).user_id, null, 'a university address without Google''s hd claim doesn''t count');

select pg_temp.login_anon();
select throws_ok($$ select public.claim_student_from_identity() $$, '42501', null, 'signed out: nothing');

select * from finish();
rollback;
