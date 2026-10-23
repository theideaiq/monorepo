-- Platform staff and the audit log.
--
-- Staff are The IDEA's own employees who run the back office (apps/admin).
-- They are a separate concept from organization roles: an organization role
-- (owner/admin/member) only covers that customer organization, while a staff
-- role covers the whole platform. Staff rows are written by trusted server
-- code or by superadmins through `set_staff_role`; nobody can grant
-- themselves a role.
--
--   superadmin  everything, including managing staff
--   admin       everything except managing staff
--   editor      blog, events, journal, submissions
--   finance     ledger, equity, payroll plan, payments and orders (read)
--   marketing   customers (read), segments and campaigns
--   support     customers, orders and rentals

create type public.staff_role as enum (
  'superadmin', 'admin', 'editor', 'finance', 'marketing', 'support'
);

create table public.staff (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.staff_role not null,
  title text check (char_length(title) <= 120),
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.staff
  for each row execute function private.set_updated_at();

-- Customers can be suspended from the store and community features.
alter table public.profiles
  add column banned_at timestamptz,
  add column calendar_token uuid not null unique default gen_random_uuid();

comment on column public.profiles.calendar_token is
  'Secret token for the personal event calendar feed (apps/api /calendar/<token>.ics).';

-- ── Helpers ─────────────────────────────────────────────────────────────────

-- True when the caller is staff with one of `roles`. Superadmins and admins
-- pass every check except the ones that list roles explicitly without them.
create function private.has_staff_role(roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid())
      and (s.role = any (roles) or s.role in ('superadmin', 'admin'))
  );
$$;

create function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff s where s.user_id = (select auth.uid()));
$$;

create function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.staff s
    where s.user_id = (select auth.uid()) and s.role = 'superadmin'
  );
$$;

-- ── Audit log ───────────────────────────────────────────────────────────────

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null default auth.uid(),
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 60),
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

comment on table public.audit_logs is
  'Append-only record of staff actions. Written by triggers and server code.';

-- Generic trigger: logs inserts, updates and deletes done by staff on the
-- table it is attached to. TG_ARGV[0] is the primary key column.
create function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  key_column text := coalesce(tg_argv[0], 'id');
begin
  if (select auth.uid()) is not null then
    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values (
      lower(tg_op),
      tg_table_name,
      row_data ->> key_column,
      case
        when tg_op = 'UPDATE' then jsonb_build_object(
          'changed', (
            select coalesce(jsonb_agg(n.key), '[]'::jsonb)
            from jsonb_each(to_jsonb(new)) n
            where n.value is distinct from to_jsonb(old) -> n.key
              and n.key not in ('updated_at')
          )
        )
        else '{}'::jsonb
      end
    );
  end if;
  return null;
end;
$$;

create trigger audit_staff after insert or update or delete on public.staff
  for each row execute function private.audit_change('user_id');

-- ── RPCs ────────────────────────────────────────────────────────────────────

-- Superadmins grant, change or revoke (role null) a staff role. The last
-- superadmin can't be demoted, so the back office can't lock itself out.
create function public.set_staff_role(
  target uuid,
  new_role public.staff_role,
  staff_title text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_superadmin() then
    raise exception 'Only superadmins manage staff' using errcode = 'insufficient_privilege';
  end if;

  if (new_role is null or new_role <> 'superadmin')
    and exists (select 1 from public.staff where user_id = target and role = 'superadmin')
    and not exists (
      select 1 from public.staff where role = 'superadmin' and user_id <> target
    )
  then
    raise exception 'There must be at least one superadmin' using errcode = 'check_violation';
  end if;

  if new_role is null then
    delete from public.staff where user_id = target;
  else
    insert into public.staff (user_id, role, title, granted_by)
    values (target, new_role, staff_title, (select auth.uid()))
    on conflict (user_id) do update
      set role = excluded.role,
          title = coalesce(excluded.title, public.staff.title),
          granted_by = excluded.granted_by;
  end if;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.staff enable row level security;
alter table public.audit_logs enable row level security;

create policy "Staff see the staff list; users see their own role"
  on public.staff for select to authenticated
  using (user_id = (select auth.uid()) or private.is_staff());

create policy "Admins and superadmins read the audit log"
  on public.audit_logs for select to authenticated
  using (private.has_staff_role('{admin}'));

-- Staff can look up any customer profile (support, orders, CRM).
create policy "Staff see every profile"
  on public.profiles for select to authenticated
  using (private.is_staff());

create policy "Support suspends customers"
  on public.profiles for update to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.staff, public.audit_logs from anon, authenticated;

grant select on public.staff to authenticated;
grant select on public.audit_logs to authenticated;
grant update (banned_at) on public.profiles to authenticated;
grant all on public.staff, public.audit_logs to service_role;

-- The calendar token is a secret: only its owner reads it, through
-- my_calendar_token(). Column privileges hide it from other selects.
revoke select on public.profiles from authenticated;
grant select (id, full_name, avatar_url, locale, banned_at, created_at, updated_at)
  on public.profiles to authenticated;

create function public.my_calendar_token()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select calendar_token from public.profiles where id = (select auth.uid());
$$;

-- Issues a new calendar token, invalidating feeds shared earlier.
create function public.rotate_calendar_token()
returns uuid
language sql
security definer
set search_path = ''
as $$
  update public.profiles set calendar_token = gen_random_uuid()
  where id = (select auth.uid())
  returning calendar_token;
$$;

-- Policies on public content (catalog, posts, events) call the staff checks
-- for anonymous visitors too; they only compare auth.uid(), which is null.
grant usage on schema private to anon;
revoke all on function private.has_staff_role(public.staff_role[]) from public;
revoke all on function private.is_staff() from public;
revoke all on function private.is_superadmin() from public, anon;
revoke all on function private.audit_change() from public, anon, authenticated;
grant execute on function private.has_staff_role(public.staff_role[]) to anon, authenticated, service_role;
grant execute on function private.is_staff() to anon, authenticated, service_role;
grant execute on function private.is_superadmin() to authenticated, service_role;

revoke all on function public.set_staff_role(uuid, public.staff_role, text) from public, anon;
revoke all on function public.my_calendar_token() from public, anon;
revoke all on function public.rotate_calendar_token() from public, anon;
grant execute on function public.set_staff_role(uuid, public.staff_role, text) to authenticated;
grant execute on function public.my_calendar_token() to authenticated;
grant execute on function public.rotate_calendar_token() to authenticated;
