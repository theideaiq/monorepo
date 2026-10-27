-- Signing in with Google (and other providers): a student's university
-- Google account verifies them at once.
--
-- Only Google, and only when Google says the address is verified and the
-- account belongs to the university's Google Workspace (the `hd` claim):
-- then the university itself vouches for the address. Other providers (a
-- Microsoft address can be unverified across tenants) still verify by the
-- emailed code or a card photo. Supabase Auth writes `auth.identities`;
-- nobody can edit it through the API.

-- The caller's student badge from their Google identity, when it shows a
-- university address; null otherwise (nothing changes). A current badge is
-- kept; an address already verifying another Pass doesn't count.
create function private.claim_student_from_identity()
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  address text;
  domain text;
  university text;
  saved public.student_badges;
begin
  if caller is null then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1 from public.student_badges b
    where b.user_id = caller and b.valid_until >= private.baghdad_today()
  ) then
    return null;
  end if;

  select lower(i.identity_data ->> 'email'), lower(i.identity_data -> 'custom_claims' ->> 'hd')
  into address, domain
  from auth.identities i
  where i.user_id = caller
    and i.provider = 'google'
    and (i.identity_data ->> 'email_verified')::boolean is true
    and i.identity_data -> 'custom_claims' ->> 'hd' is not null
  order by i.updated_at desc
  limit 1;
  if address is null or split_part(address, '@', 2) <> domain then
    return null;
  end if;

  select u.id into university from public.universities u, unnest(u.domains) d
  where u.active and (domain = d or domain like '%.' || d)
  order by u.position
  limit 1;
  if university is null then
    return null;
  end if;
  if exists (
    select 1 from public.student_badges b
    where b.email_hash = private.hash_text(address) and b.user_id <> caller
  ) then
    return null;
  end if;

  perform private.grant_student_badge(
    caller, university, private.academic_year_end(private.baghdad_today()), 'email',
    private.hash_text(address)
  );
  update public.student_badges set university_email = address
  where user_id = caller
  returning * into saved;
  return saved;
end;
$$;

create function public.claim_student_from_identity()
returns public.student_badges
language sql
security invoker
set search_path = ''
as $$ select private.claim_student_from_identity() $$;

revoke all on function private.claim_student_from_identity() from public, anon;
grant execute on function private.claim_student_from_identity() to authenticated;
revoke all on function public.claim_student_from_identity() from public, anon;
grant execute on function public.claim_student_from_identity() to authenticated;
