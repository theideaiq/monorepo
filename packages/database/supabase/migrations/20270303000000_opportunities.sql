-- Opportunities (28 October brief, step 14.1; Program Revision v2, Stage
-- 5): jobs, internships, scholarships, competitions and programs listed in
-- Club → Join, each naming who runs it. Organizations post them from
-- Partners → Opportunities (an `opportunities` section); The IDEA's editors
-- review every one in Staff → Club before it appears, and post The IDEA's
-- own (no organization). Featuring one is a paid extra staff switch on
-- (`featured_until`). Members follow an opportunity ("Notify me"): they
-- hear when it opens and a few days before its deadline.
--
-- Applying happens on the organization's side (`apply_url`) for now; The
-- IDEA's paid programs (packages, installments, guardian approval,
-- documents per application) follow in their own migration.

create type public.opportunity_kind as enum (
  'job', 'internship', 'scholarship', 'competition', 'program'
);

-- ── Organizations add the section ──────────────────────────────────────────

alter table public.organizations drop constraint organizations_features_check;
alter table public.organizations add constraint organizations_features_check
  check (features <@ array['perks', 'team', 'developers', 'selling', 'supply', 'opportunities']::text[]);

-- ── Opportunities ──────────────────────────────────────────────────────────

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  -- Who runs it; null for The IDEA's own.
  organization_id uuid references public.organizations (id) on delete cascade,
  kind public.opportunity_kind not null,
  title_ar text not null check (char_length(trim(title_ar)) between 2 and 160),
  title_en text not null check (char_length(trim(title_en)) between 2 and 160),
  summary_ar text check (char_length(summary_ar) <= 300),
  summary_en text check (char_length(summary_en) <= 300),
  description_ar text check (char_length(description_ar) <= 10000),
  description_en text check (char_length(description_en) <= 10000),
  -- A city or venue; null with `remote` for online ones.
  location text check (char_length(trim(location)) between 2 and 160),
  remote boolean not null default false,
  -- Where people apply, on the organization's side.
  apply_url text check (apply_url ~ '^https://' and char_length(apply_url) <= 500),
  -- What applying costs, in IQD (0 for free), with any detail.
  applicant_fee bigint not null default 0 check (applicant_fee >= 0),
  fee_note text check (char_length(fee_note) <= 300),
  -- When applications open (null: already open) and close (null: rolling).
  opens_at timestamptz,
  deadline timestamptz,
  starts_on date,
  ends_on date,
  cover_image text check (char_length(cover_image) <= 500),
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'changes', 'approved', 'rejected', 'closed')),
  review_note text check (char_length(review_note) <= 1000),
  submitted_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  published_at timestamptz,
  featured_until timestamptz,
  -- When followers last heard it opened, and about its deadline.
  open_notified_at timestamptz,
  deadline_notified_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_dates_check check (
    (opens_at is null or deadline is null or opens_at < deadline)
    and (starts_on is null or ends_on is null or starts_on <= ends_on)
  ),
  constraint opportunities_where_check check (remote or location is not null)
);

comment on table public.opportunities is
  'A job, internship, scholarship, competition or program in Club → Join: an organization''s (reviewed by editors) or The IDEA''s own.';

create index opportunities_organization_id_idx on public.opportunities (organization_id);
create index opportunities_reviewed_by_idx on public.opportunities (reviewed_by);
create index opportunities_created_by_idx on public.opportunities (created_by);
create index opportunities_listed_idx on public.opportunities (deadline)
  where status = 'approved';
create index opportunities_pending_idx on public.opportunities (submitted_at)
  where status = 'pending';

create trigger set_updated_at before update on public.opportunities
  for each row execute function private.set_updated_at();

alter table public.opportunities enable row level security;

create policy "Listed opportunities are public"
  on public.opportunities for select to anon
  using (status in ('approved', 'closed'));

create policy "Members see listed opportunities; organizations and editors theirs"
  on public.opportunities for select to authenticated
  using (
    status in ('approved', 'closed')
    or (select private.has_staff_role('{editor}'))
    or (organization_id is not null and (select private.is_org_member(organization_id)))
  );

create policy "Organizations and editors add opportunities"
  on public.opportunities for insert to authenticated
  with check (
    (select private.has_staff_role('{editor}'))
    or (organization_id is not null and (select private.has_org_role(organization_id, '{owner,admin}')))
  );

create policy "Organizations and editors change opportunities"
  on public.opportunities for update to authenticated
  using (
    (select private.has_staff_role('{editor}'))
    or (organization_id is not null and (select private.has_org_role(organization_id, '{owner,admin}')))
  )
  with check (
    (select private.has_staff_role('{editor}'))
    or (organization_id is not null and (select private.has_org_role(organization_id, '{owner,admin}')))
  );

