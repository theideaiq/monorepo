-- PR 7, C26: saved reasons in Staff's Inbox.
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

select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f5001', 'support-reasons@example.iq'),
  ('00000000-0000-0000-0000-0000000f5002', 'editor-reasons@example.iq'),
  ('00000000-0000-0000-0000-0000000f5003', 'admin-reasons@example.iq'),
  ('00000000-0000-0000-0000-0000000f5004', 'member-reasons@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f5001', 'support'),
  ('00000000-0000-0000-0000-0000000f5002', 'editor'),
  ('00000000-0000-0000-0000-0000000f5003', 'admin');

-- Any staff member saves a reason, as themselves, once per kind.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001', 'aal2');
select lives_ok(
  $$ insert into public.staff_saved_reasons (id, kind, body)
     values ('9f700000-0000-0000-0000-0000000000a1', 'verifications', 'The photo is too blurry to read.') $$,
  'staff save a reason'
);
select throws_ok(
  $$ insert into public.staff_saved_reasons (kind, body) values ('verifications', 'The photo is too blurry to read.') $$,
  '23505', null, 'the same reason once per kind'
);
select throws_ok(
  $$ insert into public.staff_saved_reasons (kind, body) values ('orders', 'Not a kind') $$,
  '23514', null, 'only the Inbox kinds that take a reason'
);
select throws_ok(
  $$ insert into public.staff_saved_reasons (kind, body, created_by)
     values ('shops', 'Pretend', '00000000-0000-0000-0000-0000000f5002') $$,
  '42501', null, 'a reason cannot be saved as someone else'
);

-- Others read it; only the author or an admin removes it.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5002', 'aal2');
select is((select count(*)::integer from public.staff_saved_reasons), 1, 'other staff read saved reasons');
delete from public.staff_saved_reasons where id = '9f700000-0000-0000-0000-0000000000a1';
select is((select count(*)::integer from public.staff_saved_reasons), 1, 'only the author or an admin removes one');

-- Members and aal1 sessions see nothing.
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5004');
select is((select count(*)::integer from public.staff_saved_reasons), 0, 'members see nothing');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f5001', 'aal1');
select is((select count(*)::integer from public.staff_saved_reasons), 0, 'not without an authenticator-app session');

select pg_temp.login_as('00000000-0000-0000-0000-0000000f5003', 'aal2');
delete from public.staff_saved_reasons where id = '9f700000-0000-0000-0000-0000000000a1';
select is((select count(*)::integer from public.staff_saved_reasons), 0, 'admins remove any');

select * from finish();
rollback;
