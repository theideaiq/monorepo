-- Step 1 of 2: set the old theideaiq.com schema aside.
--
-- Run ONCE on the existing production database, BEFORE `supabase db push`
-- (see README.md in this folder). It deletes nothing: every table, view,
-- function and type the old apps created in `public` moves, with its data,
-- policies and constraints, into a `legacy` schema that the API does not
-- expose. `public` is then empty, so the repository's migrations apply
-- unchanged. Step 2 copies the data into the new tables.
--
-- Two things are removed because they would break the new schema:
--   - triggers on auth.users that call old `public` functions (the old
--     sign-up trigger would write to the old profiles table and clash with
--     the new on_auth_user_created trigger);
--   - policies on storage.objects (the old apps never used Storage, and an
--     old permissive policy would also apply to the new buckets).

begin;

-- Refuse to run twice: after `supabase db push`, public holds the new schema
-- and must not be moved.
do $$
begin
  if to_regclass('public.staff') is not null
    or exists (select 1 from pg_namespace where nspname = 'legacy')
  then
    raise exception 'Step 1 already ran (public.staff or the legacy schema exists). Nothing was changed.';
  end if;
end;
$$;

create schema legacy;
revoke all on schema legacy from public, anon, authenticated;

do $$
declare
  r record;
begin
  -- Old triggers on auth.users that call public functions.
  for r in
    select t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_namespace n on n.oid = p.pronamespace
    where t.tgrelid = 'auth.users'::regclass
      and not t.tgisinternal
      and n.nspname = 'public'
  loop
    raise notice 'Dropping trigger % on auth.users', r.tgname;
    execute format('drop trigger %I on auth.users', r.tgname);
  end loop;

  -- Old policies on storage.objects.
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    raise notice 'Dropping storage policy "%"', r.policyname;
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;

  -- Tables, views, materialized views and foreign tables (sequences owned by
  -- a table move with it). Objects that belong to an extension stay put.
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'v', 'm', 'f')
      and not c.relispartition
      and not exists (
        select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e'
      )
  loop
    execute format(
      'alter %s public.%I set schema legacy',
      case r.relkind
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
        else 'table'
      end,
      r.relname
    );
  end loop;

  -- Sequences not owned by a table.
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and not exists (
        select 1 from pg_depend d
        where d.objid = c.oid and d.deptype in ('a', 'i', 'e')
      )
  loop
    execute format('alter sequence public.%I set schema legacy', r.relname);
  end loop;

  -- Functions, procedures and aggregates.
  for r in
    select p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format(
      'alter %s public.%I(%s) set schema legacy',
      case r.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end,
      r.proname,
      r.args
    );
  end loop;

  -- Enums, domains and standalone composite types (a table's row type moved
  -- with its table).
  for r in
    select t.typname, t.typtype
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and (t.typtype in ('e', 'd') or (t.typtype = 'c' and t.typrelid = 0))
      and not exists (
        select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e'
      )
  loop
    execute format(
      'alter %s public.%I set schema legacy',
      case r.typtype when 'd' then 'domain' else 'type' end,
      r.typname
    );
  end loop;
end;
$$;

-- What is left in public (should be nothing but extension objects).
select c.relname as left_in_public, c.relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e');

commit;