create policy "Organizations delete unlisted opportunities; editors any"
  on public.opportunities for delete to authenticated
  using (
    (select private.has_staff_role('{editor}'))
    or (
      status in ('draft', 'changes', 'rejected')
      and organization_id is not null
      and (select private.has_org_role(organization_id, '{owner,admin}'))
    )
  );

grant select on public.opportunities to anon, authenticated;
grant insert, update, delete on public.opportunities to authenticated;

-- A short random suffix keeps slugs unique without asking for one.
create function private.opportunity_slug(title text)
returns text
language sql
volatile
set search_path = ''
as $$
  select left(
    coalesce(
      nullif(trim(both '-' from regexp_replace(lower(coalesce(title, '')), '[^a-z0-9]+', '-', 'g')), ''),
      'opportunity'
    ),
    70
  ) || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
$$;

-- Organizations write their listing and send it for review; only editors
-- decide, feature it or move it between organizations. Changing a listed
-- opportunity's content sends it back for review. Server code without a
-- user (the cron, the service role) is trusted like an editor.
create function private.guard_opportunity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  editor boolean := (select auth.uid()) is null or private.has_staff_role('{editor}');
  content_changed boolean;
begin
  if new.slug is null or new.slug = '' then
    new.slug := private.opportunity_slug(new.title_en);
  end if;

  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, (select auth.uid()));
    if not editor then
      if new.status not in ('draft', 'pending') then
        new.status := 'draft';
      end if;
      new.review_note := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
      new.published_at := null;
      new.featured_until := null;
    end if;
  else
    if new.organization_id is distinct from old.organization_id and not editor then
      raise exception 'An opportunity stays with its organization' using errcode = '42501';
    end if;
    if not editor then
      new.slug := old.slug;
      new.review_note := old.review_note;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
      new.published_at := old.published_at;
      new.featured_until := old.featured_until;
      new.open_notified_at := old.open_notified_at;
      new.deadline_notified_at := old.deadline_notified_at;
      new.created_by := old.created_by;

      content_changed := (
        new.kind, new.title_ar, new.title_en, new.summary_ar, new.summary_en,
        new.description_ar, new.description_en, new.location, new.remote,
        new.apply_url, new.applicant_fee, new.fee_note, new.opens_at, new.deadline,
        new.starts_on, new.ends_on, new.cover_image
      ) is distinct from (
        old.kind, old.title_ar, old.title_en, old.summary_ar, old.summary_en,
        old.description_ar, old.description_en, old.location, old.remote,
        old.apply_url, old.applicant_fee, old.fee_note, old.opens_at, old.deadline,
        old.starts_on, old.ends_on, old.cover_image
      );

      if new.status is distinct from old.status then
        -- Organizations send for review, take back a draft, or close it.
        if not (
          (new.status = 'pending' and old.status in ('draft', 'changes', 'rejected'))
          or (new.status = 'draft' and old.status in ('pending', 'changes', 'rejected'))
          or (new.status = 'closed' and old.status = 'approved')
        ) then
          raise exception 'Only editors decide on opportunities' using errcode = '42501';
        end if;
      elsif content_changed and old.status in ('approved', 'closed') then
        new.status := 'pending';
      end if;
    end if;
  end if;

  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    new.submitted_at := now();
  end if;
  if new.status = 'approved' then
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

create trigger guard_opportunity before insert or update on public.opportunities
  for each row execute function private.guard_opportunity();

-- Editors approve, ask for changes or reject, with a note the
-- organization reads; its owners and admins hear.
create function private.review_opportunity(
  opportunity uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.opportunities;
  admin_id uuid;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if decision not in ('approved', 'changes', 'rejected') then
    raise exception 'Approve, ask for changes or reject' using errcode = 'check_violation';
  end if;
  if decision <> 'approved' and nullif(trim(coalesce(note, '')), '') is null then
    raise exception 'Say what to change' using errcode = 'check_violation';
  end if;
  select * into found from public.opportunities o where o.id = opportunity for update;
  if found.id is null then
    raise exception 'Opportunity not found' using errcode = 'no_data_found';
  end if;

  update public.opportunities set
    status = decision,
    review_note = left(nullif(trim(note), ''), 1000),
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = opportunity;

  if found.organization_id is not null then
    for admin_id in
      select m.user_id from public.organization_members m
      where m.organization_id = found.organization_id and m.role in ('owner', 'admin')
    loop
      perform private.notify(
        admin_id, 'system', 'opportunity_' || decision,
        jsonb_build_object('title_ar', found.title_ar, 'title_en', found.title_en),
        '/business/opportunities'
      );
    end loop;
  end if;
end;
$$;

create function public.review_opportunity(opportunity uuid, decision text, note text default null)
returns void
language sql
set search_path = ''
as $$ select private.review_opportunity(opportunity, decision, note) $$;

-- ── Following ("Notify me") ────────────────────────────────────────────────

create table public.opportunity_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, opportunity_id)
);

