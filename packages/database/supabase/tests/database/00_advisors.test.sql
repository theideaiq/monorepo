-- The Supabase advisor (security and performance lints) stays at zero
-- findings for our schemas. Each check is one advisor rule expressed as
-- pgTAP, so CI fails before the dashboard would show a warning.
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

select plan(11);

-- RPC convention: the body lives in private (SECURITY DEFINER, with its own
-- permission checks); the name in public is a SECURITY INVOKER wrapper.
select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and (has_function_privilege('anon', p.oid, 'execute')
        or has_function_privilege('authenticated', p.oid, 'execute'))
  $$,
  'No SECURITY DEFINER function in public is callable by anon or authenticated (advisors 0028, 0029)'
);

select is_empty(
  $$
    select p.oid::regprocedure::text
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c
        where c like 'search_path=%')
  $$,
  'Every function in public and private pins its search_path (advisor 0011)'
);

select is_empty(
  $$
    select p.schemaname || '.' || p.tablename || ' ' || r.role || ' ' || a.action
    from pg_policies p
    cross join lateral unnest(case when p.roles = '{public}'
      then array['anon', 'authenticated']::name[] else p.roles end) as r(role)
    cross join lateral unnest(case when p.cmd = 'ALL'
      then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd] end) as a(action)
    where p.permissive = 'PERMISSIVE'
      and p.schemaname in ('public', 'private')
      and r.role in ('anon', 'authenticated')
    group by p.schemaname, p.tablename, r.role, a.action
    having count(*) > 1
  $$,
  'No table has two permissive policies for the same role and action (advisor 0006)'
);

select is_empty(
  $$
    select c.conrelid::regclass::text || '.' || c.conname
    from pg_constraint c
    join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f'
      and n.nspname in ('public', 'private')
      and not exists (
        select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey::int2[])
  $$,
  'Every foreign key has an index on its columns (advisor 0001)'
);

select is_empty(
  $$
    select p.schemaname || '.' || p.tablename || ': ' || p.policyname
    from pg_policies p
    where p.schemaname in ('public', 'private', 'storage')
      and (
        regexp_count(coalesce(p.qual, ''), '(auth\.(uid|jwt|role)|current_setting)\(')
          > regexp_count(coalesce(p.qual, ''), 'SELECT (auth\.(uid|jwt|role)|current_setting)\(')
        or regexp_count(coalesce(p.with_check, ''), '(auth\.(uid|jwt|role)|current_setting)\(')
          > regexp_count(coalesce(p.with_check, ''), 'SELECT (auth\.(uid|jwt|role)|current_setting)\(')
      )
  $$,
  'Policies call auth.uid(), auth.jwt() and current_setting() once per statement (advisor 0003)'
);

select is_empty(
  $$
    select p.schemaname || '.' || p.tablename || ': ' || p.policyname
    from pg_policies p
    where p.schemaname in ('public', 'private', 'storage')
      and (coalesce(p.qual, '') ~ 'user_metadata'
        or coalesce(p.with_check, '') ~ 'user_metadata')
  $$,
  'No policy reads user_metadata, which users can edit (advisor 0015)'
);

select is_empty(
  $$
    select c.oid::regclass::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'v'
      and n.nspname = 'public'
      and not coalesce(c.reloptions @> array['security_invoker=true'], false)
  $$,
  'Every view in public runs with the caller''s rights (advisor 0010)'
);

select is_empty(
  $$
    select distinct v.oid::regclass::text
    from pg_class v
    join pg_namespace n on n.oid = v.relnamespace
    join pg_rewrite rw on rw.ev_class = v.oid
    join pg_depend d on d.objid = rw.oid
    where v.relkind in ('v', 'm')
      and n.nspname = 'public'
      and d.refobjid = 'auth.users'::regclass
  $$,
  'No view in public exposes auth.users (advisor 0002)'
);

select is_empty(
  $$
    select c.oid::regclass::text
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('m', 'f')
      and n.nspname = 'public'
  $$,
  'No materialized view or foreign table in public (advisors 0016, 0017)'
);

select is_empty(
  $$
    select e.extname::text
    from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where n.nspname = 'public'
  $$,
  'No extension is installed in public (advisor 0014)'
);

select is_empty(
  $$
    select i.indrelid::regclass::text || ': '
      || string_agg(i.indexrelid::regclass::text, ', ')
    from pg_index i
    join pg_class c on c.oid = i.indrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'private')
    group by i.indrelid, i.indkey::text, i.indclass::text,
      coalesce(i.indexprs::text, ''), coalesce(i.indpred::text, '')
    having count(*) > 1
  $$,
  'No table has two identical indexes (advisor 0009)'
);

select * from finish();
rollback;
