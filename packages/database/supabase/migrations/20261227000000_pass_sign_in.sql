-- Sign in with The IDEA Pass (program revision v1, after step 5).
--
-- Other sites (partners, starting with auibsal.org) sign people in with
-- their Pass through The IDEA's own OpenID Connect provider: the consent
-- screen is the website's /oauth/authorize, and the API (apps/api/app/oidc)
-- exchanges codes for tokens it signs itself. Supabase Auth's own OAuth
-- server is not used: its access tokens act as the person's session on
-- Supabase Auth, so a partner could change the person's password.
--
-- Partners get answers, never raw data, and only those the person agreed
-- to share each time: their name (profile), email, and yes/no answers
-- (a verified student, where and until when; 18 or over; a The IDEA Plus
-- member). Each partner sees its own id for a person (`subject`), so
-- partners can't match people between them.

-- ── Partners ──────────────────────────────────────────────────────────────

-- 1 to 10 exact addresses: https, or http://localhost for development.
create function private.valid_redirect_uris(uris text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(uris) between 1 and 10
    and not exists (
      select 1 from unnest(uris) u
      where u !~ '^(https://[^\s#]+|http://localhost(:[0-9]+)?/[^\s#]*)$' or char_length(u) > 300
    )
$$;

create table public.pass_partners (
  client_id text primary key check (client_id ~ '^pass_[a-z0-9]{24}$'),
  name text not null check (char_length(name) between 2 and 80),
  website text not null check (website ~ '^https://[^\s/]+' and char_length(website) <= 200),
  -- Where the person may be sent back to (exact matches).
  redirect_uris text[] not null check (private.valid_redirect_uris(redirect_uris)),
  -- What it may ask, besides signing in (scopes).
  answers text[] not null default '{profile,email}'
    check (answers <@ array['profile', 'email', 'student', 'adult', 'plus']),
  -- SHA-256 (hex) of the client secret; the secret is shown once.
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$'),
  organization_id uuid references public.organizations (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pass_partners is
  'Sites people sign in to with The IDEA Pass (OpenID Connect clients), and what each may ask.';

create index pass_partners_organization_idx on public.pass_partners (organization_id);

create trigger pass_partners_updated_at
  before update on public.pass_partners
  for each row execute function private.set_updated_at();

alter table public.pass_partners enable row level security;

create policy "Active partners; support sees all" on public.pass_partners
  for select to authenticated
  using (active or (select private.has_staff_role('{support}')));
create policy "Support adds partners" on public.pass_partners
  for insert to authenticated
  with check ((select private.has_staff_role('{support}')));
create policy "Support edits partners" on public.pass_partners
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

-- Nobody reads the secret's hash back (only the API, as the service role).
revoke all on public.pass_partners from anon, authenticated;
grant select (client_id, name, website, redirect_uris, answers, organization_id, active, created_at, updated_at)
  on public.pass_partners to authenticated;
grant insert, update on public.pass_partners to authenticated;

-- ── Connections ───────────────────────────────────────────────────────────

create table public.pass_connections (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  -- The person's id at this partner (the id token's `sub`).
  subject uuid not null default gen_random_uuid() unique,
  -- What they agreed to share the last time.
  scopes text[] not null default '{}',
  granted_at timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (user_id, client_id)
);

comment on table public.pass_connections is
  'Partner sites a person signed in to with their Pass, and what they shared the last time.';

create index pass_connections_client_idx on public.pass_connections (client_id);

alter table public.pass_connections enable row level security;

create policy "Your connections; support sees all" on public.pass_connections
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

revoke all on public.pass_connections from anon, authenticated;
grant select on public.pass_connections to authenticated;

-- ── Codes and access tokens (the API only) ────────────────────────────────

create table public.pass_sign_in_codes (
  -- SHA-256 (hex) of the code.
  code_hash text primary key check (code_hash ~ '^[0-9a-f]{64}$'),
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redirect_uri text not null,
  scopes text[] not null,
  code_challenge text not null check (code_challenge ~ '^[A-Za-z0-9_-]{43,128}$'),
  nonce text check (char_length(nonce) <= 200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes',
  used_at timestamptz
);

create index pass_sign_in_codes_client_idx on public.pass_sign_in_codes (client_id);
create index pass_sign_in_codes_user_idx on public.pass_sign_in_codes (user_id);

create table public.pass_access_tokens (
  -- SHA-256 (hex) of the token.
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index pass_access_tokens_client_idx on public.pass_access_tokens (client_id);
create index pass_access_tokens_user_idx on public.pass_access_tokens (user_id);

alter table public.pass_sign_in_codes enable row level security;
alter table public.pass_access_tokens enable row level security;

create policy "No client access" on public.pass_sign_in_codes
  as restrictive for all to anon, authenticated using (false);
create policy "No client access" on public.pass_access_tokens
  as restrictive for all to anon, authenticated using (false);

revoke all on public.pass_sign_in_codes, public.pass_access_tokens from anon, authenticated;

-- ── What a partner learns ─────────────────────────────────────────────────

-- The claims for a member at a partner, for the scopes they shared: `sub`
-- always, then the answers, worked out now (the API only).
create function private.pass_claims(member uuid, client text, scopes text[])
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

  if 'profile' = any (scopes) then
    given := nullif(split_part(trim(coalesce(person.full_name, '')), ' ', 1), '');
    result := result || jsonb_strip_nulls(jsonb_build_object(
      'name', nullif(trim(person.full_name), ''),
      'given_name', given,
      'family_name', nullif(trim(substr(trim(coalesce(person.full_name, '')), char_length(coalesce(given, '')) + 1)), ''),
      'locale', person.locale
    ));
  end if;
  if 'email' = any (scopes) then
    result := result || (
      select jsonb_build_object('email', u.email, 'email_verified', u.email_confirmed_at is not null)
      from auth.users u where u.id = member
    );
  end if;
  if 'student' = any (scopes) then
    select * into badge from public.student_badges b
    where b.user_id = member and b.valid_until >= private.baghdad_today();
    result := result || jsonb_build_object('student', case
      when badge.user_id is null then jsonb_build_object('verified', false)
      else jsonb_build_object('verified', true, 'university', badge.university_id, 'until', badge.valid_until)
    end);
  end if;
  if 'adult' = any (scopes) then
    result := result || jsonb_build_object('adult', private.is_adult(member));
  end if;
  if 'plus' = any (scopes) then
    result := result || jsonb_build_object('plus', (private.member_plan(member)).id is not null);
  end if;
  return result;
end;
$$;

create function public.pass_claims(member uuid, client text, scopes text[])
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.pass_claims(member, client, scopes) $$;

-- ── Consent (the website's /oauth/authorize) ──────────────────────────────

-- The person allows a partner: checks the request against the partner,
-- remembers what they shared and returns a one-use code (5 minutes) for
-- the partner to exchange at the API.
create function private.approve_pass_sign_in(
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

create function public.approve_pass_sign_in(
  client text, redirect_uri text, scopes text[], code_challenge text, nonce text default null
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.approve_pass_sign_in(client, redirect_uri, scopes, code_challenge, nonce) $$;

-- Pass → Settings → Connected sites: stop sharing with a partner (its
-- access tokens stop working; signing in again asks again).
create function private.disconnect_pass_partner(client text)
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
  delete from public.pass_access_tokens where user_id = caller and client_id = client;
  delete from public.pass_sign_in_codes where user_id = caller and client_id = client;
  delete from public.pass_connections where user_id = caller and client_id = client;
end;
$$;

create function public.disconnect_pass_partner(client text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.disconnect_pass_partner(client) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.pass_claims(uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.pass_claims(uuid, text, text[]) from public, anon, authenticated;
grant execute on function private.pass_claims(uuid, text, text[]) to service_role;
grant execute on function public.pass_claims(uuid, text, text[]) to service_role;

revoke all on function private.approve_pass_sign_in(text, text, text[], text, text) from public, anon;
revoke all on function public.approve_pass_sign_in(text, text, text[], text, text) from public, anon;
grant execute on function private.approve_pass_sign_in(text, text, text[], text, text) to authenticated;
grant execute on function public.approve_pass_sign_in(text, text, text[], text, text) to authenticated;

revoke all on function private.disconnect_pass_partner(text) from public, anon;
revoke all on function public.disconnect_pass_partner(text) from public, anon;
grant execute on function private.disconnect_pass_partner(text) to authenticated;
grant execute on function public.disconnect_pass_partner(text) to authenticated;
