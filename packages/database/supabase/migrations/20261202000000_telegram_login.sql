-- Telegram sign-in and linking: members connect their Telegram account to
-- The IDEA Pass (My Pass → Settings, or by signing in with Telegram), which
-- sets `telegram_members.user_id`. The API verifies Telegram's OpenID
-- Connect ID token and then calls `link_telegram()` with the service key.
-- Connecting Telegram the first time earns 10 Bulbs.

-- Each member earns the Telegram bonus once.
create unique index bulb_entries_telegram_key
  on public.bulb_entries (user_id) where kind = 'bonus' and reason = 'telegram';

-- Links a verified Telegram account to a member (service only): refuses an
-- account linked to someone else, replaces the member's previous one, and
-- pays the bonus the first time.
create function public.link_telegram(
  member uuid,
  telegram_id bigint,
  username text default null,
  first_name text default null,
  last_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner uuid;
begin
  if member is null or telegram_id is null or telegram_id <= 0 then
    raise exception 'Invalid Telegram account' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.profiles where id = member and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select m.user_id into current_owner from public.telegram_members m
  where m.id = telegram_id for update;
  if current_owner is not null and current_owner <> member then
    raise exception 'Telegram linked elsewhere' using errcode = 'unique_violation';
  end if;

  update public.telegram_members set user_id = null
  where user_id = member and id <> telegram_id;

  insert into public.telegram_members (id, username, first_name, last_name, user_id)
  values (
    telegram_id,
    nullif(left(trim(coalesce(username, '')), 64), ''),
    nullif(left(trim(coalesce(first_name, '')), 128), ''),
    nullif(left(trim(coalesce(last_name, '')), 128), ''),
    member
  )
  on conflict (id) do update
    set username = coalesce(excluded.username, public.telegram_members.username),
      first_name = coalesce(excluded.first_name, public.telegram_members.first_name),
      last_name = coalesce(excluded.last_name, public.telegram_members.last_name),
      user_id = member;

  insert into public.bulb_entries (user_id, amount, kind, reason)
  values (member, 10, 'bonus', 'telegram')
  on conflict do nothing;
end;
$$;

comment on function public.link_telegram(uuid, bigint, text, text, text) is
  'Links a verified Telegram account to a member (API only, after checking Telegram''s ID token).';

-- The caller's linked Telegram account, if any.
create function private.my_telegram()
returns table (username text, first_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.username, m.first_name
  from public.telegram_members m
  where m.user_id = (select auth.uid());
$$;

create function public.my_telegram()
returns table (username text, first_name text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_telegram() $$;

-- Disconnects the caller's Telegram account (the bonus stays).
create function private.unlink_telegram()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  update public.telegram_members set user_id = null where user_id = (select auth.uid());
end;
$$;

create function public.unlink_telegram()
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.unlink_telegram() $$;

revoke all on function public.link_telegram(uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.link_telegram(uuid, bigint, text, text, text) to service_role;

revoke all on function private.my_telegram() from public, anon;
grant execute on function private.my_telegram() to authenticated, service_role;
revoke all on function public.my_telegram() from public, anon;
grant execute on function public.my_telegram() to authenticated, service_role;

revoke all on function private.unlink_telegram() from public, anon;
grant execute on function private.unlink_telegram() to authenticated, service_role;
revoke all on function public.unlink_telegram() from public, anon;
grant execute on function public.unlink_telegram() to authenticated, service_role;
