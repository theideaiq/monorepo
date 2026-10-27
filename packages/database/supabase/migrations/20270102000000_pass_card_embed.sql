-- The live Pass card on a partner's own site (theideaiq.com/pass/embed).
--
-- An app asks for `card_embed` in The IDEA Partners → Developers like any
-- other answer: it works at once in testing (for the company's own
-- members) and waits for our review before it goes live. The embed page
-- may only be framed by the company's verified domains.
--
-- The frame never holds the member's session or card secret. Once, in a
-- popup on theideaiq.com, the member allows the site; the popup hands the
-- frame an embed token (only its hash is kept here). With it the frame
-- reads the card and the current code, computed here, every 30 seconds.
-- The member sees the sites in Pass → Settings and can stop any of them.

-- ── The answer ─────────────────────────────────────────────────────────────

create or replace function private.pass_sensitive_answers()
returns text[]
language sql
immutable
set search_path = ''
as $$ select array['student_email', 'phone', 'birthdate', 'address', 'offline_access', 'card_embed'] $$;

alter table public.pass_partners drop constraint pass_partners_requested_answers_check;
alter table public.pass_partners add constraint pass_partners_requested_answers_check check (
  requested_answers <@ array[
    'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
    'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed'
  ]
);

alter table public.pass_partners drop constraint pass_partners_answers_check;
alter table public.pass_partners add constraint pass_partners_answers_check check (
  answers <@ array[
    'profile', 'email', 'membership', 'student', 'student_email', 'adult', 'plus',
    'phone', 'birthdate', 'address', 'card', 'offline_access', 'card_embed'
  ]
);

-- ── Embeds ─────────────────────────────────────────────────────────────────

create table public.pass_card_embeds (
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id text not null references public.pass_partners (client_id) on delete cascade,
  -- sha256 of the token the frame keeps (the token itself is never stored).
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  last_shown_at timestamptz,
  -- 90 days after it was last used.
  expires_at timestamptz not null default now() + interval '90 days',
  primary key (user_id, client_id)
);

comment on table public.pass_card_embeds is
  'Partner sites showing a member''s live Pass card in a frame (one token per site; its hash only).';

create index pass_card_embeds_client_idx on public.pass_card_embeds (client_id);

alter table public.pass_card_embeds enable row level security;

create policy "Your embeds; support sees all" on public.pass_card_embeds
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

revoke all on public.pass_card_embeds from anon, authenticated;
grant select (user_id, client_id, created_at, last_shown_at, expires_at) on public.pass_card_embeds to authenticated;

