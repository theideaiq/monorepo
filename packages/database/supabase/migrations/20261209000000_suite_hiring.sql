-- The IDEA Suite: hiring for companies.
--
-- A company's owners and admins post a job request (the role, where, the
-- kind of contract, a salary range, how many people). Support proposes
-- candidates (a name, a headline, a summary and a CV in the private
-- `candidates` bucket under "<organization id>/…"); the company's owners
-- and admins are notified and shortlist, reject or hire them. Hiring as
-- many people as the job asked for fills it. Every member of the company
-- sees its jobs and candidates.

create type public.job_status as enum ('open', 'filled', 'closed');
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'internship');
create type public.candidate_status as enum ('proposed', 'shortlisted', 'rejected', 'hired', 'withdrawn');

create table public.job_requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 3001) unique,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 4000),
  location text check (char_length(location) <= 200),
  employment_type public.employment_type not null default 'full_time',
  -- Monthly, in IQD.
  salary_min bigint check (salary_min > 0),
  salary_max bigint check (salary_max > 0),
  openings integer not null default 1 check (openings between 1 and 100),
  status public.job_status not null default 'open',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (salary_min is null or salary_max is null or salary_min <= salary_max)
);

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid not null references public.job_requests (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  headline text check (char_length(headline) <= 200),
  summary text check (char_length(summary) <= 4000),
  cv_path text check (char_length(cv_path) <= 500),
  status public.candidate_status not null default 'proposed',
  company_note text check (char_length(company_note) <= 2000),
  proposed_by uuid references auth.users (id) on delete set null default auth.uid(),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index job_requests_organization_idx on public.job_requests (organization_id, created_at desc);
create index job_requests_status_idx on public.job_requests (status, created_at desc);
create index job_requests_created_by_idx on public.job_requests (created_by);
create index candidates_job_idx on public.candidates (job_request_id, created_at);
create index candidates_proposed_by_idx on public.candidates (proposed_by);
create index candidates_decided_by_idx on public.candidates (decided_by);

create trigger set_updated_at before update on public.job_requests
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.candidates
  for each row execute function private.set_updated_at();
create trigger audit_job_requests after update or delete on public.job_requests
  for each row execute function private.audit_change();
create trigger audit_candidates after update or delete on public.candidates
  for each row execute function private.audit_change();

-- The company a candidate is proposed to.
create function private.candidate_org(candidate uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select j.organization_id from public.candidates c
  join public.job_requests j on j.id = c.job_request_id
  where c.id = candidate;
$$;

create function private.job_org(job uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select j.organization_id from public.job_requests j where j.id = job;
$$;

-- ── Row Level Security ─────────────────────────────────────────────────────

alter table public.job_requests enable row level security;
alter table public.candidates enable row level security;

create policy "Company members and support see job requests"
  on public.job_requests for select to authenticated
  using (private.is_org_member(organization_id) or private.has_staff_role('{support}'));

create policy "Company owners and admins post jobs"
  on public.job_requests for insert to authenticated
  with check (
    private.has_org_role(organization_id, '{owner,admin}')
    and created_by = (select auth.uid())
    and status = 'open'
  );

create policy "Company members and support see candidates"
  on public.candidates for select to authenticated
  using (
    private.has_staff_role('{support}')
    or (status <> 'withdrawn' and private.is_org_member(private.job_org(job_request_id)))
  );

create policy "Support proposes candidates for open jobs"
  on public.candidates for insert to authenticated
  with check (
    private.has_staff_role('{support}')
    and status = 'proposed'
    and proposed_by = (select auth.uid())
    and exists (select 1 from public.job_requests j where j.id = job_request_id and j.status = 'open')
  );

create policy "Support edits proposed candidates"
  on public.candidates for update to authenticated
  using (private.has_staff_role('{support}') and status = 'proposed')
  with check (private.has_staff_role('{support}') and status in ('proposed', 'withdrawn'));

revoke all on public.job_requests, public.candidates from anon, authenticated;
grant select on public.job_requests, public.candidates to authenticated;
grant insert (organization_id, title, description, location, employment_type,
  salary_min, salary_max, openings, created_by) on public.job_requests to authenticated;
grant insert (job_request_id, full_name, headline, summary, cv_path, proposed_by)
  on public.candidates to authenticated;
grant update (full_name, headline, summary, cv_path, status) on public.candidates to authenticated;

-- ── Notifications ──────────────────────────────────────────────────────────

-- A proposed candidate tells the company's owners and admins.
create function private.on_candidate_proposed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.job_requests;
begin
  select * into job from public.job_requests j where j.id = new.job_request_id;
  perform private.notify_org_admins(
    job.organization_id, 'candidate_proposed',
    jsonb_build_object('name', new.full_name, 'title', job.title, 'number', job.number),
    '/business/hiring/' || job.id
  );
  return null;
end;
$$;

create trigger notify_candidate_proposed after insert on public.candidates
  for each row execute function private.on_candidate_proposed();

-- ── Steps ──────────────────────────────────────────────────────────────────

-- A company owner or admin shortlists, rejects or hires a candidate, with an
-- optional note for The IDEA. Hiring as many as the job asked for fills it.
create function private.decide_candidate(candidate uuid, decision public.candidate_status, note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.candidates;
  job public.job_requests;
begin
  select * into target from public.candidates c where c.id = candidate for update;
  if target.id is null then
    raise exception 'No such candidate' using errcode = 'no_data_found';
  end if;
  select * into job from public.job_requests j where j.id = target.job_request_id for update;
  if not private.has_org_role(job.organization_id, '{owner,admin}') then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if decision not in ('shortlisted', 'rejected', 'hired') then
    raise exception 'Shortlist, reject or hire' using errcode = 'check_violation';
  end if;
  if target.status not in ('proposed', 'shortlisted') or job.status <> 'open' then
    raise exception 'This candidate can no longer be decided' using errcode = 'check_violation';
  end if;

  update public.candidates
  set status = decision, company_note = nullif(trim(note), ''),
    decided_by = (select auth.uid()), decided_at = now()
  where id = candidate;

  if decision = 'hired' and (
    select count(*) from public.candidates c
    where c.job_request_id = job.id and c.status = 'hired'
  ) >= job.openings then
    update public.job_requests set status = 'filled' where id = job.id;
  end if;
end;
$$;

-- The company (owners and admins) or support closes an open job.
create function private.close_job_request(job uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.job_requests;
begin
  select * into target from public.job_requests j where j.id = job for update;
  if target.id is null then
    raise exception 'No such job' using errcode = 'no_data_found';
  end if;
  if not (private.has_org_role(target.organization_id, '{owner,admin}')
    or private.has_staff_role('{support}')) then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if target.status <> 'open' then
    raise exception 'Only an open job can be closed' using errcode = 'check_violation';
  end if;
  update public.job_requests set status = 'closed' where id = job;
end;
$$;

create function public.decide_candidate(candidate uuid, decision public.candidate_status, note text default null)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.decide_candidate(candidate, decision, note) $$;

create function public.close_job_request(job uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.close_job_request(job) $$;

-- ── CVs ────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidates', 'candidates', false, 10485760, array['application/pdf'])
on conflict (id) do nothing;

create policy "Support uploads CVs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'candidates' and (select private.has_staff_role('{support}')));

create policy "Company members and support read CVs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'candidates'
    and (
      (select private.has_staff_role('{support}'))
      or private.is_org_member(private.try_uuid((storage.foldername(name))[1]))
    )
  );

create policy "Support deletes CVs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'candidates' and (select private.has_staff_role('{support}')));

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.candidate_org(uuid) from public, anon;
grant execute on function private.candidate_org(uuid) to authenticated, service_role;
revoke all on function private.job_org(uuid) from public, anon;
grant execute on function private.job_org(uuid) to authenticated, service_role;
revoke all on function private.on_candidate_proposed() from public, anon, authenticated;

revoke all on function private.decide_candidate(uuid, public.candidate_status, text) from public, anon;
grant execute on function private.decide_candidate(uuid, public.candidate_status, text) to authenticated, service_role;
revoke all on function public.decide_candidate(uuid, public.candidate_status, text) from public, anon;
grant execute on function public.decide_candidate(uuid, public.candidate_status, text) to authenticated, service_role;

revoke all on function private.close_job_request(uuid) from public, anon;
grant execute on function private.close_job_request(uuid) to authenticated, service_role;
revoke all on function public.close_job_request(uuid) from public, anon;
grant execute on function public.close_job_request(uuid) to authenticated, service_role;
