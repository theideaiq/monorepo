-- Partners: the sections an organization switches on.
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

select plan(10);

-- O owns Org (A an admin, M a member); X is someone else.
insert into auth.users (id, email, email_confirmed_at) values
  ('00000000-0000-0000-0000-000000000981', 'o98@example.iq', now()),
  ('00000000-0000-0000-0000-000000000982', 'a98@example.iq', now()),
  ('00000000-0000-0000-0000-000000000983', 'm98@example.iq', now()),
  ('00000000-0000-0000-0000-000000000984', 'x98@example.iq', now());
insert into public.organizations (id, name, slug, created_by) values
  ('98000000-0000-0000-0000-0000000000c1', 'Org', 'org-98', '00000000-0000-0000-0000-000000000981');
insert into public.organization_members (organization_id, user_id, role) values
  ('98000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000981', 'owner'),
  ('98000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000982', 'admin'),
  ('98000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000983', 'member');

select is(
  (select features from public.organizations where id = '98000000-0000-0000-0000-0000000000c1'),
  '{}'::text[], 'A new organization starts with no sections switched on'
);

-- Owners and admins add sections; each is kept once, in order.
select pg_temp.login_as('00000000-0000-0000-0000-000000000982');
update public.organizations set features = '{developers,team,developers}'
where id = '98000000-0000-0000-0000-0000000000c1';
select is(
  (select features from public.organizations where id = '98000000-0000-0000-0000-0000000000c1'),
  '{developers,team}'::text[], 'An admin switches sections on (each once, sorted)'
);

select throws_ok(
  $$ update public.organizations set features = '{opportunities}'
     where id = '98000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'Only sections that exist can be switched on'
);
select throws_ok(
  $$ update public.organizations set features = '{bulk_buying}'
     where id = '98000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, 'Bulk buying is now part of Team'
);

-- A member can't change them; nor can someone outside the organization.
select pg_temp.login_as('00000000-0000-0000-0000-000000000983');
update public.organizations set features = '{}'
where id = '98000000-0000-0000-0000-0000000000c1';
select is(
  (select features from public.organizations where id = '98000000-0000-0000-0000-0000000000c1'),
  '{developers,team}'::text[], 'Members see the sections but cannot change them'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000984');
update public.organizations set features = '{}'
where id = '98000000-0000-0000-0000-0000000000c1';
select is_empty(
  $$ select 1 from public.organizations where id = '98000000-0000-0000-0000-0000000000c1' $$,
  'Others do not see the organization'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000981');
update public.organizations set features = '{team}'
where id = '98000000-0000-0000-0000-0000000000c1';
select is(
  (select features from public.organizations where id = '98000000-0000-0000-0000-0000000000c1'),
  '{team}'::text[], 'The owner switches a section off'
);

select throws_ok(
  $$ update public.organizations set created_by = null
     where id = '98000000-0000-0000-0000-0000000000c1' $$,
  '42501', null, 'Owners still change only the name, slug and sections'
);

-- Staff adding a perk switches Perks on (once).
select pg_temp.reset_role();
insert into public.perks (organization_id, partner_name, title_ar, title_en) values
  ('98000000-0000-0000-0000-0000000000c1', 'Org', 'خصم', 'Discount'),
  ('98000000-0000-0000-0000-0000000000c1', 'Org', 'خصم ٢', 'Discount 2');
select is(
  (select features from public.organizations where id = '98000000-0000-0000-0000-0000000000c1'),
  '{perks,team}'::text[], 'A perk switches Perks on'
);

select is(
  (select count(*)::int from information_schema.column_privileges
   where table_schema = 'public' and table_name = 'organizations'
     and grantee = 'authenticated' and privilege_type = 'UPDATE'
     and column_name in ('features', 'name', 'slug')),
  3, 'Signed-in users may update the name, slug and sections'
);

select * from finish();
rollback;