-- Whether `member`'s card may show in `partner`'s frame: the app is on and
-- may embed; in testing, only for the company's own members.
create function private.pass_embed_allowed(partner public.pass_partners, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select partner.active
    and 'card_embed' = any (partner.answers)
    and (
      partner.mode = 'live'
      or exists (
        select 1 from public.memberships m
        where m.organization_id = partner.organization_id and m.user_id = member
      )
    )
    and not exists (select 1 from public.profiles p where p.id = member and p.banned_at is not null)
$$;

-- The app's name and the origins that may frame its embed (each verified
-- domain and its subdomains), or no row when it may not embed.
create function private.pass_card_embed_site(client text)
returns table (name text, origins text[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.name, array(
    select o from public.pass_partner_domains d,
      lateral unnest(array['https://' || d.domain, 'https://*.' || d.domain]) o
    where d.organization_id = p.organization_id and d.verified_at is not null
    order by o
  )
  from public.pass_partners p
  where p.client_id = client and p.active and 'card_embed' = any (p.answers)
    and p.organization_id is not null;
$$;

-- The member allows a site (the popup on theideaiq.com): a new token for
-- this browser's frame, replacing any earlier one for the site.
create function private.start_pass_card_embed(client text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  partner public.pass_partners;
  token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into partner from public.pass_partners p where p.client_id = client;
  if partner.client_id is null or not private.pass_embed_allowed(partner, caller) then
    raise exception 'This site can''t show the card' using errcode = 'insufficient_privilege';
  end if;
  insert into private.pass_secrets (user_id) values (caller) on conflict (user_id) do nothing;
  insert into public.pass_card_embeds (user_id, client_id, token_hash)
  values (caller, client, private.sha256_hex(token))
  on conflict (user_id, client_id) do update set
    token_hash = excluded.token_hash,
    created_at = now(),
    last_shown_at = null,
    expires_at = now() + interval '90 days';
  return token;
end;
$$;

-- The frame's read: the card (as `pass_card()`) with the code for this
-- 30-second step and the next one, or null when the token is unknown,
-- expired or the site may no longer show it.
create function private.pass_card_embed(client text, token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  embed public.pass_card_embeds;
  partner public.pass_partners;
  seed bytea;
  now_step bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  select * into embed from public.pass_card_embeds e
  where e.client_id = client and e.token_hash = private.sha256_hex(coalesce(token, ''))
    and e.expires_at > now();
  if embed.user_id is null then
    return null;
  end if;
  select * into partner from public.pass_partners p where p.client_id = client;
  if not private.pass_embed_allowed(partner, embed.user_id) then
    return null;
  end if;
  select s.secret into seed from private.pass_secrets s where s.user_id = embed.user_id;
  if seed is null then
    return null;
  end if;
  -- At most once a minute, so a frame that stays open doesn't write every read.
  update public.pass_card_embeds set
    last_shown_at = now(),
    expires_at = now() + interval '90 days'
  where user_id = embed.user_id and client_id = client
    and (last_shown_at is null or last_shown_at < now() - interval '1 minute');
  return private.pass_card(embed.user_id) || jsonb_build_object(
    'step', now_step,
    'code', private.pass_code(seed, now_step),
    'next_code', private.pass_code(seed, now_step + 1)
  );
end;
$$;

-- The member stops a site showing their card (Pass → Settings).
create function private.end_pass_card_embed(client text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.pass_card_embeds e
  where e.user_id = (select auth.uid()) and e.client_id = client;
$$;

-- Disconnecting a site in Settings also stops its frame.
create function private.pass_connections_end_embed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.pass_card_embeds e where e.user_id = old.user_id and e.client_id = old.client_id;
  return old;
end;
$$;

create trigger pass_connections_end_embed
  after delete on public.pass_connections
  for each row execute function private.pass_connections_end_embed();

-- ── Public wrappers and grants ─────────────────────────────────────────────

create function public.pass_card_embed_site(client text)
returns table (name text, origins text[])
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.pass_card_embed_site(client) $$;

create function public.start_pass_card_embed(client text)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$ select private.start_pass_card_embed(client) $$;

create function public.pass_card_embed(client text, token text)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$ select private.pass_card_embed(client, token) $$;

create function public.end_pass_card_embed(client text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.end_pass_card_embed(client) $$;

revoke all on function private.pass_embed_allowed(public.pass_partners, uuid) from public, anon, authenticated;
revoke all on function private.pass_card_embed_site(text) from public;
revoke all on function private.start_pass_card_embed(text) from public, anon;
revoke all on function private.pass_card_embed(text, text) from public;
revoke all on function private.end_pass_card_embed(text) from public, anon;
revoke all on function private.pass_connections_end_embed() from public, anon, authenticated;
revoke all on function public.pass_card_embed_site(text) from public;
revoke all on function public.start_pass_card_embed(text) from public, anon;
revoke all on function public.pass_card_embed(text, text) from public;
revoke all on function public.end_pass_card_embed(text) from public, anon;

grant execute on function private.pass_card_embed_site(text) to anon, authenticated;
grant execute on function public.pass_card_embed_site(text) to anon, authenticated;
grant execute on function private.start_pass_card_embed(text) to authenticated;
grant execute on function public.start_pass_card_embed(text) to authenticated;
grant execute on function private.pass_card_embed(text, text) to anon, authenticated;
grant execute on function public.pass_card_embed(text, text) to anon, authenticated;
grant execute on function private.end_pass_card_embed(text) to authenticated;
grant execute on function public.end_pass_card_embed(text) to authenticated;
