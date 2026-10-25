-- Automatic posts to the Club's topics.
--
-- Each chat Droid runs can post news (published posts of The IDEA Post),
-- events (published, upcoming) and new arrivals (products that go on sale or
-- for rent) to one of its forum topics: `*_topic` is the topic's thread id,
-- 0 for the chat itself (General, or a channel), null not to post. Triggers
-- queue what's new in `telegram_posts`; apps/api sends it (a Database
-- Webhook on inserts, and a daily catch-up), claiming each row once with
-- `claim_telegram_posts()`.

alter table public.telegram_chats
  add column news_topic integer check (news_topic >= 0),
  add column events_topic integer check (events_topic >= 0),
  add column arrivals_topic integer check (arrivals_topic >= 0),
  add column post_locale text not null default 'ar'
    check (post_locale in ('ar', 'en'));

comment on column public.telegram_chats.news_topic is
  'Forum topic (message_thread_id) for The IDEA Post''s news; 0 = the chat itself, null = off.';

create type public.telegram_post_kind as enum ('news', 'events', 'arrivals');

create table public.telegram_posts (
  id uuid primary key default gen_random_uuid(),
  kind public.telegram_post_kind not null,
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (kind, ref_id)
);

create index telegram_posts_unsent_idx on public.telegram_posts (created_at)
  where sent_at is null;

alter table public.telegram_posts enable row level security;

create policy "Support and marketing see the Telegram post queue"
  on public.telegram_posts for select to authenticated
  using (private.has_staff_role('{support,marketing}'));

revoke all on public.telegram_posts from anon, authenticated;
grant select on public.telegram_posts to authenticated;
grant all on public.telegram_posts to service_role;

create function private.queue_telegram_post(post_kind public.telegram_post_kind, ref uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.telegram_posts (kind, ref_id) values (post_kind, ref)
  on conflict (kind, ref_id) do nothing;
$$;

revoke all on function private.queue_telegram_post(public.telegram_post_kind, uuid)
  from public, anon, authenticated;

-- A post is news once it's published (now, not scheduled for later; the
-- daily catch-up queues scheduled ones when their time comes).
create function private.telegram_post_on_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published_at is not null and new.published_at <= now()
    and (tg_op = 'INSERT' or old.published_at is null or old.published_at > now()) then
    perform private.queue_telegram_post('news', new.id);
  end if;
  return new;
end;
$$;

create trigger telegram_post_on_post after insert or update of published_at on public.posts
  for each row execute function private.telegram_post_on_post();

create function private.telegram_post_on_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.published and new.starts_at > now()
    and (tg_op = 'INSERT' or not old.published) then
    perform private.queue_telegram_post('events', new.id);
  end if;
  return new;
end;
$$;

create trigger telegram_post_on_event after insert or update of published on public.events
  for each row execute function private.telegram_post_on_event();

-- New arrivals: products added in the last two weeks that become active
-- (older products coming back aren't news).
create function private.telegram_post_on_product()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and new.created_at > now() - interval '14 days'
    and (tg_op = 'INSERT' or old.status <> 'active') then
    perform private.queue_telegram_post('arrivals', new.id);
  end if;
  return new;
end;
$$;

create trigger telegram_post_on_product after insert or update of status on public.products
  for each row execute function private.telegram_post_on_product();

revoke all on function private.telegram_post_on_post() from public, anon, authenticated;
revoke all on function private.telegram_post_on_event() from public, anon, authenticated;
revoke all on function private.telegram_post_on_product() from public, anon, authenticated;

-- The daily catch-up (service only): posts whose scheduled time has come
-- in the last two days.
create function public.queue_due_telegram_posts()
returns integer
language sql
volatile
security invoker
set search_path = ''
as $$
  with queued as (
    insert into public.telegram_posts (kind, ref_id)
    select 'news', p.id
    from public.posts p
    where p.published_at between now() - interval '2 days' and now()
    on conflict (kind, ref_id) do nothing
    returning 1
  )
  select count(*)::integer from queued;
$$;

-- Claims unsent posts from the last three days (service only), marking
-- them sent in the same statement so each goes out once.
create function public.claim_telegram_posts(max_rows integer default 50)
returns table (id uuid, kind public.telegram_post_kind, ref_id uuid)
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.telegram_posts as t
  set sent_at = now()
  where t.id in (
    select candidate.id
    from public.telegram_posts as candidate
    where candidate.sent_at is null
      and candidate.created_at > now() - interval '3 days'
    order by candidate.created_at
    limit greatest(least(max_rows, 200), 1)
    for update skip locked
  )
  returning t.id, t.kind, t.ref_id;
$$;

revoke all on function public.queue_due_telegram_posts() from public, anon, authenticated;
grant execute on function public.queue_due_telegram_posts() to service_role;
revoke all on function public.claim_telegram_posts(integer) from public, anon, authenticated;
grant execute on function public.claim_telegram_posts(integer) to service_role;
