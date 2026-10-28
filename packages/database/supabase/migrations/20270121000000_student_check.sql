-- The student check (owner's master brief, 2026-10-28, section 21):
-- verifying as a student without joining, SheerID-style.
--
-- * theideaiq.com/verify signs the person in with their university email
--   (the emailed 8-digit code) or any email plus a student card photo.
--   A Pass made there is a bare Pass (`profiles.student_only`): it holds
--   only "student at <university> until 30 June", skips onboarding and
--   becomes a full Pass once they set their name, order or join Plus.
-- * When verified, they choose: a one-time check (the badge goes, only the
--   result is kept, for 30 days against abuse) or keeping it for a year
--   (the badge stays, with student prices, Plus at 20% off and perks).
--   Either way `student_checks` holds the result and a short code (24
--   hours) a partner checks in person, in Partners like a Pass card.
-- * Partners ask with the `student_check` sign-in answer: verified yes or
--   no, the university and the expiry date; no name, email or Pass details.
-- * "Your student status" can be deleted from the same page; a bare Pass
--   goes with it (the API deletes it). A daily job forgets checks after 30
--   days and deletes bare Passes nothing kept.

-- ── Bare Passes ────────────────────────────────────────────────────────────

alter table public.profiles
  add column student_only boolean not null default false;

-- The website reads it (a bare Pass skips onboarding); only the database
-- changes it.
grant select (student_only) on public.profiles to authenticated;

comment on column public.profiles.student_only is
  'A bare Pass made by the student check: only the student status, until they set their name, order or join Plus.';

-- The caller starts a check on /verify: a Pass without a name, orders or
-- a plan is bare until it becomes a full one.
create function private.begin_student_check()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  bare boolean;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles p set student_only = true
  where p.id = caller
    and not p.student_only
    and nullif(trim(coalesce(p.full_name, '')), '') is null
    and not exists (select 1 from public.orders o where o.user_id = caller)
    and not exists (select 1 from public.subscriptions s where s.user_id = caller);
  select p.student_only into bare from public.profiles p where p.id = caller;
  return coalesce(bare, false);
end;
$$;

create function public.begin_student_check()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.begin_student_check() $$;

revoke all on function private.begin_student_check() from public, anon;
revoke all on function public.begin_student_check() from public, anon;
grant execute on function private.begin_student_check() to authenticated;
grant execute on function public.begin_student_check() to authenticated;

-- Setting a name makes it a full Pass.
create function private.end_student_only_on_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_only and nullif(trim(coalesce(new.full_name, '')), '') is not null then
    new.student_only := false;
  end if;
  return new;
end;
$$;

create trigger end_student_only before update of full_name on public.profiles
  for each row execute function private.end_student_only_on_name();

-- So does buying, renting or joining Plus.
create function private.end_student_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set student_only = false
  where id = new.user_id and student_only;
  return new;
end;
$$;

create trigger end_student_only after insert on public.orders
  for each row execute function private.end_student_only();

create trigger end_student_only after insert on public.subscriptions
  for each row execute function private.end_student_only();

-- ── Verifying with the email the Pass signed in with ───────────────────────

-- On /verify a signed-out student signs in with their university email:
-- the emailed sign-in code proved they own it, so it verifies them at
-- once. Null when the address isn't the university's.
create function private.claim_student_from_email(university text)
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  address text;
  saved public.student_badges;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select lower(u.email) into address from auth.users u
  where u.id = caller and u.email_confirmed_at is not null;
  if address is null or not private.email_university(university, address) then
    return null;
  end if;
  if exists (
    select 1 from public.student_badges b
    where b.email_hash = private.hash_text(address) and b.user_id <> caller
  ) then
    raise exception 'This email already verified another Pass' using errcode = 'check_violation';
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

create function public.claim_student_from_email(university text)
returns public.student_badges
language sql
security invoker
set search_path = ''
as $$ select private.claim_student_from_email(university) $$;

revoke all on function private.claim_student_from_email(text) from public, anon;
revoke all on function public.claim_student_from_email(text) from public, anon;
grant execute on function private.claim_student_from_email(text) to authenticated;
grant execute on function public.claim_student_from_email(text) to authenticated;

-- ── Checks ─────────────────────────────────────────────────────────────────

create table public.student_checks (
  id uuid primary key default gen_random_uuid(),
  -- Null once the Pass is deleted; the record stays its 30 days.
  user_id uuid references auth.users (id) on delete set null,
  university_id text not null references public.universities (id),
  valid_until date not null,
  -- Whether the student kept the status for the year.
  kept boolean not null,
  email_hash text,
  -- What a partner checks in person: 8 letters and digits, for 24 hours.
  code text not null check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  code_expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.student_checks is
  'Student check results: the university, until when, and the short code partners check. Kept 30 days against abuse.';

create unique index student_checks_code_idx on public.student_checks (code);
create index student_checks_user_idx on public.student_checks (user_id, created_at desc);
create index student_checks_university_idx on public.student_checks (university_id);
create index student_checks_email_idx on public.student_checks (email_hash, created_at desc)
  where email_hash is not null;
create index student_checks_created_idx on public.student_checks (created_at);

alter table public.student_checks enable row level security;

create policy "Students see their checks; support sees all" on public.student_checks
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

revoke all on public.student_checks from anon, authenticated;
grant select (id, user_id, university_id, valid_until, kept, code, code_expires_at, created_at)
  on public.student_checks to authenticated;

-- A code no live check uses.
create function private.new_student_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  candidate text;
begin
  loop
    bytes := extensions.gen_random_bytes(8);
    candidate := '';
    for i in 0..7 loop
      candidate := candidate || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from public.student_checks c where c.code = candidate);
  end loop;
  return candidate;
end;
$$;

-- The verified student finishes: a one-time check, or keeping the status
-- for the year. Returns the check (with its code). A one-time check takes
-- the badge away; at most 5 a month per university email.
create function private.finish_student_check(keep boolean)
returns public.student_checks
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  badge public.student_badges;
  saved public.student_checks;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into badge from public.student_badges b
  where b.user_id = caller and b.valid_until >= private.baghdad_today()
  for update;
  if badge.user_id is null then
    raise exception 'Verify you''re a student first' using errcode = 'check_violation';
  end if;
  if (
    select count(*) from public.student_checks c
    where c.user_id = caller and c.created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Too many checks today' using errcode = 'check_violation';
  end if;
  if not keep and badge.email_hash is not null and (
    select count(*) from public.student_checks c
    where c.email_hash = badge.email_hash and not c.kept and c.created_at > now() - interval '30 days'
  ) >= 5 then
    raise exception 'Too many checks this month' using errcode = 'check_violation';
  end if;

  insert into public.student_checks (
    user_id, university_id, valid_until, kept, email_hash, code, code_expires_at
  ) values (
    caller, badge.university_id, badge.valid_until, keep, badge.email_hash,
    private.new_student_code(), now() + interval '24 hours'
  )
  returning * into saved;

  if not keep then
    delete from public.student_badges where user_id = caller;
  end if;
  return saved;
end;
$$;

create function public.finish_student_check(keep boolean)
returns public.student_checks
language sql
security invoker
set search_path = ''
as $$ select private.finish_student_check(keep) $$;

revoke all on function private.finish_student_check(boolean) from public, anon;
revoke all on function public.finish_student_check(boolean) from public, anon;
grant execute on function private.finish_student_check(boolean) to authenticated;
grant execute on function public.finish_student_check(boolean) to authenticated;

-- The result a partner gets for a Pass: the kept badge, else a check made
-- in the last 24 hours. Verified false otherwise.
create function private.student_check_result(member uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('verified', true, 'university', b.university_id, 'until', b.valid_until)
      from public.student_badges b
      where b.user_id = member and b.valid_until >= private.baghdad_today()),
    (select jsonb_build_object('verified', true, 'university', c.university_id, 'until', c.valid_until)
      from public.student_checks c
      where c.user_id = member and c.code_expires_at > now() and c.valid_until >= private.baghdad_today()
      order by c.created_at desc
      limit 1),
    jsonb_build_object('verified', false)
  );
$$;

revoke all on function private.student_check_result(uuid) from public, anon, authenticated;

-- "Your student status" is deleted: the badge goes, a pending request is
-- withdrawn and the codes stop working; the 30-day records lose the Pass. Returns whether the Pass is
-- bare, so the API deletes it too.
create function private.forget_student_status()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  bare boolean;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from public.student_badges where user_id = caller;
  -- A card waiting for review is withdrawn; the API deletes the photo.
  update public.student_requests set status = 'cancelled', code_hash = null, email = null, card_path = null
  where user_id = caller and status = 'pending';
  update public.student_checks set user_id = null, code_expires_at = least(code_expires_at, now())
  where user_id = caller;
  select p.student_only into bare from public.profiles p where p.id = caller;
  return coalesce(bare, false);
end;
$$;

create function public.forget_student_status()
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.forget_student_status() $$;

revoke all on function private.forget_student_status() from public, anon;
revoke all on function public.forget_student_status() from public, anon;
grant execute on function private.forget_student_status() to authenticated;
grant execute on function public.forget_student_status() to authenticated;

-- The daily job: forgets checks after 30 days and returns the bare Passes
-- to delete (no badge, no card waiting for review, and nothing done in the
-- last day). The API deletes them with the admin client. Service only.
create function public.sweep_student_checks()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.student_checks where created_at < now() - interval '30 days';
  return query
    select p.id from public.profiles p
    join auth.users u on u.id = p.id
    where p.student_only
      and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '1 day'
      and not exists (
        select 1 from public.student_badges b
        where b.user_id = p.id and b.valid_until >= private.baghdad_today()
      )
      and not exists (
        select 1 from public.student_requests r
        where r.user_id = p.id and r.status = 'pending' and r.method = 'card'
      )
      and not exists (
        select 1 from public.student_checks c
        where c.user_id = p.id and c.code_expires_at > now()
      );
end;
$$;

revoke all on function public.sweep_student_checks() from public, anon, authenticated;
grant execute on function public.sweep_student_checks() to service_role;

-- ── Checking in person ─────────────────────────────────────────────────────

-- Partners' check now also takes a student check code ("STUDENT:<code>"
-- from the QR, or the code typed with or without its dash): verified, the
-- university and until when, nothing about the person.
create or replace function private.partner_check(org uuid, scanned text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member uuid;
  typed text := regexp_replace(upper(trim(coalesce(scanned, ''))), '^STUDENT:|[\s-]', '', 'g');
  check_row public.student_checks;
begin
  if not private.is_org_member(org) or not exists (select 1 from public.perks p where p.organization_id = org) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if typed ~ '^[A-HJ-NP-Z2-9]{8}$' then
    select * into check_row from public.student_checks c
    where c.code = typed and c.code_expires_at > now() and c.valid_until >= private.baghdad_today();
    if check_row.id is null then
      return jsonb_build_object('valid', false);
    end if;
    return jsonb_build_object(
      'valid', true,
      'student_check', true,
      'student', true,
      'university', check_row.university_id,
      'until', check_row.valid_until
    );
  end if;
  member := private.pass_holder(scanned);
  if member is null then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object(
    'valid', true,
    'first_name', private.first_name(member),
    'member_number', (select p.member_number from public.profiles p where p.id = member),
    'student', private.is_student(member),
    'plus', (private.member_plan(member)).id is not null,
    'perks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'title_ar', k.title_ar,
        'title_en', k.title_en,
        'audience', k.audience,
        'open', private.perk_open_to(member, k.audience),
        'used_today', exists (
          select 1 from public.perk_redemptions r
          where r.perk_id = k.id and r.user_id = member and r.redeemed_on = private.baghdad_today()
        )
      ) order by k.position, k.created_at)
      from public.perks k
      where k.organization_id = org and k.active
    ), '[]'::jsonb)
  );
