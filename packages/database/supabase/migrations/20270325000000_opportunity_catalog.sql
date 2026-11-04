-- Opportunities, part 7 (the owner's approved proposal, 4 November 2026): a
-- catalog of programs for Iraqis in Club → Opportunities.
--
-- 1. Hosts. External programs (DAAD and the like) are listed under an
--    unclaimed organization: a normal `organizations` row with no members.
--    `host_name` keeps coming from the organization, so nobody types a host
--    and a null organization still means The IDEA. Editors can't read or
--    insert organizations, so three editor-only functions create, list and
--    hand over unclaimed ones. Unclaimed is derived (no members), so handing
--    one over needs no flag to keep in step.
-- 2. Filter fields on each opportunity, written by editors and by
--    organizations; a change to a listed one goes back for review like any
--    other content.

-- ── Filter fields ──────────────────────────────────────────────────────────

create type public.opportunity_level as enum (
  'high_school', 'undergraduate', 'masters', 'phd', 'postdoc', 'professional'
);

create type public.opportunity_funding as enum (
  'fully_funded', 'partly_funded', 'stipend_only', 'free_to_enter',
  'fee_charging', 'self_funded', 'unknown'
);

create type public.opportunity_eligibility as enum (
  'named_official', 'named_relay', 'named_secondary', 'inferred', 'unconfirmed'
);

alter table public.opportunities
  add column levels public.opportunity_level[] not null default '{}',
  add column min_age smallint check (min_age between 1 and 99),
  add column max_age smallint check (max_age between 1 and 99),
  -- ISO 3166-1 alpha-2 codes, so each language shows its own country names.
  add column destination_countries text[] not null default '{}'
    check (array_to_string(destination_countries, ',') ~ '^([A-Z]{2}(,[A-Z]{2})*)?$'),
  add column funding_type public.opportunity_funding not null default 'unknown',
  -- Null: not graded, as for The IDEA's own and listings from before this.
  add column iraqi_eligibility public.opportunity_eligibility,
  add column source_url text
    check (source_url ~ '^https://' and char_length(source_url) <= 500),
  add column last_checked_on date,
  add constraint opportunities_ages_check
    check (min_age is null or max_age is null or min_age <= max_age);

comment on column public.opportunities.levels is
  'Who it is for, by stage of study or work. Empty: not stated.';
comment on column public.opportunities.destination_countries is
  'ISO 3166-1 alpha-2 codes of where people go. Empty: not stated, or online.';
comment on column public.opportunities.iraqi_eligibility is
  'How firmly Iraqis are known to be eligible, by the strength of the source. Null: not graded.';
comment on column public.opportunities.source_url is
  'The page these details were checked against, shown publicly.';
comment on column public.opportunities.last_checked_on is
  'The day someone last checked the details against the source, shown publicly.';

-- Organizations can set the new fields too; changing one on a listed
-- opportunity sends it back for review. The rest is as in
-- 20270303000000_opportunities.sql.
create or replace function private.guard_opportunity()
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
        new.starts_on, new.ends_on, new.cover_image,
        new.levels, new.min_age, new.max_age, new.destination_countries,
        new.funding_type, new.iraqi_eligibility, new.source_url, new.last_checked_on
      ) is distinct from (
        old.kind, old.title_ar, old.title_en, old.summary_ar, old.summary_en,
        old.description_ar, old.description_en, old.location, old.remote,
        old.apply_url, old.applicant_fee, old.fee_note, old.opens_at, old.deadline,
        old.starts_on, old.ends_on, old.cover_image,
        old.levels, old.min_age, old.max_age, old.destination_countries,
        old.funding_type, old.iraqi_eligibility, old.source_url, old.last_checked_on
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

-- ── Unclaimed organizations ────────────────────────────────────────────────

-- Editors add an organization with no members to list its programs under,
-- with the Opportunities section on for when it's claimed. The same name
-- again gives the unclaimed one that already exists.
create function private.create_unclaimed_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean text := trim(coalesce(org_name, ''));
  found_id uuid;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if char_length(clean) not between 2 and 120 then
    raise exception 'Name the organization' using errcode = 'check_violation';
  end if;

  select g.id into found_id
  from public.organizations g
  where lower(g.name) = lower(clean)
    and not exists (select 1 from public.organization_members m where m.organization_id = g.id)
  order by g.created_at
  limit 1;
  if found_id is not null then
    return found_id;
  end if;

  insert into public.organizations (name, slug, created_by, features)
  values (
    clean,
    left(
      coalesce(
        nullif(trim(both '-' from regexp_replace(lower(clean), '[^a-z0-9]+', '-', 'g')), ''),
        'organization'
      ),
      57
    ) || '-' || substr(md5(gen_random_uuid()::text), 1, 6),
    (select auth.uid()),
    '{opportunities}'
  )
  returning id into found_id;
  return found_id;
end;
$$;

create function public.create_unclaimed_organization(org_name text)
returns uuid
language sql
set search_path = ''
as $$ select private.create_unclaimed_organization(org_name) $$;

-- The organizations nobody has claimed, for editors to list programs under.
create function private.unclaimed_organizations()
returns table (id uuid, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
    select g.id, g.name
    from public.organizations g
    where not exists (select 1 from public.organization_members m where m.organization_id = g.id)
    order by lower(g.name);
end;
$$;

create function public.unclaimed_organizations()
returns table (id uuid, name text)
language sql
stable
set search_path = ''
as $$ select * from private.unclaimed_organizations() $$;

-- Once The IDEA has checked who is asking, an editor makes that person's Pass
-- the owner. From then on it's an organization like any other: its name
-- and listings are theirs, and their changes to listings go to review.
create function private.claim_organization(organization uuid, owner_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimant uuid;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  perform 1 from public.organizations g where g.id = organization for update;
  if not found then
    raise exception 'Organization not found' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.organization_members m where m.organization_id = organization) then
    raise exception 'This organization is already claimed' using errcode = 'unique_violation';
  end if;
  select u.id into claimant
  from auth.users u
  where lower(u.email) = lower(trim(coalesce(owner_email, '')));
  if claimant is null then
    raise exception 'No Pass with that email' using errcode = 'no_data_found';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (organization, claimant, 'owner');
end;
$$;

create function public.claim_organization(organization uuid, owner_email text)
returns void
language sql
set search_path = ''
as $$ select private.claim_organization(organization, owner_email) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.create_unclaimed_organization(text) from public, anon;
revoke all on function public.create_unclaimed_organization(text) from public, anon;
grant execute on function private.create_unclaimed_organization(text) to authenticated;
grant execute on function public.create_unclaimed_organization(text) to authenticated;
revoke all on function private.unclaimed_organizations() from public, anon;
revoke all on function public.unclaimed_organizations() from public, anon;
grant execute on function private.unclaimed_organizations() to authenticated;
grant execute on function public.unclaimed_organizations() to authenticated;
revoke all on function private.claim_organization(uuid, text) from public, anon;
revoke all on function public.claim_organization(uuid, text) from public, anon;
grant execute on function private.claim_organization(uuid, text) to authenticated;
grant execute on function public.claim_organization(uuid, text) to authenticated;
