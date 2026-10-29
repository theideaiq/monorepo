-- /verify (The IDEA's student badge): bare Passes, verifying with the email the Pass
-- signed in with, deleting the status; the shared student check is gone.
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

-- A signs in on /verify with an AUIB address (a new Pass); B already has a
-- full Pass with a Gmail address; C keeps the badge; D runs a partner café.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000009a1', 'Sara@auib.edu.iq', now()),
  ('00000000-0000-0000-0000-0000000009a2', 'basim@gmail.com', now()),
  ('00000000-0000-0000-0000-0000000009a3', 'omar@uobaghdad.edu.iq', now()),
  ('00000000-0000-0000-0000-0000000009a4', 'cafe@example.iq', now());
update public.profiles set full_name = 'Basim Ali' where id = '00000000-0000-0000-0000-0000000009a2';
insert into public.organizations (id, name, slug, created_by) values
  ('9a000000-0000-0000-0000-0000000000c1', 'Bean Café', 'bean-cafe-9a', '00000000-0000-0000-0000-0000000009a4');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000009a4', 'owner');
insert into public.perks (organization_id, partner_name, kind, title_ar, title_en, audience) values
  ('9a000000-0000-0000-0000-0000000000c1', 'Bean Café', 'cafe', 'خصم ١٠٪', '10% off', 'students');

-- ── A bare Pass ──
select pg_temp.login_anon();
select throws_ok($$ select public.begin_student_check() $$, '42501', null, 'signed out: nothing');

select pg_temp.login_as('00000000-0000-0000-0000-0000000009a1');
select ok(public.begin_student_check(), 'a new Pass made on /verify is bare');
select results_eq(
  $$ select university_id, university_email from public.claim_student_from_email('auib') $$,
  $$ values ('auib'::text, 'sara@auib.edu.iq'::text) $$,
  'the university email it signed in with verifies the student'
);
select is((public.claim_student_from_email('uobaghdad')).user_id, null, 'another university''s domain doesn''t count');
select throws_ok(
  $$ update public.profiles set student_only = false where id = (select auth.uid()) $$,
  '42501', null, 'the student can''t change it themselves'
);
select ok(exists (select 1 from public.student_badges where user_id = (select auth.uid())), 'the badge stays');

select pg_temp.login_as('00000000-0000-0000-0000-0000000009a2');
select ok(not public.begin_student_check(), 'a full Pass stays full');
select is((public.claim_student_from_email('auib')).user_id, null, 'a Gmail address verifies nothing');

-- ── Becoming a full Pass ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000009a1');
update public.profiles set full_name = 'Sara Ahmed' where id = (select auth.uid());
select ok(not (select student_only from public.profiles where id = (select auth.uid())), 'setting a name makes it a full Pass');

-- ── Deleting the status ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000009a3');
select ok(public.begin_student_check(), 'C starts on /verify');
select is((public.claim_student_from_email('uobaghdad')).university_id, 'uobaghdad', 'C is verified');
select ok(public.forget_student_status(), 'deleting it says the Pass is bare, for the API to delete');
select pg_temp.reset_role();
select ok(not private.is_student('00000000-0000-0000-0000-0000000009a3'), 'the badge goes');

-- ── No shared check ──
select pg_temp.reset_role();
select ok(
  to_regclass('public.student_checks') is null and to_regprocedure('public.finish_student_check(boolean)') is null,
  'the shared student check is gone'
);

select * from finish();
rollback;
