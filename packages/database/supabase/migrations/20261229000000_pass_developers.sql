-- Sign in with The IDEA Pass: partners register their own apps.
--
-- A company's owners and admins (The IDEA Business → Developers) verify
-- their domains, then register apps whose website and https return
-- addresses are on those domains (http://localhost is allowed for
-- development). They get the client secret once, rotate it (the old one
-- works 24 more hours) or upload public keys instead (private_key_jwt).
--
-- A new app is in testing: only the company's own members can sign in.
-- Going live is the company's choice. The basic answers (name, email,
-- membership, student yes/no, 18+, Plus, the card) work at once; the
-- sensitive ones (student email, phone, birthdate, address, refresh
-- tokens) wait for our review, and until then live apps don't ask them.
-- Staff can suspend any app.

-- ── Helpers ────────────────────────────────────────────────────────────────

-- The answers we review before a live app may ask them.
create function private.pass_sensitive_answers()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['student_email', 'phone', 'birthdate', 'address', 'offline_access'] $$;

-- The host of an http(s) address, lower-cased.
create function private.url_host(url text)
returns text
language sql
immutable
set search_path = ''
as $$ select lower(substring(url from '^https?://([^/:?#]+)')) $$;

-- A new client secret (base64url, 256 bits).
create function private.new_pass_secret()
returns text
language sql
volatile
set search_path = ''
as $$ select rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=') $$;

create function private.sha256_hex(value text)
returns text
language sql
immutable
set search_path = ''
as $$ select encode(sha256(convert_to(value, 'UTF8')), 'hex') $$;

-- ── Domains ───────────────────────────────────────────────────────────────

create table public.pass_partner_domains (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  domain text not null check (
    char_length(domain) <= 253
    and domain ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  ),
  -- Published by the company (DNS TXT record or a file) to prove control.
  token text not null default encode(extensions.gen_random_bytes(16), 'hex'),
  verified_at timestamptz,
  checked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, domain)
);

comment on table public.pass_partner_domains is
  'Domains a company proved it controls, for its Sign in with The IDEA Pass apps (verified by the API only).';

create index pass_partner_domains_created_by_idx on public.pass_partner_domains (created_by);

alter table public.pass_partner_domains enable row level security;

create policy "Members and support see domains" on public.pass_partner_domains
  for select to authenticated
  using (private.is_org_member(organization_id) or (select private.has_staff_role('{support}')));

revoke all on public.pass_partner_domains from anon, authenticated;
grant select on public.pass_partner_domains to authenticated;

-- Whether `host` is one of the company's verified domains or under one.
create function private.pass_host_verified(org uuid, host text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pass_partner_domains d
    where d.organization_id = org and d.verified_at is not null
      and (host = d.domain or host like '%.' || d.domain)
  )
$$;

-- ── Apps ──────────────────────────────────────────────────────────────────

alter table public.pass_partners
  -- testing: only the company's members can sign in; live: everyone.
  add column mode text not null default 'live' check (mode in ('testing', 'live')),
  -- What the company asks for; `answers` is what the app may ask now.
  add column requested_answers text[] not null default '{profile,email}',
  -- The sensitive answers we approved.
  add column approved_answers text[] not null default '{}',
  -- pending: sensitive answers wait for review; declined: we said no.
  add column review_status text check (review_status in ('pending', 'declined')),
  add column review_note text check (char_length(review_note) <= 500),
  add column reviewed_at timestamptz,
  -- The company's switch, and ours (`active` is both).
  add column enabled boolean not null default true,
  add column suspended_at timestamptz,
  -- After a rotation the previous secret works until then.
  add column previous_secret_hash text check (previous_secret_hash ~ '^[0-9a-f]{64}$'),
  add column previous_secret_until timestamptz,
  -- Public keys for private_key_jwt (a JWK set).
  add column public_jwks jsonb check (
    public_jwks is null or (
      jsonb_typeof(public_jwks -> 'keys') = 'array'
      and jsonb_array_length(public_jwks -> 'keys') between 1 and 5
    )
  ),
  add column created_by uuid references auth.users (id) on delete set null,
  add constraint pass_partners_requested_answers_check check (
    requested_answers <@ array[
      'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
      'phone', 'birthdate', 'address', 'card', 'offline_access'
    ]
  ),
  add constraint pass_partners_approved_answers_check check (
    approved_answers <@ private.pass_sensitive_answers()
  );

