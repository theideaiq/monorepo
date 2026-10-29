-- The shared student check is gone (owner, 2026-10-29): partners verify
-- students with their own student verifications (`student_verifications`,
-- 20270213000000) instead. The IDEA's student badge and /verify stay.
--
-- * No more one-time checks, in-person student codes or the
--   `student_check` sign-in answer: `student_checks` and its functions go,
--   Partners' card check reads Pass cards only, and apps lose the answer.
-- * Bare Passes made on /verify stay; the daily sweep deletes those
--   holding nothing.

-- Partners check Pass cards only.
create or replace function private.partner_check(org uuid, scanned text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member uuid;
begin
  if not private.is_org_member(org) or not exists (select 1 from public.perks p where p.organization_id = org) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
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

-- The sign-in answers, without student_check.
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

-- Deleting the student status: the badge goes and a pending card review is withdrawn.
create or replace function private.forget_student_status()
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
  select p.student_only into bare from public.profiles p where p.id = caller;
  return coalesce(bare, false);
end;
$$;

-- Daily: the bare Passes to delete (no badge, no card waiting for review,
-- nothing done in the last day).
create or replace function public.sweep_student_checks()
returns setof uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
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
      );
end;
$$;

drop function public.finish_student_check(boolean);
drop function private.finish_student_check(boolean);
drop function private.student_check_result(uuid);
drop function private.new_student_code();
drop table public.student_checks;

update public.pass_partners set
  answers = array_remove(answers, 'student_check'),
  requested_answers = array_remove(requested_answers, 'student_check'),
  approved_answers = array_remove(approved_answers, 'student_check')
where 'student_check' = any (answers || requested_answers || approved_answers);

update public.pass_connections set scopes = array_remove(scopes, 'student_check')
where 'student_check' = any (scopes);

alter table public.pass_partners
  drop constraint pass_partners_answers_check,
  drop constraint pass_partners_requested_answers_check;

alter table public.pass_partners
  add constraint pass_partners_answers_check
    check (answers <@ array['profile', 'email', 'pass', 'student', 'student_email', 'adult', 'plus', 'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations']),
  add constraint pass_partners_requested_answers_check
    check (requested_answers <@ array['profile', 'email', 'pass', 'student', 'student_email', 'adult', 'plus', 'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations']);
