-- Programs, part 4: the partner CRM (Staff only).
--
-- The organizations The IDEA works with or approaches for its programs
-- (universities, schools, embassies and cultural centres, foundations,
-- program organizers, companies), the people there, every touch (an
-- email, a call, a meeting) and the deals (a delegation, a listing, an info
-- session, a sponsorship). Kept apart from `crm_contacts`, which is about
-- customers with a Pass: a partner organization usually has no Pass and
-- its people are not members.
--
-- Staff only: editors (Club and programs) and marketing read and write;
-- admins too (`has_staff_role`). Every change is in the audit log. People's
-- details are personal data of third parties: kept to work contacts, with
-- where each came from (`source`), and deleted with their organization.
-- Each organization has a next action and a date; the ones due show in
-- Staff's Inbox for their owner.

create type public.partner_stage as enum (
  'prospect', 'contacted', 'talking', 'partner', 'paused', 'declined'
);
create type public.partner_kind as enum (
  'university', 'school', 'embassy', 'cultural_centre', 'foundation',
  'program_organizer', 'ngo', 'company', 'government', 'media', 'other'
);
create type public.partner_touch_channel as enum (
  'email', 'call', 'meeting', 'whatsapp', 'telegram', 'event', 'letter', 'other'
);
create type public.partner_deal_kind as enum (
  'delegation', 'listing', 'info_session', 'sponsorship', 'perk', 'agreement', 'other'
);
create type public.partner_deal_stage as enum (
  'idea', 'proposed', 'negotiating', 'agreed', 'done', 'lost'
);

-- ── Organizations ─────────────────────────────────────────────────────────