create index pass_partners_created_by_idx on public.pass_partners (created_by);

-- Partners registered by staff keep everything they had.
update public.pass_partners set
  requested_answers = answers,
  approved_answers = array(select a from unnest(answers) a where a = any (private.pass_sensitive_answers())),
  enabled = active;

-- `answers` follows what was asked and approved; `active` both switches.
-- Only staff write the table directly (companies go through the functions
-- below), so setting `answers` or `active` directly is a staff decision:
-- what they set is approved, and turning it off suspends it.
create function private.pass_partners_derive()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  sensitive text[] := private.pass_sensitive_answers();
  unapproved text[];
begin
  if tg_op = 'INSERT' then
    if new.answers is distinct from '{profile,email}'::text[]
      and new.requested_answers = '{profile,email}'::text[]
    then
      new.requested_answers := new.answers;
      new.approved_answers := array(select a from unnest(new.answers) a where a = any (sensitive));
    end if;
    if not new.active then
      new.enabled := false;
    end if;
  else
    if new.answers is distinct from old.answers
      and new.requested_answers is not distinct from old.requested_answers
    then
      new.requested_answers := new.answers;
      new.approved_answers := array(select a from unnest(new.answers) a where a = any (sensitive));
    end if;
    if new.active is distinct from old.active
      and new.enabled is not distinct from old.enabled
      and new.suspended_at is not distinct from old.suspended_at
    then
      new.suspended_at := case when new.active then null else now() end;
      new.enabled := new.enabled or new.active;
    end if;
  end if;
  new.requested_answers := array(select distinct a from unnest(new.requested_answers) a order by a);
  new.approved_answers := array(
    select distinct a from unnest(new.approved_answers) a where a = any (new.requested_answers) order by a
  );
  unapproved := array(
    select a from unnest(new.requested_answers) a
    where a = any (sensitive) and not a = any (new.approved_answers)
  );
  if cardinality(unapproved) = 0 then
    new.review_status := null;
  elsif tg_op = 'INSERT' or new.requested_answers is distinct from old.requested_answers then
    new.review_status := 'pending';
    new.review_note := null;
  end if;
  new.answers := case
    when new.mode = 'testing' then new.requested_answers
    else array(select a from unnest(new.requested_answers) a where not a = any (unapproved))
  end;
  new.active := new.enabled and new.suspended_at is null;
  return new;
end;
$$;

create trigger pass_partners_derive
  before insert or update on public.pass_partners
  for each row execute function private.pass_partners_derive();

-- Members see their company's apps (any state).
drop policy "Active partners; support sees all" on public.pass_partners;
create policy "Active partners; members and support see all" on public.pass_partners
  for select to authenticated
  using (
    active
    or (organization_id is not null and private.is_org_member(organization_id))
    or (select private.has_staff_role('{support}'))
  );

grant select (mode, review_status) on public.pass_partners to authenticated;

-- One-use client assertions (private_key_jwt), until they expire (the API only).
create table public.pass_client_assertions (
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  jti text not null check (char_length(jti) between 8 and 200),
  expires_at timestamptz not null,
  primary key (client_id, jti)
);

comment on table public.pass_client_assertions is
  'Client assertions partners signed in with (private_key_jwt), so each works once.';

create index pass_client_assertions_expires_idx on public.pass_client_assertions (expires_at);

alter table public.pass_client_assertions enable row level security;

create policy "No client access" on public.pass_client_assertions
  as restrictive for all to anon, authenticated using (false);

revoke all on public.pass_client_assertions from anon, authenticated;

-- ── The company's side (owners and admins) ────────────────────────────────

