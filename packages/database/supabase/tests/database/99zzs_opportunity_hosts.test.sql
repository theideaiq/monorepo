-- Opportunities name who runs them: the organization's name, kept in step.
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

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a2b1', 'o9zzs@example.iq');
insert into public.organizations (id, name, slug, created_by, features) values
  ('9a5a0000-0000-0000-0000-0000000000a1', 'Tech Co', 'tech-9zzs', '00000000-0000-0000-0000-00000000a2b1', '{opportunities}');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a5a0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a2b1', 'owner');

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2b1');
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, remote, host_name)
values ('9a5a0000-0000-0000-0000-0000000000b1', '9a5a0000-0000-0000-0000-0000000000a1', 'job',
  'وظيفة', 'A job', true, 'Someone famous');
select is(
  (select host_name from public.opportunities where id = '9a5a0000-0000-0000-0000-0000000000b1'),
  'Tech Co', 'an opportunity carries its organization''s name, whatever was sent'
);
update public.opportunities set host_name = 'Someone famous'
where id = '9a5a0000-0000-0000-0000-0000000000b1';
select is(
  (select host_name from public.opportunities where id = '9a5a0000-0000-0000-0000-0000000000b1'),
  'Tech Co', 'and organizations can''t change it'
);

update public.organizations set name = 'Tech Company'
where id = '9a5a0000-0000-0000-0000-0000000000a1';
select results_eq(
  $$ select host_name, status from public.opportunities where id = '9a5a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('Tech Company'::text, 'draft'::text) $$,
  'renaming the organization renames its opportunities, without a new review'
);

select pg_temp.reset_role();
insert into public.opportunities (id, kind, title_ar, title_en, location, status)
values ('9a5a0000-0000-0000-0000-0000000000b2', 'program', 'برنامج', 'A program', 'Baghdad', 'approved');
select is(
  (select host_name from public.opportunities where id = '9a5a0000-0000-0000-0000-0000000000b2'),
  null, 'The IDEA''s own have no host name'
);

select pg_temp.login_anon();
select is(
  (select host_name from public.opportunities where id = '9a5a0000-0000-0000-0000-0000000000b2'),
  null, 'visitors read listed opportunities with their host'
);

select * from finish();
rollback;
