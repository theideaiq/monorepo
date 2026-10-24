-- Empties the old theideaiq.com database so the new schema can be created.
--
-- Run ONCE on the existing production project, BEFORE `supabase db push`
-- (see README.md in this folder). THIS PERMANENTLY DELETES ALL DATA:
--   - every table, view, function, sequence and type the old apps created in
--     `public` (products, orders, profiles, ledger, …);
--   - the old sign-up trigger on auth.users and the old Storage policies;
--   - every user account (auth.users), with their sessions and identities.
-- Extensions and Supabase's own schemas (auth, storage, realtime, …) stay.
--
-- It refuses to run once the new schema exists, so it can't wipe the new
-- database by accident.

begin;

do $$
begin
  if to_regclass('public.staff') is not null then
    raise exception 'The new schema is already installed (public.staff exists). Nothing was deleted.';
  end if;
end;
$$;

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
    execute format('drop trigger %I on auth.users', r.tgname);
  end loop;

  -- Old policies on storage.objects (the new migrations create their own).
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;

  -- Views, then tables (with their policies, triggers and owned sequences).
  for r in
    select c.relname, c.relkind
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('v', 'm', 'r', 'p', 'f')
      and not c.relispartition
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
    order by c.relkind in ('r', 'p', 'f')
  loop
    execute format(
      'drop %s if exists public.%I cascade',
      case r.relkind
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
        else 'table'
      end,
      r.relname
    );
  end loop;

  -- Remaining sequences.
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'S'
      and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e')
  loop
    execute format('drop sequence if exists public.%I cascade', r.relname);
  end loop;

  -- Functions, procedures and aggregates.
  for r in
    select p.proname, p.prokind, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format(
      'drop %s if exists public.%I(%s) cascade',
      case r.prokind when 'p' then 'procedure' when 'a' then 'aggregate' else 'function' end,
      r.proname,
      r.args
    );
  end loop;

  -- Enums, domains and standalone composite types.
  for r in
    select t.typname, t.typtype
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and (t.typtype in ('e', 'd') or (t.typtype = 'c' and t.typrelid = 0))
      and not exists (select 1 from pg_depend d where d.objid = t.oid and d.deptype = 'e')
  loop
    execute format(
      'drop %s if exists public.%I cascade',
      case r.typtype when 'd' then 'domain' else 'type' end,
      r.typname
    );
  end loop;
end;
$$;

-- Every account (sessions, identities and MFA factors cascade).
delete from auth.users;

-- What is left in public (should be nothing but extension objects).
select c.relname as left_in_public, c.relkind
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e');

commit;
