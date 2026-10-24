-- Push notifications for The IDEA Spark's iOS and Android apps.
--
-- push_devices: one row per device token (Firebase Cloud Messaging), owned
-- by the signed-in user who registered it. The app registers through the
-- API (POST /push/register → public.register_push_device), which moves a
-- token to the caller when the device changes accounts.
--
-- notifications.pushed_at: set when apps/api has handed a notification to
-- the push sender, so the database webhook and the catch-up cron never push
-- the same row twice (public.claim_push_notifications).

create table public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  token text not null unique check (char_length(token) between 16 and 4096),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index push_devices_user_idx on public.push_devices (user_id);

alter table public.push_devices enable row level security;

create policy "Users see their push devices"
  on public.push_devices for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users remove their push devices"
  on public.push_devices for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_devices from anon, authenticated;
grant select, delete on public.push_devices to authenticated;
grant all on public.push_devices to service_role;

-- Registers (or refreshes) the caller's device. A token is unique per
-- device, so a token registered by another account moves to the caller:
-- whoever holds the device receives its notifications.
create function private.register_push_device(device_token text, device_platform text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  device_id uuid;
begin
  if caller is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if device_platform is null or device_platform not in ('ios', 'android') then
    raise exception 'unknown platform' using errcode = '22023';
  end if;

  insert into public.push_devices (user_id, platform, token)
  values (caller, device_platform, device_token)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen = now()
  returning id into device_id;

  return device_id;
end;
$$;

create function public.register_push_device(device_token text, device_platform text)
returns uuid
language sql volatile
security invoker
set search_path = ''
as $$ select private.register_push_device($1, $2) $$;

revoke all on function private.register_push_device(text, text) from public, anon, authenticated;
grant execute on function private.register_push_device(text, text) to authenticated, service_role;
revoke all on function public.register_push_device(text, text) from public, anon, authenticated, service_role;
grant execute on function public.register_push_device(text, text) to authenticated;
grant execute on function public.register_push_device(text, text) to service_role;

-- ── Notifications → push ────────────────────────────────────────────────────

alter table public.notifications add column pushed_at timestamptz;

-- Notifications that existed before push are not pushed.
update public.notifications set pushed_at = created_at;

create index notifications_unpushed_idx on public.notifications (created_at)
  where pushed_at is null;

-- Service only (apps/api): marks unpushed notifications as pushed and
-- returns them with the recipient's language. With ids, only those rows
-- (the database webhook); without, the oldest unpushed rows of the last
-- max_age (the catch-up cron). Rows claimed once are never returned again.
create function public.claim_push_notifications(
  notification_ids uuid[] default null,
  max_age interval default interval '24 hours',
  max_rows integer default 500
)
returns table (
  id uuid,
  user_id uuid,
  kind public.notification_kind,
  event text,
  data jsonb,
  link text,
  locale text
)
language sql volatile
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.notifications as n
    set pushed_at = now()
    where n.id in (
      select candidate.id
      from public.notifications as candidate
      where candidate.pushed_at is null
        and candidate.created_at > now() - max_age
        and (notification_ids is null or candidate.id = any (notification_ids))
      order by candidate.created_at
      limit greatest(least(max_rows, 1000), 1)
      for update skip locked
    )
    returning n.id, n.user_id, n.kind, n.event, n.data, n.link
  )
  select claimed.id, claimed.user_id, claimed.kind, claimed.event, claimed.data,
    claimed.link, coalesce(profile.locale, 'ar')
  from claimed
  left join public.profiles as profile on profile.id = claimed.user_id;
$$;

revoke all on function public.claim_push_notifications(uuid[], interval, integer) from public, anon, authenticated;
grant execute on function public.claim_push_notifications(uuid[], interval, integer) to service_role;