end;
$$;

-- ── The student_check sign-in answer ───────────────────────────────────────

alter table public.pass_partners
  drop constraint pass_partners_answers_check,
  drop constraint pass_partners_requested_answers_check;

alter table public.pass_partners
  add constraint pass_partners_answers_check
    check (answers <@ array['profile', 'email', 'pass', 'student', 'student_check', 'student_email', 'adult', 'plus', 'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations']),
  add constraint pass_partners_requested_answers_check
    check (requested_answers <@ array['profile', 'email', 'pass', 'student', 'student_check', 'student_email', 'adult', 'plus', 'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations']);

-- The answer: verified, the university and until when; nothing else.
create or replace function private.pass_claims(member uuid, client text, scopes text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  connection public.pass_connections;
  person public.profiles;
  badge public.student_badges;
  plan public.plans;
  delivery jsonb;
  given text;
  result jsonb;
begin
  select * into connection from public.pass_connections c
  where c.user_id = member and c.client_id = client;
  if connection.subject is null then
    return null;
  end if;
  scopes := array(
    select s from unnest(scopes) s, public.pass_partners p
    where p.client_id = client and s = any (p.answers)
  );
  result := jsonb_build_object('sub', connection.subject);
  select * into person from public.profiles p where p.id = member;
  select * into badge from public.student_badges b
  where b.user_id = member and b.valid_until >= private.baghdad_today();

  if 'profile' = any (scopes) then
    given := nullif(split_part(trim(coalesce(person.full_name, '')), ' ', 1), '');
    result := result || jsonb_strip_nulls(jsonb_build_object(
      'name', nullif(trim(person.full_name), ''),
      'given_name', given,
      'family_name', nullif(trim(substr(trim(coalesce(person.full_name, '')), char_length(coalesce(given, '')) + 1)), ''),
      'locale', person.locale,
      'picture', case when person.avatar_url ~ '^https://' then person.avatar_url end
    ));
  end if;
  if 'email' = any (scopes) then
    result := result || (
      select jsonb_build_object('email', u.email, 'email_verified', u.email_confirmed_at is not null)
      from auth.users u where u.id = member
    );
  end if;
  if 'pass' = any (scopes) then
    result := result || jsonb_build_object(
      'pass_number', person.member_number,
      'pass_since', person.created_at::date
    );
  end if;
  if 'student' = any (scopes) then
    result := result || jsonb_build_object('student', case
      when badge.user_id is null then jsonb_build_object('verified', false)
      else jsonb_build_object('verified', true, 'university', badge.university_id, 'until', badge.valid_until)
    end);
  end if;
  if 'student_check' = any (scopes) then
    result := result || jsonb_build_object('student_check', private.student_check_result(member));
  end if;
  if 'student_email' = any (scopes) and badge.university_email is not null then
    result := result || jsonb_build_object(
      'student_email', badge.university_email,
      'student_email_verified', true
    );
  end if;
  if 'adult' = any (scopes) then
    result := result || jsonb_build_object('adult', private.is_adult(member));
  end if;
  if 'plus' = any (scopes) then
    plan := private.member_plan(member);
    result := result || jsonb_strip_nulls(jsonb_build_object(
      'plus', plan.id is not null,
      'plus_plan', plan.name
    ));
  end if;
  if 'phone' = any (scopes) and person.whatsapp_phone is not null then
    result := result || jsonb_build_object(
      'phone_number', person.whatsapp_phone,
      'phone_number_verified', false
    );
  end if;
  if 'birthdate' = any (scopes) and person.birthday is not null then
    result := result || jsonb_build_object('birthdate', person.birthday);
  end if;
  if 'address' = any (scopes) then
    -- The default saved address; without one, the latest delivery.
    select jsonb_build_object(
      'address', a.street, 'city', a.area, 'governorate', a.governorate
    ) into delivery
    from public.user_addresses a
    where a.user_id = member
    order by a.is_default desc, a.created_at desc
    limit 1;
    if delivery is null then
      select o.shipping_address into delivery from public.orders o
      where o.user_id = member and o.fulfilment = 'delivery' and o.shipping_address ? 'address'
      order by o.created_at desc
      limit 1;
    end if;
    if delivery is not null then
      result := result || jsonb_build_object('address', jsonb_strip_nulls(jsonb_build_object(
        'formatted', concat_ws(', ', nullif(delivery ->> 'address', ''), nullif(delivery ->> 'city', ''),
          nullif(delivery ->> 'governorate', ''), 'Iraq'),
        'street_address', nullif(delivery ->> 'address', ''),
        'locality', nullif(delivery ->> 'city', ''),
        'region', nullif(delivery ->> 'governorate', ''),
        'country', 'IQ'
      )));
    end if;
  end if;
  if 'organizations' = any (scopes) then
    -- Their organizations in The IDEA Partners, and their role in each;
    -- `app_owner` marks the organization that owns this app.
    result := result || jsonb_build_object('organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', o.id,
        'name', o.name,
        'role', m.role,
        'app_owner', o.id = (select p.organization_id from public.pass_partners p where p.client_id = client)
      ) order by m.created_at)
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = member
    ), '[]'::jsonb));
  end if;
  return result;
end;
$function$;
