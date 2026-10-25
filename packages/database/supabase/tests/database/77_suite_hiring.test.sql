-- The IDEA Suite hiring: job requests, candidates, decisions and CVs.
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
-- O owns the company, M is a member, X is outside it, S is support.
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000077a1', 'ho@example.iq', '{"full_name":"Owner O"}'),
  ('00000000-0000-0000-0000-0000000077a2', 'hm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000077a3', 'hx@example.iq', '{"full_name":"Outsider X"}'),
  ('00000000-0000-0000-0000-0000000077a4', 'hs@example.iq', '{"full_name":"Support S"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000077a4', 'support');

insert into public.organizations (id, name, slug, created_by) values
  ('77000000-0000-0000-0000-0000000000c1', 'Acme', 'acme-hiring', '00000000-0000-0000-0000-0000000077a1');
insert into public.memberships (organization_id, user_id, role) values
  ('77000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000077a1', 'owner'),
  ('77000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000077a2', 'member')
on conflict do nothing;

-- ── Jobs ────────────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a2');
select throws_ok(
  $$ insert into public.job_requests (organization_id, title) values ('77000000-0000-0000-0000-0000000000c1', 'Designer') $$,
  '42501', null, 'members can''t post jobs'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a1');
select lives_ok(
  $$ insert into public.job_requests (organization_id, title, location, salary_min, salary_max, openings)
     values ('77000000-0000-0000-0000-0000000000c1', 'Designer', 'Baghdad', 1000000, 1500000, 1) $$,
  'owners post jobs'
);
select throws_ok(
  $$ insert into public.job_requests (organization_id, title, salary_min, salary_max)
     values ('77000000-0000-0000-0000-0000000000c1', 'Odd', 2000000, 1000000) $$,
  '23514', null, 'the salary range must make sense'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a3');
select is_empty($$ select * from public.job_requests $$, 'outsiders see no jobs');

-- ── Candidates ──────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a1');
select throws_ok(
  $$ insert into public.candidates (job_request_id, full_name)
     select id, 'Myself' from public.job_requests where title = 'Designer' $$,
  '42501', null, 'companies don''t propose candidates'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a4', 'aal2');
insert into public.candidates (job_request_id, full_name, headline, cv_path)
select id, 'Sara Ali', 'Product designer, 5 years', '77000000-0000-0000-0000-0000000000c1/cv.pdf'
from public.job_requests where title = 'Designer';
insert into public.candidates (job_request_id, full_name)
select id, 'Omar Hadi' from public.job_requests where title = 'Designer';
update public.candidates set status = 'withdrawn' where full_name = 'Omar Hadi';

select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.notifications
   where event = 'candidate_proposed' and user_id = '00000000-0000-0000-0000-0000000077a1'),
  2, 'the owner hears of each proposed candidate'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000077a2');
select results_eq(
  $$ select full_name from public.candidates $$,
  array['Sara Ali'],
  'members see proposed candidates, not withdrawn ones'
);
select throws_ok(
  $$ select public.decide_candidate((select id from public.candidates where full_name = 'Sara Ali'), 'hired') $$,
  '42501', null, 'members can''t decide'
);

-- ── Decisions ───────────────────────────────────────────────────────────────
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a1');
select lives_ok(
  $$ select public.decide_candidate((select id from public.candidates where full_name = 'Sara Ali'), 'shortlisted', 'Strong portfolio') $$,
  'owners shortlist'
);
select throws_ok(
  $$ select public.decide_candidate((select id from public.candidates where full_name = 'Sara Ali'), 'withdrawn') $$,
  '23514', null, 'companies only shortlist, reject or hire'
);
select lives_ok(
  $$ select public.decide_candidate((select id from public.candidates where full_name = 'Sara Ali'), 'hired') $$,
  'owners hire'
);
select is(
  (select status::text from public.job_requests where title = 'Designer'),
  'filled', 'hiring as many as asked fills the job'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a4', 'aal2');
select throws_ok(
  $$ insert into public.candidates (job_request_id, full_name)
     select id, 'Late' from public.job_requests where title = 'Designer' $$,
  '42501', null, 'no candidates for a filled job'
);

-- ── CVs ─────────────────────────────────────────────────────────────────────
select pg_temp.reset_role();
insert into storage.objects (bucket_id, name, owner) values
  ('candidates', '77000000-0000-0000-0000-0000000000c1/cv.pdf', '00000000-0000-0000-0000-0000000077a4');
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a2');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'candidates'),
  1, 'company members can read the CVs'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000077a3');
select is(
  (select count(*)::integer from storage.objects where bucket_id = 'candidates'),
  0, 'outsiders can''t'
);

select * from finish();
rollback;
