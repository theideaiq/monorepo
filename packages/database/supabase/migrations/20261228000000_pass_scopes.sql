-- Sign in with The IDEA Pass: every scope a partner may ask for.
--
-- New scopes: `membership` (member number, member since), `student_email`
-- (the verified university email), `phone` (the WhatsApp number from
-- Settings), `birthdate`, `address` (the latest delivery address) and
-- `offline_access` (a refresh token, so a partner can read the answers
-- again later, such as whether someone is still a student). `profile`
-- adds the picture, `plus` the plan's name. Staff choose what each
-- partner may ask; people choose, each time, what they share.
--
-- Verified university emails are now kept (they were only hashed), so
-- they can be shared with the person's consent; students verified before
-- confirm theirs once more to share it.

-- ── What partners may ask ─────────────────────────────────────────────────

alter table public.pass_partners drop constraint pass_partners_answers_check;
alter table public.pass_partners add constraint pass_partners_answers_check check (
  answers <@ array[
    'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
    'phone', 'birthdate', 'address', 'card', 'offline_access'
  ]
);

-- ── The verified university email ─────────────────────────────────────────

alter table public.student_badges
  add column university_email text check (char_length(university_email) <= 254);

comment on column public.student_badges.university_email is
  'The university email the badge was verified with (null for card photos and badges from before 28 Oct 2026). Shared only with partner sites the student allows.';

-- As before, and the address is kept with the badge.
create or replace function private.confirm_student_email(code text)
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  request public.student_requests;
  saved public.student_badges;
begin
  select * into request from public.student_requests r
  where r.user_id = caller and r.method = 'email' and r.status = 'pending'
  order by r.created_at desc
  limit 1
  for update;
  if request.id is null or request.code_expires_at < now() then
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.attempts >= 5 then
    update public.student_requests set status = 'expired', code_hash = null, email = null where id = request.id;
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.code_hash is distinct from private.hash_text(coalesce(code, '')) then
    update public.student_requests set attempts = attempts + 1 where id = request.id;
    raise exception 'Wrong code' using errcode = 'check_violation';
  end if;

  update public.student_requests
  set status = 'approved', code_hash = null, email = null, reviewed_at = now()
  where id = request.id;
  perform private.grant_student_badge(
    caller, request.university_id, private.academic_year_end(private.baghdad_today()), 'email',
    private.hash_text(request.email)
  );
  update public.student_badges set university_email = request.email
  where user_id = caller
  returning * into saved;
  return saved;
end;
$$;

-- ── Refresh tokens (`offline_access`, the API only) ───────────────────────

create table public.pass_refresh_tokens (
  -- SHA-256 (hex) of the token.
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);

comment on table public.pass_refresh_tokens is
  'Refresh tokens of partner sites (offline_access): each works once and is replaced; disconnecting ends them.';

create index pass_refresh_tokens_client_idx on public.pass_refresh_tokens (client_id);
create index pass_refresh_tokens_user_idx on public.pass_refresh_tokens (user_id);

alter table public.pass_refresh_tokens enable row level security;

create policy "No client access" on public.pass_refresh_tokens
  as restrictive for all to anon, authenticated using (false);

revoke all on public.pass_refresh_tokens from anon, authenticated;

-- Disconnecting also ends refresh tokens.
create or replace function private.disconnect_pass_partner(client text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  delete from public.pass_refresh_tokens where user_id = caller and client_id = client;
  delete from public.pass_access_tokens where user_id = caller and client_id = client;
  delete from public.pass_sign_in_codes where user_id = caller and client_id = client;
  delete from public.pass_connections where user_id = caller and client_id = client;
end;
$$;

-- ── The claims ─────────────────────────────────────────────────────────────

-- The claims for a member at a partner, for the scopes they shared (standard
-- OpenID Connect names where there is one), worked out now (the API only).
create or replace function private.pass_claims(member uuid, client text, scopes text[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    select o.shipping_address into delivery from public.orders o
    where o.user_id = member and o.fulfilment = 'delivery' and o.shipping_address ? 'address'
    order by o.created_at desc
    limit 1;
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
  return result;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.confirm_student_email(text) from public, anon;
grant execute on function private.confirm_student_email(text) to authenticated;
revoke all on function private.disconnect_pass_partner(text) from public, anon;
grant execute on function private.disconnect_pass_partner(text) to authenticated;
revoke all on function private.pass_claims(uuid, text, text[]) from public, anon, authenticated;
grant execute on function private.pass_claims(uuid, text, text[]) to service_role;
