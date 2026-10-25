-- Structural guarantees: CI fails if a table lacks Row Level Security, if a
-- table clients can reach has no policy, or if a client role can read the
-- service-only tables.
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

select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'private')
      and not c.relrowsecurity
  $$,
  'Every table in public and private has Row Level Security enabled'
);

-- Every RLS table has a policy, so the advisor's "RLS enabled, no policy"
-- lint stays at zero. Service-only tables (only the service role, which
-- bypasses RLS, and SECURITY DEFINER functions touch them) carry a
-- restrictive "No client access" policy instead of none.
select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'private', 'archive')
      and c.relrowsecurity
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  $$,
  'Every table with Row Level Security has at least one policy'
);

select ok(
  not has_table_privilege('anon', 'public.webhook_events', 'select')
    and not has_table_privilege('authenticated', 'public.webhook_events', 'select'),
  'No client role can read webhook events'
);

select is_empty(
  $$
    select c.relname::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'r'
      and n.nspname in ('public', 'private')
      and not exists (
        select 1 from pg_constraint k where k.conrelid = c.oid and k.contype = 'p')
  $$,
  'Every table has a primary key (advisor 0004)'
);

-- Retired back-office tables (20261120000000_retire_back_office_extras.sql)
-- keep their data in `archive`, which no client role can reach.
select ok(
  not has_schema_privilege('anon', 'archive', 'usage')
    and not has_schema_privilege('authenticated', 'archive', 'usage')
    and not has_schema_privilege('service_role', 'archive', 'usage'),
  'No client role can use the archive schema'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000000', 'aal2');
select throws_ok(
  $$ select count(*) from archive.marketing_campaigns $$,
  '42501',
  null,
  'Signed-in users cannot read archived tables'
);
select pg_temp.reset_role();

select * from finish();
rollback;
