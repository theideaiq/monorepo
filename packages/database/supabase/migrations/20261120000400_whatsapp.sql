-- WhatsApp updates (Meta WhatsApp Cloud API), next to push, email and
-- Telegram.
--
-- profiles.whatsapp_phone / whatsapp_opt_in: the customer's WhatsApp
-- number (an Iraqi mobile in E.164, +9647…) and their consent, set in The
-- IDEA Spark's settings. Like marketing_opt_in, the consent is a column the
-- customer updates directly; the number is contact data, so no other user
-- (teammates, staff) can select it: the customer reads it back with
-- my_whatsapp_settings() and apps/api reads it with the secret key.
--
-- notifications.whatsapp_sent_at: set when apps/api has taken a
-- notification for WhatsApp (claim_whatsapp_notifications), so the database
-- webhook and the catch-up cron never send the same row twice.
--
-- rentals.due_reminder_at: when the "due soon" reminder went out
-- (notify_rentals_due_soon, run by the daily rentals cron); cleared when the
-- due date moves.

alter table public.profiles
  add column whatsapp_phone text check (whatsapp_phone ~ '^\+9647[0-9]{9}$'),
  add column whatsapp_opt_in boolean not null default false,
  add constraint profiles_whatsapp_needs_phone check (not whatsapp_opt_in or whatsapp_phone is not null);

grant update (whatsapp_phone, whatsapp_opt_in) on public.profiles to authenticated;
grant select (whatsapp_opt_in) on public.profiles to authenticated;

-- The caller's own WhatsApp settings.
create function private.my_whatsapp_settings()
returns table (phone text, opt_in boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select p.whatsapp_phone, p.whatsapp_opt_in
  from public.profiles p
  where p.id = (select auth.uid());
$$;

create function public.my_whatsapp_settings()
returns table (phone text, opt_in boolean)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_whatsapp_settings() $$;

revoke all on function private.my_whatsapp_settings() from public, anon;
grant execute on function private.my_whatsapp_settings() to authenticated, service_role;
revoke all on function public.my_whatsapp_settings() from public, anon;
grant execute on function public.my_whatsapp_settings() to authenticated, service_role;

-- ── Notifications → WhatsApp ────────────────────────────────────────────────

alter table public.notifications add column whatsapp_sent_at timestamptz;

-- Notifications that existed before WhatsApp are not sent.
update public.notifications set whatsapp_sent_at = created_at;

create index notifications_whatsapp_unsent_idx on public.notifications (created_at)
  where whatsapp_sent_at is null;

-- Service only (apps/api): marks unsent notifications as taken and returns
-- those that have a WhatsApp template (order confirmed and shipped, rental
-- due soon, trade-in offer) for recipients who opted in, with their number,
-- language and first name. With ids, only those rows (the database
-- webhook); without, the oldest unsent rows of the last max_age (the
-- catch-up cron). Every claimed row is marked, sent or not, so nothing is
-- considered twice.
create function public.claim_whatsapp_notifications(
  notification_ids uuid[] default null,
  max_age interval default interval '24 hours',
  max_rows integer default 500
)
returns table (
  id uuid,
  user_id uuid,
  event text,
  data jsonb,
  link text,
  locale text,
  phone text,
  first_name text
)
language sql volatile
security invoker
set search_path = ''
as $$
  with claimed as (
    update public.notifications as n
    set whatsapp_sent_at = now()
    where n.id in (
      select candidate.id
      from public.notifications as candidate
      where candidate.whatsapp_sent_at is null
        and candidate.created_at > now() - max_age
        and (notification_ids is null or candidate.id = any (notification_ids))
      order by candidate.created_at
      limit greatest(least(max_rows, 1000), 1)
      for update skip locked
    )
    returning n.id, n.user_id, n.event, n.data, n.link
  )
  select claimed.id, claimed.user_id, claimed.event, claimed.data, claimed.link,
    profile.locale, profile.whatsapp_phone,
    nullif(split_part(trim(coalesce(profile.full_name, '')), ' ', 1), '')
  from claimed
  join public.profiles as profile on profile.id = claimed.user_id
  where profile.whatsapp_opt_in
    and profile.whatsapp_phone is not null
    and claimed.event in ('order_paid', 'order_shipped', 'rental_due_soon', 'trade_in_offer');
$$;

revoke all on function public.claim_whatsapp_notifications(uuid[], interval, integer) from public, anon, authenticated;
grant execute on function public.claim_whatsapp_notifications(uuid[], interval, integer) to service_role;

-- ── Rentals due soon ────────────────────────────────────────────────────────

alter table public.rentals add column due_reminder_at timestamptz;

create function private.reset_due_reminder()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.due_at is distinct from old.due_at then
    new.due_reminder_at := null;
  end if;
  return new;
end;
$$;

create trigger reset_due_reminder before update of due_at on public.rentals
  for each row execute function private.reset_due_reminder();

revoke all on function private.reset_due_reminder() from public, anon, authenticated;

-- Service only (daily cron): one "due soon" notification per active rental
-- due within `within`; returns how many were written.
create function public.notify_rentals_due_soon(within interval default interval '2 days')
returns integer
language sql
security definer
set search_path = ''
as $$
  with due as (
    update public.rentals set due_reminder_at = now()
    where status = 'active'
      and due_reminder_at is null
      and due_at > now()
      and due_at <= now() + within
      and user_id is not null
    returning id, user_id, name_ar, name_en, due_at
  ),
  written as (
    insert into public.notifications (user_id, kind, event, data, link)
    select due.user_id, 'rental', 'rental_due_soon',
      jsonb_build_object('name_ar', due.name_ar, 'name_en', due.name_en, 'due_at', due.due_at),
      '/plus'
    from due
    returning 1
  )
  select count(*)::integer from written;
$$;

revoke all on function public.notify_rentals_due_soon(interval) from public, anon, authenticated;
grant execute on function public.notify_rentals_due_soon(interval) to service_role;