create table public.partner_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  name_ar text check (char_length(name_ar) between 1 and 200),
  kind public.partner_kind not null default 'other',
  -- ISO 3166-1 alpha-2.
  country text check (country ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  website text check (website ~ '^https?://' and char_length(website) <= 500),
  -- A general address (info@, office@), never a person's.
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  stage public.partner_stage not null default 'prospect',
  -- 1 high, 2 normal, 3 low.
  priority smallint not null default 2 check (priority between 1 and 3),
  owner_id uuid references auth.users (id) on delete set null,
  next_action text check (char_length(next_action) <= 300),
  next_action_on date,
  -- Where the organization was found (a page, a list), for checking later.
  source_url text check (source_url ~ '^https?://' and char_length(source_url) <= 1000),
  -- The organization's own Partners organization, once it has one.
  organization_id uuid references public.organizations (id) on delete set null,
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  notes text check (char_length(notes) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((next_action is null) = (next_action_on is null))
);

comment on table public.partner_orgs is
  'Partner CRM: an organization The IDEA works with or approaches for its programs, with its stage, owner and next action. Staff only.';

create unique index partner_orgs_website_key on public.partner_orgs (lower(website))
  where website is not null;
create index partner_orgs_stage_idx on public.partner_orgs (stage, priority);
create index partner_orgs_owner_due_idx on public.partner_orgs (owner_id, next_action_on)
  where next_action_on is not null;
create index partner_orgs_organization_id_idx on public.partner_orgs (organization_id);
create index partner_orgs_tags_idx on public.partner_orgs using gin (tags);

-- ── People ────────────────────────────────────────────────────────────────

create table public.partner_people (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_orgs (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  role text check (char_length(role) <= 200),
  email text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  phone text check (phone ~ '^\+?[0-9 ()-]{6,30}$'),
  -- Where this contact came from (their organization's page, an
  -- introduction, a card): work contacts only.
  source text check (char_length(source) <= 300),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partner_people is
  'Partner CRM: a person at a partner organization (work contact, with its source). Staff only; deleted with the organization.';

create index partner_people_org_id_idx on public.partner_people (org_id);

-- ── Touches (the outreach log) ────────────────────────────────────────────

create table public.partner_touches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_orgs (id) on delete cascade,
  person_id uuid references public.partner_people (id) on delete set null,
  channel public.partner_touch_channel not null,
  -- true: they reached out to us.
  inbound boolean not null default false,
  happened_at timestamptz not null default now(),
  summary text not null check (char_length(summary) between 1 and 2000),
  staff_id uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.partner_touches is
  'Partner CRM: each email, call or meeting with a partner organization. Staff only.';

create index partner_touches_org_idx on public.partner_touches (org_id, happened_at desc);
create index partner_touches_person_id_idx on public.partner_touches (person_id);
create index partner_touches_staff_id_idx on public.partner_touches (staff_id);

-- ── Deals ─────────────────────────────────────────────────────────────────

create table public.partner_deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.partner_orgs (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind public.partner_deal_kind not null,
  stage public.partner_deal_stage not null default 'idea',
  -- IQD, a multiple of 250, when there is money in it.
  value_iqd bigint check (value_iqd >= 0 and value_iqd % 250 = 0),
  expected_on date,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partner_deals is
  'Partner CRM: what The IDEA and a partner are working on (a delegation, a listing, an info session, a sponsorship), with its stage. Staff only.';

create index partner_deals_org_id_idx on public.partner_deals (org_id);
create index partner_deals_opportunity_id_idx on public.partner_deals (opportunity_id);
create index partner_deals_stage_idx on public.partner_deals (stage);

-- ── Housekeeping ──────────────────────────────────────────────────────────

create trigger set_updated_at before update on public.partner_orgs
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.partner_people
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.partner_deals
  for each row execute function private.set_updated_at();

create trigger audit_partner_orgs after insert or update or delete on public.partner_orgs
  for each row execute function private.audit_change();
create trigger audit_partner_people after insert or update or delete on public.partner_people
  for each row execute function private.audit_change();
create trigger audit_partner_touches after insert or update or delete on public.partner_touches
  for each row execute function private.audit_change();
create trigger audit_partner_deals after insert or update or delete on public.partner_deals
  for each row execute function private.audit_change();

-- An owner is a staff member.
create function private.guard_partner_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null
    and (tg_op = 'INSERT' or new.owner_id is distinct from old.owner_id)
    and not exists (select 1 from public.staff s where s.user_id = new.owner_id)
  then
    raise exception 'The owner must be on the staff' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_partner_owner() from public, anon, authenticated;

create trigger guard_partner_owner before insert or update on public.partner_orgs
  for each row execute function private.guard_partner_owner();

-- ── Access: editors and marketing (admins included) ───────────────────────

alter table public.partner_orgs enable row level security;
alter table public.partner_people enable row level security;
alter table public.partner_touches enable row level security;
alter table public.partner_deals enable row level security;

create policy "Partner CRM staff read organizations"
  on public.partner_orgs for select to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff add organizations"
  on public.partner_orgs for insert to authenticated
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff change organizations"
  on public.partner_orgs for update to authenticated
  using ((select private.has_staff_role('{editor,marketing}')))
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Admins delete organizations"
  on public.partner_orgs for delete to authenticated
  using ((select private.has_staff_role('{admin}')));

create policy "Partner CRM staff read people"
  on public.partner_people for select to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff add people"
  on public.partner_people for insert to authenticated
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff change people"
  on public.partner_people for update to authenticated
  using ((select private.has_staff_role('{editor,marketing}')))
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff delete people"
  on public.partner_people for delete to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));

create policy "Partner CRM staff read touches"
  on public.partner_touches for select to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));
-- A touch is logged as oneself, and stays as written.
create policy "Partner CRM staff log touches"
  on public.partner_touches for insert to authenticated
  with check (
    (select private.has_staff_role('{editor,marketing}'))
    and staff_id = (select auth.uid())
  );
create policy "Partner CRM staff delete their touches"
  on public.partner_touches for delete to authenticated
  using (
    (select private.has_staff_role('{editor,marketing}'))
    and (staff_id = (select auth.uid()) or (select private.has_staff_role('{admin}')))
  );

create policy "Partner CRM staff read deals"
  on public.partner_deals for select to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff add deals"
  on public.partner_deals for insert to authenticated
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff change deals"
  on public.partner_deals for update to authenticated
  using ((select private.has_staff_role('{editor,marketing}')))
  with check ((select private.has_staff_role('{editor,marketing}')));
create policy "Partner CRM staff delete deals"
  on public.partner_deals for delete to authenticated
  using ((select private.has_staff_role('{editor,marketing}')));

grant select, insert, update on public.partner_orgs to authenticated;
grant delete on public.partner_orgs to authenticated;
grant select, insert, update, delete on public.partner_people to authenticated;
grant select, insert, delete on public.partner_touches to authenticated;
grant select, insert, update, delete on public.partner_deals to authenticated;
