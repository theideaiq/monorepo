-- `public.memberships` becomes `public.organization_members` (owner's
-- master brief, 2026-10-28): who belongs to which organization in
-- Partners. "Member" words stay clear: organization_members for Partners,
-- plus_members for Plus Duo, and "membership" nowhere.
--
-- Indexes, constraints, policies, triggers and grants follow the table;
-- the functions that name it are recreated. Until the apps read the new
-- name, `public.memberships` stays as a security-invoker view of the
-- table (simple, so writes pass through with the table's policies and
-- triggers); the code change that follows drops it.

alter table public.memberships rename to organization_members;
alter table public.organization_members rename constraint memberships_pkey to organization_members_pkey;
alter table public.organization_members
  rename constraint memberships_organization_id_fkey to organization_members_organization_id_fkey;
alter table public.organization_members
  rename constraint memberships_user_id_fkey to organization_members_user_id_fkey;
alter index public.memberships_user_id_idx rename to organization_members_user_id_idx;
alter policy "Members see their organization's memberships" on public.organization_members
  rename to "Members see their organization's members";

CREATE OR REPLACE FUNCTION private.accept_invitation(invitation_token uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  -- Supabase stores phone numbers without the leading "+".
  caller_phone text := nullif(auth.jwt() ->> 'phone', '');
  caller_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  invitation public.invitations;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  select * into invitation
  from public.invitations
  where token = invitation_token and accepted_at is null and expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation not found or expired' using errcode = 'no_data_found';
  end if;

  if invitation.invitee is distinct from caller_email
    and invitation.invitee is distinct from '+' || ltrim(caller_phone, '+')
  then
    raise exception 'This invitation is for a different account'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (invitation.organization_id, caller, invitation.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = invitation.id;

  return invitation.organization_id;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.approve_pass_sign_in(client text, redirect_uri text, scopes text[], code_challenge text, nonce text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  partner public.pass_partners;
  shared text[];
  code text;
begin
  if caller is null or exists (select 1 from public.profiles p where p.id = caller and p.banned_at is not null) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into partner from public.pass_partners p where p.client_id = client and p.active;
  if partner.client_id is null or not approve_pass_sign_in.redirect_uri = any (partner.redirect_uris) then
    raise exception 'Unknown site' using errcode = 'no_data_found';
  end if;
  if partner.mode = 'testing' and not exists (
    select 1 from public.organization_members m where m.organization_id = partner.organization_id and m.user_id = caller
  ) then
    raise exception 'This site is in testing' using errcode = 'insufficient_privilege';
  end if;
  if not 'openid' = any (scopes)
    or not scopes <@ (array['openid'] || partner.answers)
    or code_challenge !~ '^[A-Za-z0-9_-]{43,128}$'
    or char_length(coalesce(nonce, '')) > 200
  then
    raise exception 'Invalid request' using errcode = 'check_violation';
  end if;

  shared := array(select distinct s from unnest(scopes) s where s <> 'openid' order by s);
  insert into public.pass_connections (user_id, client_id, scopes)
  values (caller, client, shared)
  on conflict (user_id, client_id) do update set scopes = excluded.scopes, granted_at = now();

  code := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.pass_sign_in_codes (code_hash, client_id, user_id, redirect_uri, scopes, code_challenge, nonce)
  values (encode(sha256(convert_to(code, 'UTF8')), 'hex'), client, caller, approve_pass_sign_in.redirect_uri,
    array['openid'] || shared, approve_pass_sign_in.code_challenge, nonce);
  return code;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.create_organization(org_name text, org_slug text)
 RETURNS organizations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  caller uuid := (select auth.uid());
  created public.organizations;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (org_name, org_slug, caller)
  returning * into created;

  insert into public.organization_members (organization_id, user_id, role)
  values (created.id, caller, 'owner');

  return created;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.has_org_role(org uuid, roles org_role[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$function$


;

CREATE OR REPLACE FUNCTION private.is_org_member(org uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$function$


;

CREATE OR REPLACE FUNCTION private.my_partners()
 RETURNS TABLE(organization_id uuid, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select distinct o.id, o.name
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid())
    and exists (select 1 from public.perks p where p.organization_id = o.id);
$function$


;

CREATE OR REPLACE FUNCTION private.notify_org_admins(org uuid, event text, data jsonb, link text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.notifications (user_id, kind, event, data, link)
  select m.user_id, 'order', event, data, link
  from public.organization_members m
  where m.organization_id = org and m.role in ('owner', 'admin');
$function$


;

CREATE OR REPLACE FUNCTION private.pass_card_check(client text, scanned text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  partner public.pass_partners;
  member uuid;
  badge public.student_badges;
  result jsonb;
begin
  select * into partner from public.pass_partners p where p.client_id = client and p.active;
  if partner.client_id is null then
    raise exception 'Unknown site' using errcode = 'no_data_found';
  end if;
  if (
    select count(*) from public.pass_card_checks c
    where c.client_id = client and not c.valid and c.checked_at > now() - interval '10 minutes'
  ) >= 30 then
    raise exception 'Too many checks' using errcode = 'P0001';
  end if;

  member := private.pass_holder(scanned);
  if member is not null and partner.mode = 'testing' and not exists (
    select 1 from public.organization_members m where m.organization_id = partner.organization_id and m.user_id = member
  ) then
    member := null;
  end if;
  insert into public.pass_card_checks (client_id, user_id, valid) values (client, member, member is not null);
  if member is null then
    return jsonb_build_object('valid', false);
  end if;

  result := jsonb_build_object(
    'valid', true,
    'sub', (select c.subject from public.pass_connections c where c.user_id = member and c.client_id = client),
    'given_name', private.first_name(member),
    'member_number', (select p.member_number from public.profiles p where p.id = member)
  );
  if 'student' = any (partner.answers) then
    select * into badge from public.student_badges b
    where b.user_id = member and b.valid_until >= private.baghdad_today();
    result := result || jsonb_build_object('student', case
      when badge.user_id is null then jsonb_build_object('verified', false)
      else jsonb_build_object('verified', true, 'university', badge.university_id, 'until', badge.valid_until)
    end);
  end if;
  if 'adult' = any (partner.answers) then
    result := result || jsonb_build_object('adult', private.is_adult(member));
  end if;
  if 'plus' = any (partner.answers) then
    result := result || jsonb_build_object('plus', (private.member_plan(member)).id is not null);
  end if;
  return result;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.pass_claims(member uuid, client text, scopes text[])
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
$function$


;

CREATE OR REPLACE FUNCTION private.pass_embed_allowed(partner pass_partners, member uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select partner.active
    and 'card_embed' = any (partner.answers)
    and (
      partner.mode = 'live'
      or exists (
        select 1 from public.organization_members m
        where m.organization_id = partner.organization_id and m.user_id = member
      )
    )
    and not exists (select 1 from public.profiles p where p.id = member and p.banned_at is not null)
$function$


;

CREATE OR REPLACE FUNCTION private.pending_invitations()
 RETURNS TABLE(token uuid, organization_id uuid, organization_name text, role org_role, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select i.token, i.organization_id, o.name, i.role, i.expires_at
  from public.invitations i
  join public.organizations o on o.id = i.organization_id
  where i.accepted_at is null
    and i.expires_at > now()
    and (
      i.invitee = lower(nullif(auth.jwt() ->> 'email', ''))
      -- Supabase stores phone numbers without the leading "+".
      or i.invitee = '+' || ltrim(nullif(auth.jwt() ->> 'phone', ''), '+')
    )
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id = i.organization_id
        and m.user_id = (select auth.uid())
    )
  order by i.created_at;
$function$


;

CREATE OR REPLACE FUNCTION private.protect_last_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.role = 'owner'
    and (tg_op = 'DELETE' or new.role <> 'owner')
    and exists (select 1 from public.organizations o where o.id = old.organization_id)
    and not exists (
      select 1 from public.organization_members m
      where m.organization_id = old.organization_id
        and m.role = 'owner'
        and m.user_id <> old.user_id
    )
  then
    raise exception 'An organization must keep at least one owner'
      using errcode = 'check_violation';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.request_plus_seat(org uuid, member uuid, plan text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  seat uuid;
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.organization_members m where m.organization_id = org and m.user_id = member
  ) then
    raise exception 'Not a member of this company' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.plans p where p.id = plan and p.audience = 'plus' and p.active
      and p.billing_interval = 'month'
  ) then
    raise exception 'Choose a monthly Plus plan' using errcode = 'check_violation';
  end if;
  insert into public.plus_seats (organization_id, user_id, plan_id)
  values (org, member, plan)
  returning id into seat;
  return seat;
end;
$function$


;

CREATE OR REPLACE FUNCTION private.shares_org_with(other uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.organization_members mine
    join public.organization_members theirs using (organization_id)
    where mine.user_id = (select auth.uid()) and theirs.user_id = other
  );
$function$


;

CREATE OR REPLACE FUNCTION public.account_deletion_blockers()
 RETURNS TABLE(organization_id uuid, name text, slug text, other_members bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select
    o.id,
    o.name,
    o.slug,
    (
      select count(*)
      from public.organization_members others
      where others.organization_id = o.id
        and others.user_id <> (select auth.uid())
    )
  from public.organizations o
  join public.organization_members mine
    on mine.organization_id = o.id
   and mine.user_id = (select auth.uid())
   and mine.role = 'owner'
  where not exists (
    select 1
    from public.organization_members co_owner
    where co_owner.organization_id = o.id
      and co_owner.role = 'owner'
      and co_owner.user_id <> (select auth.uid())
  )
  order by o.name;
$function$


;

-- Until the apps use the new name.
create view public.memberships with (security_invoker = true) as
  select organization_id, user_id, role, created_at from public.organization_members;
revoke all on public.memberships from anon, authenticated;
grant select, delete on public.memberships to authenticated;
grant update (role) on public.memberships to authenticated;
grant all on public.memberships to service_role;
