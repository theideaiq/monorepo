-- The Club's join rules and order updates on Telegram.
--
-- Each chat Droid runs says who may join: anyone (`open`), members with The
-- IDEA Pass linked to Telegram (`pass`), or members of at least a Bulbs tier
-- (`tier`). Droid approves or declines join requests with
-- `telegram_join_check()`. Notifications are also sent on Telegram to
-- members who linked it, claimed once with `claim_telegram_notifications()`.

alter table public.telegram_chats
  add column join_rule text not null default 'open'
    check (join_rule in ('open', 'pass', 'tier')),
  add column join_tier public.bulb_tier,
  add constraint telegram_chats_join_tier
    check ((join_rule = 'tier') = (join_tier is not null));

comment on column public.telegram_chats.join_rule is
  'Who Droid lets in on a join request: open, pass (linked The IDEA Pass) or tier (join_tier and up).';

-- Whether a Telegram account may join a chat (service only): the chat's
-- rule, the tier it needs, and whether the account is linked.
create function public.telegram_join_check(chat bigint, member bigint)
returns table (allowed boolean, rule text, needed public.bulb_tier, linked boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  room public.telegram_chats;
  owner uuid;
  tier public.bulb_tier;
begin
  select * into room from public.telegram_chats c where c.id = chat;
  if room.id is null then
    return;
  end if;
  select m.user_id into owner from public.telegram_members m where m.id = member;
  if owner is not null and exists (
    select 1 from public.profiles p where p.id = owner and p.banned_at is not null
  ) then
    owner := null;
  end if;
  if owner is not null then
    tier := private.bulb_tier_for(private.bulb_spend(owner));
  end if;
  return query select
    case room.join_rule
      when 'open' then true
      when 'pass' then owner is not null
      else owner is not null and tier >= room.join_tier
    end,
    room.join_rule,
    room.join_tier,
    owner is not null;
end;
$$;

alter table public.notifications add column telegram_sent_at timestamptz;

-- Claims unsent notifications of members who linked Telegram (service
-- only), marking them sent in the same statement so each goes out once.
create function public.claim_telegram_notifications(
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
  locale text,
  telegram_id bigint
)
language sql
volatile
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.notifications as n
    set telegram_sent_at = now()
    where n.id in (
      select candidate.id
      from public.notifications as candidate
      where candidate.telegram_sent_at is null
        and candidate.created_at > now() - max_age
        and (notification_ids is null or candidate.id = any (notification_ids))
        and exists (
          select 1 from public.telegram_members m where m.user_id = candidate.user_id
        )
      order by candidate.created_at
      limit greatest(least(max_rows, 1000), 1)
      for update skip locked
    )
    returning n.id, n.user_id, n.kind, n.event, n.data, n.link
  )
  select claimed.id, claimed.user_id, claimed.kind, claimed.event, claimed.data,
    claimed.link, coalesce(profile.locale, 'ar'), member.id
  from claimed
  join public.telegram_members as member on member.user_id = claimed.user_id
  left join public.profiles as profile on profile.id = claimed.user_id;
$$;

revoke all on function public.telegram_join_check(bigint, bigint) from public, anon, authenticated;
grant execute on function public.telegram_join_check(bigint, bigint) to service_role;
revoke all on function public.claim_telegram_notifications(uuid[], interval, integer) from public, anon, authenticated;
grant execute on function public.claim_telegram_notifications(uuid[], interval, integer) to service_role;