comment on table public.opportunity_follows is
  'A member following an opportunity: told when it opens and before its deadline.';

create index opportunity_follows_opportunity_id_idx on public.opportunity_follows (opportunity_id);

alter table public.opportunity_follows enable row level security;

create policy "Members see what they follow"
  on public.opportunity_follows for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members follow listed opportunities"
  on public.opportunity_follows for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.opportunities o
      where o.id = opportunity_id and o.status in ('approved', 'closed')
    )
  );

create policy "Members stop following"
  on public.opportunity_follows for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, delete on public.opportunity_follows to authenticated;

-- How many follow each of an organization's opportunities (its members
-- and editors; never who).
create function private.opportunity_followers(org uuid)
returns table (opportunity_id uuid, followers bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_org_member(org) or private.has_staff_role('{editor}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select o.id, count(f.user_id)
    from public.opportunities o
    left join public.opportunity_follows f on f.opportunity_id = o.id
    where o.organization_id = org
    group by o.id;
end;
$$;

create function public.opportunity_followers(org uuid)
returns table (opportunity_id uuid, followers bigint)
language sql
stable
set search_path = ''
as $$ select * from private.opportunity_followers(org) $$;

-- Run by the API's cron (service role): followers hear when a listed
-- opportunity opens, and three days before its deadline. Returns how many
-- notifications it sent.
create function public.notify_opportunity_followers()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sent integer := 0;
  added integer;
begin
  -- Opened (again): opens_at passed since followers last heard.
  with opened as (
    update public.opportunities o set open_notified_at = now()
    where o.status = 'approved'
      and coalesce(o.opens_at, o.published_at) <= now()
      and (o.deadline is null or o.deadline > now())
      and (o.open_notified_at is null or o.open_notified_at < coalesce(o.opens_at, o.published_at))
    returning o.id, o.slug, o.title_ar, o.title_en
  )
  insert into public.notifications (user_id, kind, event, data, link)
  select f.user_id, 'system', 'opportunity_open',
    jsonb_build_object('title_ar', p.title_ar, 'title_en', p.title_en),
    '/club/opportunities/' || p.slug
  from opened p
  join public.opportunity_follows f on f.opportunity_id = p.id;
  get diagnostics added = row_count;
  sent := sent + added;

  -- Closing soon: within three days, once per deadline.
  with closing as (
    update public.opportunities o set deadline_notified_at = now()
    where o.status = 'approved'
      and o.deadline > now()
      and o.deadline <= now() + interval '3 days'
      and (o.deadline_notified_at is null or o.deadline_notified_at < o.deadline - interval '3 days')
    returning o.id, o.slug, o.title_ar, o.title_en, o.deadline
  )
  insert into public.notifications (user_id, kind, event, data, link)
  select f.user_id, 'system', 'opportunity_deadline',
    jsonb_build_object('title_ar', c.title_ar, 'title_en', c.title_en, 'deadline', c.deadline),
    '/club/opportunities/' || c.slug
  from closing c
  join public.opportunity_follows f on f.opportunity_id = c.id;
  get diagnostics added = row_count;
  sent := sent + added;

  -- Past their deadline: closed.
  update public.opportunities set status = 'closed'
  where status = 'approved' and deadline <= now();

  return sent;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.opportunity_slug(text) from public, anon, authenticated;
revoke all on function private.guard_opportunity() from public, anon, authenticated;
revoke all on function private.review_opportunity(uuid, text, text) from public, anon;
revoke all on function public.review_opportunity(uuid, text, text) from public, anon;
grant execute on function private.review_opportunity(uuid, text, text) to authenticated;
grant execute on function public.review_opportunity(uuid, text, text) to authenticated;
revoke all on function private.opportunity_followers(uuid) from public, anon;
revoke all on function public.opportunity_followers(uuid) from public, anon;
grant execute on function private.opportunity_followers(uuid) to authenticated;
grant execute on function public.opportunity_followers(uuid) to authenticated;
revoke all on function public.notify_opportunity_followers() from public, anon, authenticated;
grant execute on function public.notify_opportunity_followers() to service_role;
