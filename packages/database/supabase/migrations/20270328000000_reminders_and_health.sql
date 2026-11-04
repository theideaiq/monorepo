-- Programs, part 3: reminders through Droid and email, and job health.
--
-- 1. Travel Kit reminders. A requirement with an anchor (the member's
--    appointment or departure date) and `lead_days` is due on
--    anchor − lead_days. Each day `notify_travel_kits()` (the API's cron,
--    service role only) sends one notification per kit listing what is due
--    in the next three days and not done yet: a document that isn't marked
--    ready, a task or question not ticked. `travel_reminders` remembers what
--    was announced for which due date, so each line is announced once, and
--    again only when the member moves the date.
-- 2. Email for reminders. `notifications.emailed_at` and
--    `claim_email_notifications(events)` hand the API the notifications of
--    the given events not emailed yet (made in the last two days), marking
--    them in the same statement. Droid, push and WhatsApp keep going out as
--    every notification does.
-- 3. Job health. `job_runs` keeps each cron job's last start, last success
--    and last failure, written by the API (`recordJobRun`); Staff → Health
--    reads it (admins).

-- ── 1. Travel Kit reminders ───────────────────────────────────────────────

create table public.travel_reminders (
  kit_id uuid not null references public.travel_kits (id) on delete cascade,
  requirement_id uuid not null references public.travel_requirements (id) on delete cascade,
  due_on date not null,
  sent_at timestamptz not null default now(),
  primary key (kit_id, requirement_id, due_on)
);

comment on table public.travel_reminders is
  'Which Travel Kit lines were announced for which due date (once each); service only.';

create index travel_reminders_requirement_id_idx on public.travel_reminders (requirement_id);

alter table public.travel_reminders enable row level security;

create policy "No client access"
  on public.travel_reminders as restrictive for all to anon, authenticated
  using (false) with check (false);

-- The kit's lines due between today and three days from now (Baghdad), not
-- done yet; one row per line.
create function private.travel_kit_due(today date)
returns table (
  kit_id uuid,
  user_id uuid,
  requirement_id uuid,
  due_on date,
  title_ar text,
  title_en text
)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.user_id, r.id,
    (case r.anchor when 'appointment' then k.appointment_on else k.departure_on end)
      - r.lead_days as due_on,
    r.title_ar, r.title_en
  from public.travel_kits k
  join public.travel_routes route on route.id = k.route_id and route.status = 'published'
  join public.travel_requirements r
    on r.route_id = k.route_id or (k.opportunity_id is not null and r.opportunity_id = k.opportunity_id)
  where r.anchor is not null
    and (k.minor or not r.minors_only)
    and (case r.anchor when 'appointment' then k.appointment_on else k.departure_on end) is not null
    and (case r.anchor when 'appointment' then k.appointment_on else k.departure_on end)
      - r.lead_days between today and today + 3
    and not exists (
      select 1 from public.travel_kit_ticks t
      where t.kit_id = k.id and t.requirement_id = r.id
    )
    and (
      r.kind <> 'document'
      or not exists (
        select 1 from public.travel_documents d
        where d.user_id = k.user_id and d.doc_key = r.doc_key and d.status = 'ready'
      )
    );
$$;

create function public.notify_travel_kits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Baghdad')::date;
  sent integer;
begin
  with due as (
    select * from private.travel_kit_due(today) d
    where not exists (
      select 1 from public.travel_reminders tr
      where tr.kit_id = d.kit_id and tr.requirement_id = d.requirement_id and tr.due_on = d.due_on
    )
  ),
  marked as (
    insert into public.travel_reminders (kit_id, requirement_id, due_on)
    select kit_id, requirement_id, due_on from due
    on conflict do nothing
    returning kit_id
  ),
  kits as (
    select d.kit_id, d.user_id,
      count(*)::integer as items,
      min(d.due_on) as first_due_on,
      (array_agg(d.title_ar order by d.due_on, d.title_en))[1] as title_ar,
      (array_agg(d.title_en order by d.due_on, d.title_en))[1] as title_en
    from due d
    where d.kit_id in (select kit_id from marked)
    group by d.kit_id, d.user_id
  )
  insert into public.notifications (user_id, kind, event, data, link)
  select k.user_id, 'system', 'travel_due',
    jsonb_build_object(
      'count', k.items,
      'due_on', k.first_due_on,
      'title_ar', k.title_ar,
      'title_en', k.title_en,
      'country', route.country
    ),
    '/pass/travel/' || k.kit_id
  from kits k
  join public.travel_kits kit on kit.id = k.kit_id
  join public.travel_routes route on route.id = kit.route_id;
  get diagnostics sent = row_count;
  return sent;
end;
$$;

comment on function public.notify_travel_kits() is
  'Daily: one notification per Travel Kit with the lines due in the next three days and not done (each announced once per due date); the API''s cron.';

revoke all on function private.travel_kit_due(date) from public, anon, authenticated;
revoke all on function public.notify_travel_kits() from public, anon, authenticated;
grant execute on function public.notify_travel_kits() to service_role;

-- ── 2. Email for reminders ────────────────────────────────────────────────

alter table public.notifications add column emailed_at timestamptz;

comment on column public.notifications.emailed_at is
  'When this notification was also emailed (only reminders are; see claim_email_notifications).';

-- Notifications from before email are not emailed.
update public.notifications set emailed_at = created_at;

create function public.claim_email_notifications(
  events text[],
  batch integer default 100
)
returns table (
  id uuid,
  user_id uuid,
  email text,
  locale text,
  event text,
  data jsonb,
  link text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select n.id from public.notifications n
    where n.emailed_at is null
      and n.event = any (events)
      and n.created_at > now() - interval '2 days'
    order by n.created_at
    limit least(greatest(coalesce(batch, 100), 1), 500)
    for update skip locked
  ),
  marked as (
    update public.notifications n set emailed_at = now()
    from due where n.id = due.id
    returning n.id, n.user_id, n.event, n.data, n.link
  )
  select m.id, m.user_id, u.email::text, coalesce(p.locale, 'ar')::text, m.event, m.data, m.link
  from marked m
  join auth.users u on u.id = m.user_id
  left join public.profiles p on p.id = m.user_id
  where u.email is not null;
end;
$$;

comment on function public.claim_email_notifications(text[], integer) is
  'Notifications of the given events from the last two days not emailed yet, marked emailed in the same statement; the API''s job.';

revoke all on function public.claim_email_notifications(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_email_notifications(text[], integer) to service_role;

-- ── 3. Job health ─────────────────────────────────────────────────────────

create table public.job_runs (
  job text primary key check (job ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  last_started_at timestamptz,
  last_ok_at timestamptz,
  last_failed_at timestamptz,
  -- A short reason (no personal data), cleared by the next success.
  last_error text check (char_length(last_error) <= 500),
  last_duration_ms integer check (last_duration_ms >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.job_runs is
  'Each scheduled job''s last start, success and failure, written by the API; admins read it in Staff → Health.';

create trigger set_updated_at before update on public.job_runs
  for each row execute function private.set_updated_at();

alter table public.job_runs enable row level security;

create policy "Admins see job runs"
  on public.job_runs for select to authenticated
  using ((select private.has_staff_role('{admin}')));

grant select on public.job_runs to authenticated;
