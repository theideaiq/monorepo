-- Editorial: news (blog), events with RSVPs, the journal and submissions.
--
-- Content is bilingual (Arabic and English columns) and public once
-- published; editors manage it in the back office. Members submit their work
-- (writing or visual art) for the journal; editors review it blind — the
-- author's identity is only revealed to reviewers once a decision is made —
-- and score it with a rubric kept in a staff-only table.

create type public.submission_type as enum (
  'essay', 'poetry', 'fiction', 'theatre', 'visual_art', 'other'
);
create type public.submission_status as enum (
  'pending', 'under_review', 'revisions_requested', 'accepted', 'rejected', 'withdrawn'
);

-- ── Posts ───────────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  excerpt_ar text check (char_length(excerpt_ar) <= 500),
  excerpt_en text check (char_length(excerpt_en) <= 500),
  -- Markdown.
  body_ar text not null default '' check (char_length(body_ar) <= 100000),
  body_en text not null default '' check (char_length(body_en) <= 100000),
  -- Path in the public `editorial` bucket.
  cover_image text,
  author_id uuid references auth.users (id) on delete set null default auth.uid(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_published_at_idx on public.posts (published_at desc) where published_at is not null;

-- ── Events ──────────────────────────────────────────────────────────────────

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  description_ar text check (char_length(description_ar) <= 10000),
  description_en text check (char_length(description_en) <= 10000),
  location text not null check (char_length(location) between 1 and 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_image text,
  -- Seats available for RSVPs; null means unlimited.
  capacity integer check (capacity > 0),
  published boolean not null default false,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index events_starts_at_idx on public.events (starts_at) where published;

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index event_rsvps_user_id_idx on public.event_rsvps (user_id);

-- Refuses RSVPs once an event is full or has started.
create function private.check_rsvp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.events;
begin
  select * into target from public.events where id = new.event_id for update;

  if not found or not target.published or target.starts_at < now() then
    raise exception 'This event is not open for RSVPs' using errcode = 'check_violation';
  end if;

  if target.capacity is not null
    and (select count(*) from public.event_rsvps where event_id = new.event_id) >= target.capacity
  then
    raise exception 'This event is full' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger check_rsvp before insert on public.event_rsvps
  for each row execute function private.check_rsvp();

-- Public RSVP counts without exposing who is coming.
create function public.event_rsvp_count(event uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) from public.event_rsvps r
  join public.events e on e.id = r.event_id
  where r.event_id = event and e.published;
$$;

-- ── Journal ─────────────────────────────────────────────────────────────────

create table public.journal_issues (
  id uuid primary key default gen_random_uuid(),
  volume integer not null check (volume > 0),
  issue integer not null check (issue > 0),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  description_ar text check (char_length(description_ar) <= 5000),
  description_en text check (char_length(description_en) <= 5000),
  cover_image text,
  -- Path of the issue's PDF in the public `editorial` bucket.
  pdf_path text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (volume, issue),
  check (published_at is null or pdf_path is not null)
);

-- ── Submissions ─────────────────────────────────────────────────────────────

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references auth.users (id) on delete cascade default auth.uid(),
  title text not null check (char_length(title) between 1 and 300),
  type public.submission_type not null,
  -- Written work as Markdown, or a file (PDF, or JPEG/PNG for visual art)
  -- under "<author id>/" in the private `submissions` bucket.
  body text check (char_length(body) <= 200000),
  file_path text,
  -- Shown to the author with the decision.
  decision_note text check (char_length(decision_note) <= 5000),
  status public.submission_status not null default 'pending',
  assigned_to uuid references auth.users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  check (body is not null or file_path is not null),
  check (type <> 'visual_art' or file_path is not null)
);

create index submissions_author_id_idx on public.submissions (author_id, submitted_at desc);
create index submissions_status_idx on public.submissions (status, submitted_at);

-- Scores out of 20 per criterion, as on the review rubric.
create table public.submission_reviews (
  submission_id uuid primary key references public.submissions (id) on delete cascade,
  technical smallint check (technical in (0, 10, 20)),
  originality smallint check (originality in (0, 10, 20)),
  thematic smallint check (thematic in (0, 10, 20)),
  archive_worthy boolean,
  formatting text check (formatting in ('pass', 'fail', 'disqualified')),
  notes text check (char_length(notes) <= 10000),
  reviewed_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

create function private.on_submission_decision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Authors can only withdraw; everything else is the editors'.
  if current_user = 'authenticated'
    and not private.has_staff_role('{editor}')
    and (
      new.assigned_to is distinct from old.assigned_to
      or new.decision_note is distinct from old.decision_note
    )
  then
    raise exception 'Only editors can change this' using errcode = 'insufficient_privilege';
  end if;

  if new.status in ('accepted', 'rejected') and old.status is distinct from new.status then
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger on_submission_decision before update on public.submissions
  for each row execute function private.on_submission_decision();

create trigger set_updated_at before update on public.posts
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.events
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.journal_issues
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.submissions
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.submission_reviews
  for each row execute function private.set_updated_at();

-- The editorial board: submissions with the author hidden until a decision
-- is made (blind review). Editors only.
create function public.review_queue()
returns table (
  id uuid,
  title text,
  type public.submission_type,
  status public.submission_status,
  assigned_to uuid,
  submitted_at timestamptz,
  author_id uuid,
  author_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Editors only' using errcode = 'insufficient_privilege';
  end if;

  return query
  select
    s.id, s.title, s.type, s.status, s.assigned_to, s.submitted_at,
    case when s.status in ('accepted', 'rejected') then s.author_id end,
    case when s.status in ('accepted', 'rejected') then p.full_name end
  from public.submissions s
  left join public.profiles p on p.id = s.author_id
  where s.status <> 'withdrawn'
  order by s.submitted_at;
end;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.posts enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.journal_issues enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_reviews enable row level security;

create policy "Published posts are public; editors see drafts"
  on public.posts for select to anon, authenticated
  using ((published_at is not null and published_at <= now()) or private.has_staff_role('{editor}'));

create policy "Editors manage posts"
  on public.posts for all to authenticated
  using (private.has_staff_role('{editor}'))
  with check (private.has_staff_role('{editor}'));

create policy "Published events are public; editors see drafts"
  on public.events for select to anon, authenticated
  using (published or private.has_staff_role('{editor}'));

create policy "Editors manage events"
  on public.events for all to authenticated
  using (private.has_staff_role('{editor}'))
  with check (private.has_staff_role('{editor}'));

create policy "Members see their RSVPs; editors see all"
  on public.event_rsvps for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{editor}'));

create policy "Members RSVP for themselves"
  on public.event_rsvps for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (select 1 from public.profiles where id = (select auth.uid()) and banned_at is not null)
  );

create policy "Members cancel their RSVPs"
  on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{editor}'));

create policy "Published issues are public; editors see drafts"
  on public.journal_issues for select to anon, authenticated
  using ((published_at is not null and published_at <= now()) or private.has_staff_role('{editor}'));

create policy "Editors manage issues"
  on public.journal_issues for all to authenticated
  using (private.has_staff_role('{editor}'))
  with check (private.has_staff_role('{editor}'));

-- Editors read submissions through review_queue() (blind) and by id for the
-- review page, which shows the work without the author.
create policy "Authors see their submissions; editors see all"
  on public.submissions for select to authenticated
  using (author_id = (select auth.uid()) or private.has_staff_role('{editor}'));

create policy "Members submit their own work"
  on public.submissions for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and (file_path is null or split_part(file_path, '/', 1) = (select auth.uid())::text)
    and not exists (select 1 from public.profiles where id = (select auth.uid()) and banned_at is not null)
  );

-- Authors may only withdraw (column grants limit them to status).
create policy "Authors withdraw; editors move submissions"
  on public.submissions for update to authenticated
  using (
    (author_id = (select auth.uid()) and status in ('pending', 'revisions_requested'))
    or private.has_staff_role('{editor}')
  )
  with check (
    (author_id = (select auth.uid()) and status = 'withdrawn')
    or private.has_staff_role('{editor}')
  );

create policy "Editors manage reviews"
  on public.submission_reviews for all to authenticated
  using (private.has_staff_role('{editor}'))
  with check (private.has_staff_role('{editor}'));

create trigger audit_posts after insert or update or delete on public.posts
  for each row execute function private.audit_change();
create trigger audit_events after insert or update or delete on public.events
  for each row execute function private.audit_change();
create trigger audit_journal_issues after insert or update or delete on public.journal_issues
  for each row execute function private.audit_change();
create trigger audit_submissions after update on public.submissions
  for each row execute function private.audit_change();

-- ── Privileges ──────────────────────────────────────────────────────────────

revoke all on public.posts, public.events, public.event_rsvps, public.journal_issues,
  public.submissions, public.submission_reviews from anon, authenticated;

grant select on public.posts, public.events, public.journal_issues to anon, authenticated;
grant insert, update, delete on public.posts, public.events, public.journal_issues to authenticated;

grant select, delete on public.event_rsvps to authenticated;
grant insert (event_id, user_id) on public.event_rsvps to authenticated;

grant select on public.submissions to authenticated;
grant insert (author_id, title, type, body, file_path) on public.submissions to authenticated;
grant update (status, assigned_to, decision_note) on public.submissions to authenticated;

grant select, insert, update, delete on public.submission_reviews to authenticated;

grant all on public.posts, public.events, public.event_rsvps, public.journal_issues,
  public.submissions, public.submission_reviews to service_role;

revoke all on function private.check_rsvp() from public, anon, authenticated;
revoke all on function private.on_submission_decision() from public, anon, authenticated;
revoke all on function public.event_rsvp_count(uuid) from public;
revoke all on function public.review_queue() from public, anon;
grant execute on function public.event_rsvp_count(uuid) to anon, authenticated;
grant execute on function public.review_queue() to authenticated;
