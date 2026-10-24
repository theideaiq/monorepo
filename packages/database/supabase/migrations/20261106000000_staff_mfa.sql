-- Staff rights require an authenticator-app sign-in.
--
-- The back office (apps/admin) and its apps/api endpoints already insist on
-- an AAL2 session, but a staff member signed in with only an SMS code could
-- still call PostgREST directly with their staff rights. The staff checks
-- used by every policy now also require the session's `aal` claim to be
-- aal2, so a phone-only session is treated like any customer.

create or replace function private.has_staff_role(roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1 from public.staff s
      where s.user_id = (select auth.uid())
        and (s.role = any (roles) or s.role in ('superadmin', 'admin'))
    );
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
    and exists (select 1 from public.staff s where s.user_id = (select auth.uid()));
$$;

create or replace function private.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1 from public.staff s
      where s.user_id = (select auth.uid()) and s.role = 'superadmin'
    );
$$;
