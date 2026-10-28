-- Sign-in scopes (Program Revision v2, item 7).
--
-- `address` now comes from the person's default saved address (Pass →
-- Settings → Addresses), and only without one from their latest delivery.
-- `organizations` lists their organizations in The IDEA Partners and their
-- role in each, so a partner can admit only its own staff; it is a
-- sensitive answer (reviewed before a live app may ask for it).

create or replace function private.pass_sensitive_answers()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['student_email', 'phone', 'birthdate', 'address', 'offline_access', 'card_embed', 'organizations'] $$;

alter table public.pass_partners drop constraint pass_partners_requested_answers_check;
alter table public.pass_partners add constraint pass_partners_requested_answers_check check (
  requested_answers <@ array[
    'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
    'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations'
  ]
);

alter table public.pass_partners drop constraint pass_partners_answers_check;
alter table public.pass_partners add constraint pass_partners_answers_check check (
  answers <@ array[
    'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
    'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed', 'organizations'
  ]
);

-- ── Claims ────────────────────────────────────────────────────────────────

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
  if 'membership' = any (scopes) then
    result := result || jsonb_build_object(
      'member_number', person.member_number,
      'member_since', person.created_at::date
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
      from public.memberships m
      join public.organizations o on o.id = m.organization_id
      where m.user_id = member
    ), '[]'::jsonb));
  end if;
  return result;
end;
$function$;