create function private.require_org_admin(org uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if org is null or not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- The app, when the caller may manage it (its company's owner or admin).
create function private.managed_pass_app(client text)
returns public.pass_partners
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  app public.pass_partners;
begin
  select * into app from public.pass_partners p where p.client_id = client;
  if app.client_id is null or not private.has_org_role(app.organization_id, '{owner,admin}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return app;
end;
$$;

-- Adds a domain to verify (not ours; at most 10 per company).
create function private.add_pass_domain(org uuid, name text)
returns public.pass_partner_domains
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := lower(trim(trailing '.' from trim(coalesce(name, ''))));
  saved public.pass_partner_domains;
begin
  perform private.require_org_admin(org);
  if clean = 'theideaiq.com' or clean like '%.theideaiq.com' or clean in ('localhost', 'vercel.app', 'netlify.app', 'github.io', 'pages.dev') then
    raise exception 'This domain can''t be used' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.pass_partner_domains d where d.organization_id = org) >= 10 then
    raise exception 'Too many domains' using errcode = 'check_violation';
  end if;
  insert into public.pass_partner_domains (organization_id, domain, created_by)
  values (org, clean, (select auth.uid()))
  on conflict (organization_id, domain) do update set domain = excluded.domain
  returning * into saved;
  return saved;
end;
$$;

-- Removes a domain no app of the company uses.
create function private.remove_pass_domain(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_domain public.pass_partner_domains;
begin
  select * into found_domain from public.pass_partner_domains d where d.id = target;
  perform private.require_org_admin(found_domain.organization_id);
  if exists (
    select 1 from public.pass_partners p, unnest(p.redirect_uris || p.website) u
    where p.organization_id = found_domain.organization_id
      and (private.url_host(u) = found_domain.domain or private.url_host(u) like '%.' || found_domain.domain)
  ) then
    raise exception 'An app uses this domain' using errcode = 'check_violation';
  end if;
  delete from public.pass_partner_domains where id = target;
end;
$$;

-- The website and https return addresses must be on verified domains.
create function private.check_pass_app_addresses(org uuid, website text, redirect_uris text[])
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if website !~ '^https://' or not private.pass_host_verified(org, private.url_host(website)) then
    raise exception 'The website isn''t on a verified domain' using errcode = 'check_violation';
  end if;
  if not private.valid_redirect_uris(redirect_uris) then
    raise exception 'Invalid return address' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from unnest(redirect_uris) u
    where u ~ '^https://' and not private.pass_host_verified(org, private.url_host(u))
  ) then
    raise exception 'A return address isn''t on a verified domain' using errcode = 'check_violation';
  end if;
end;
$$;

-- Registers an app (in testing) and returns its client id and secret,
-- shown once.
create function private.create_pass_app(
  org uuid, name text, website text, redirect_uris text[], answers text[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  client text := 'pass_' || encode(extensions.gen_random_bytes(12), 'hex');
  secret text := private.new_pass_secret();
begin
  perform private.require_org_admin(org);
  if (select count(*) from public.pass_partners p where p.organization_id = org) >= 10 then
    raise exception 'Too many apps' using errcode = 'check_violation';
  end if;
  perform private.check_pass_app_addresses(org, website, redirect_uris);
  insert into public.pass_partners (
    client_id, name, website, redirect_uris, requested_answers, secret_hash,
    organization_id, mode, created_by
  ) values (
    client, trim(name), website, redirect_uris, coalesce(answers, '{}'), private.sha256_hex(secret),
    org, 'testing', (select auth.uid())
  );
  return jsonb_build_object('client_id', client, 'client_secret', secret);
end;
$$;

-- Changes an app's name, addresses and answers.
create function private.update_pass_app(
  client text, name text, website text, redirect_uris text[], answers text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.pass_partners := private.managed_pass_app(client);
begin
  perform private.check_pass_app_addresses(app.organization_id, website, redirect_uris);
  update public.pass_partners set
    name = trim(update_pass_app.name),
    website = update_pass_app.website,
    redirect_uris = update_pass_app.redirect_uris,
    requested_answers = coalesce(update_pass_app.answers, '{}')
  where client_id = client;
end;
$$;

-- Testing or live, on or off.
create function private.set_pass_app_state(client text, live boolean, enabled boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.managed_pass_app(client);
  update public.pass_partners set
    mode = case when live then 'live' else 'testing' end,
    enabled = set_pass_app_state.enabled
  where client_id = client;
end;
$$;

-- A new secret; the previous one works 24 more hours (or not at all).
create function private.rotate_pass_app_secret(client text, keep_previous boolean default true)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.pass_partners := private.managed_pass_app(client);
  secret text := private.new_pass_secret();
begin
  update public.pass_partners set
    secret_hash = private.sha256_hex(secret),
    previous_secret_hash = case when keep_previous then app.secret_hash end,
    previous_secret_until = case when keep_previous then now() + interval '24 hours' end
  where client_id = client;
  return secret;
end;
$$;

-- Stops the previous secret now.
create function private.end_previous_pass_secret(client text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.managed_pass_app(client);
  update public.pass_partners set previous_secret_hash = null, previous_secret_until = null
  where client_id = client;
end;
$$;

-- Public keys for private_key_jwt (EC P-256 or RSA, no private parts);
-- null removes them.
create function private.set_pass_app_keys(client text, jwks jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.managed_pass_app(client);
  if jwks is not null and (
    jsonb_typeof(jwks -> 'keys') <> 'array'
    or jsonb_array_length(jwks -> 'keys') not between 1 and 5
    or exists (
      select 1 from jsonb_array_elements(jwks -> 'keys') k
      where k ?| array['d', 'p', 'q', 'dp', 'dq', 'qi', 'k']
        or not (
          (k ->> 'kty' = 'EC' and k ->> 'crv' = 'P-256' and k ? 'x' and k ? 'y')
          or (k ->> 'kty' = 'RSA' and k ? 'n' and k ? 'e' and char_length(k ->> 'n') >= 342)
        )
    )
  ) then
    raise exception 'Invalid keys' using errcode = 'check_violation';
  end if;
  update public.pass_partners set public_jwks = jwks where client_id = client;
end;
$$;

-- The company's apps with their management details and the last 30 days'
-- numbers; staff (support) see every app with org null.
create function private.pass_apps(org uuid default null)
returns table (
  client_id text,
  organization_id uuid,
  organization_name text,
  name text,
  website text,
  redirect_uris text[],
  requested_answers text[],
  answers text[],
  mode text,
  enabled boolean,
  suspended boolean,
  review_status text,
  review_note text,
  previous_secret_until timestamptz,
  has_keys boolean,
  connections bigint,
  sign_ins_30d bigint,
  card_checks_30d bigint,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if org is null then
    if not private.has_staff_role('{support}') then
      raise exception 'Not allowed' using errcode = 'insufficient_privilege';
    end if;
  elsif not private.is_org_member(org) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
  select p.client_id, p.organization_id, o.name, p.name, p.website, p.redirect_uris,
    p.requested_answers, p.answers, p.mode, p.enabled, p.suspended_at is not null,
    p.review_status, p.review_note,
    case when p.previous_secret_until > now() then p.previous_secret_until end,
    p.public_jwks is not null,
    (select count(*) from public.pass_connections c where c.client_id = p.client_id),
    (select count(*) from public.pass_connections c
      where c.client_id = p.client_id and c.last_used_at > now() - interval '30 days'),
    (select count(*) from public.pass_card_checks k
      where k.client_id = p.client_id and k.checked_at > now() - interval '30 days'),
    p.created_at
  from public.pass_partners p
  left join public.organizations o on o.id = p.organization_id
  where org is null or p.organization_id = org
  order by p.created_at desc;
end;
$$;

-- ── Staff ─────────────────────────────────────────────────────────────────

-- Approves or declines an app's sensitive answers, and tells the company.
create function private.review_pass_app(client text, approve boolean, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  app public.pass_partners;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into app from public.pass_partners p where p.client_id = client for update;
  if app.client_id is null then
    raise exception 'Unknown app' using errcode = 'no_data_found';
  end if;
  if approve then
    update public.pass_partners set
      approved_answers = array(
        select a from unnest(app.requested_answers) a where a = any (private.pass_sensitive_answers())
      ),
      review_note = nullif(trim(coalesce(note, '')), ''),
      reviewed_at = now()
    where client_id = client;
  else
    update public.pass_partners set
      review_status = 'declined',
      review_note = nullif(trim(coalesce(note, '')), ''),
      reviewed_at = now()
    where client_id = client;
  end if;
  if app.organization_id is not null then
    perform private.notify_org_admins(app.organization_id,
      case when approve then 'pass_app_approved' else 'pass_app_declined' end,
      jsonb_build_object('name', app.name), '/business/developers');
  end if;
end;
$$;

-- Suspends an app (or lifts it).
create function private.suspend_pass_app(client text, suspend boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.pass_partners set suspended_at = case when suspend then now() end
  where client_id = client;
end;
$$;

-- ── Testing apps sign in their company's members only ─────────────────────

create or replace function private.approve_pass_sign_in(
  client text, redirect_uri text, scopes text[], code_challenge text, nonce text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
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
    select 1 from public.memberships m where m.organization_id = partner.organization_id and m.user_id = caller
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
$$;

-- Card checks by a testing app answer for its company's members only.
create or replace function private.pass_card_check(client text, scanned text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    select 1 from public.memberships m where m.organization_id = partner.organization_id and m.user_id = member
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
$$;

-- Claims only for what the app may still ask (a withdrawn approval stops
-- the answer, refresh tokens included).
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

-- ── Public wrappers ───────────────────────────────────────────────────────

create function public.add_pass_domain(org uuid, name text)
returns public.pass_partner_domains
language sql security invoker set search_path = ''
as $$ select private.add_pass_domain(org, name) $$;

create function public.remove_pass_domain(target uuid)
returns void
language sql security invoker set search_path = ''
as $$ select private.remove_pass_domain(target) $$;

create function public.create_pass_app(
  org uuid, name text, website text, redirect_uris text[], answers text[]
)
returns jsonb
language sql security invoker set search_path = ''
as $$ select private.create_pass_app(org, name, website, redirect_uris, answers) $$;

create function public.update_pass_app(
  client text, name text, website text, redirect_uris text[], answers text[]
)
returns void
language sql security invoker set search_path = ''
as $$ select private.update_pass_app(client, name, website, redirect_uris, answers) $$;

create function public.set_pass_app_state(client text, live boolean, enabled boolean)
returns void
language sql security invoker set search_path = ''
as $$ select private.set_pass_app_state(client, live, enabled) $$;

create function public.rotate_pass_app_secret(client text, keep_previous boolean default true)
returns text
language sql security invoker set search_path = ''
as $$ select private.rotate_pass_app_secret(client, keep_previous) $$;

create function public.end_previous_pass_secret(client text)
returns void
language sql security invoker set search_path = ''
as $$ select private.end_previous_pass_secret(client) $$;

create function public.set_pass_app_keys(client text, jwks jsonb)
returns void
language sql security invoker set search_path = ''
as $$ select private.set_pass_app_keys(client, jwks) $$;

create function public.pass_apps(org uuid default null)
returns table (
  client_id text,
  organization_id uuid,
  organization_name text,
  name text,
  website text,
  redirect_uris text[],
  requested_answers text[],
  answers text[],
  mode text,
  enabled boolean,
  suspended boolean,
  review_status text,
  review_note text,
  previous_secret_until timestamptz,
  has_keys boolean,
  connections bigint,
  sign_ins_30d bigint,
  card_checks_30d bigint,
  created_at timestamptz
)
language sql stable security invoker set search_path = ''
as $$ select * from private.pass_apps(org) $$;

create function public.review_pass_app(client text, approve boolean, note text default null)
returns void
language sql security invoker set search_path = ''
as $$ select private.review_pass_app(client, approve, note) $$;

create function public.suspend_pass_app(client text, suspend boolean)
returns void
language sql security invoker set search_path = ''
as $$ select private.suspend_pass_app(client, suspend) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

-- The constant is read by a check constraint, as the writer.
grant execute on function private.pass_sensitive_answers() to authenticated;

revoke all on function
  private.url_host(text), private.pass_host_verified(uuid, text),
  private.new_pass_secret(), private.sha256_hex(text), private.pass_partners_derive(),
  private.require_org_admin(uuid), private.managed_pass_app(text),
  private.check_pass_app_addresses(uuid, text, text[])
from public, anon, authenticated;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'add_pass_domain(uuid, text)', 'remove_pass_domain(uuid)',
    'create_pass_app(uuid, text, text, text[], text[])', 'update_pass_app(text, text, text, text[], text[])',
    'set_pass_app_state(text, boolean, boolean)', 'rotate_pass_app_secret(text, boolean)',
    'end_previous_pass_secret(text)', 'set_pass_app_keys(text, jsonb)', 'pass_apps(uuid)',
    'review_pass_app(text, boolean, text)', 'suspend_pass_app(text, boolean)'
  ] loop
    execute format('revoke all on function private.%s from public, anon', fn);
    execute format('grant execute on function private.%s to authenticated', fn);
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;

revoke all on function private.approve_pass_sign_in(text, text, text[], text, text) from public, anon;
grant execute on function private.approve_pass_sign_in(text, text, text[], text, text) to authenticated;
revoke all on function private.pass_card_check(text, text) from public, anon, authenticated;
grant execute on function private.pass_card_check(text, text) to service_role;
revoke all on function private.pass_claims(uuid, text, text[]) from public, anon, authenticated;
grant execute on function private.pass_claims(uuid, text, text[]) to service_role;
