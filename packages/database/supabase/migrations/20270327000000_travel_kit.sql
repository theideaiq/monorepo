-- The Travel Kit (A18) and the package page's itinerary and costs (C20).
--
-- The Travel Kit is a member's folder for one trip: one visa route (a
-- country and a visa type) plus, optionally, the opportunity they travel
-- for. Editors enter each route's requirements in Staff, every line with
-- where it came from (a source link), how sure it is (official, a
-- secondary source, or not confirmed) and the day someone checked it; a
-- route can only be published once it has been checked. A program can add
-- its own extras (an invitation letter, say) as requirements of its
-- opportunity. Nothing is invented by the app.
--
-- A member's kit holds their dates (appointment, departure), the under-18
-- switch, their notes and the tasks and questions they ticked. Document
-- statuses (not started, in progress, ready) are kept once per member and
-- document kind (`doc_key`), so a passport marked ready counts for every
-- trip. The kit never stores a document or a scan: passport scans live only
-- in paid programs' applications, deleted 30 days after (20270305000000).
--
-- Programs gain an itinerary (day by day) and a list of costs, each
-- included in the package price or paid by the member on top, so the
-- package page shows every cost.

-- ── Programs: itinerary and costs ────────────────────────────────────────

-- [{ "day": 1, "title_ar": "…", "title_en": "…", "detail_ar": "…", "detail_en": "…" }]
create function private.valid_program_itinerary(itinerary jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  step jsonb;
begin
  if jsonb_typeof(itinerary) <> 'array' or jsonb_array_length(itinerary) > 60 then
    return false;
  end if;
  for step in select * from jsonb_array_elements(itinerary) loop
    if jsonb_typeof(step) <> 'object'
      or jsonb_typeof(step -> 'day') <> 'number'
      or (step ->> 'day') !~ '^[0-9]+$'
      or (step ->> 'day')::integer not between 1 and 365
      or coalesce(char_length(step ->> 'title_ar'), 0) not between 1 and 200
      or coalesce(char_length(step ->> 'title_en'), 0) not between 1 and 200
      or coalesce(char_length(step ->> 'detail_ar'), 0) > 1000
      or coalesce(char_length(step ->> 'detail_en'), 0) > 1000
      or exists (
        select 1 from jsonb_object_keys(step) k
        where k not in ('day', 'title_ar', 'title_en', 'detail_ar', 'detail_en')
      )
    then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- [{ "label_ar": "…", "label_en": "…", "included": true, "amount": 125000 }]
-- `included`: in the package price. Otherwise the member pays it on top;
-- `amount` (IQD) is null when it varies or isn't known yet.
create function private.valid_program_costs(costs jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  line jsonb;
begin
  if jsonb_typeof(costs) <> 'array' or jsonb_array_length(costs) > 40 then
    return false;
  end if;
  for line in select * from jsonb_array_elements(costs) loop
    if jsonb_typeof(line) <> 'object'
      or coalesce(char_length(line ->> 'label_ar'), 0) not between 1 and 200
      or coalesce(char_length(line ->> 'label_en'), 0) not between 1 and 200
      or jsonb_typeof(line -> 'included') <> 'boolean'
      or (
        line ? 'amount' and jsonb_typeof(line -> 'amount') <> 'null'
        and (
          jsonb_typeof(line -> 'amount') <> 'number'
          or (line ->> 'amount') !~ '^[0-9]+$'
          or (line ->> 'amount')::bigint % 250 <> 0
        )
      )
      or exists (
        select 1 from jsonb_object_keys(line) k
        where k not in ('label_ar', 'label_en', 'included', 'amount')
      )
    then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

alter table public.programs
  add column itinerary jsonb not null default '[]'::jsonb
    check (private.valid_program_itinerary(itinerary)),
  add column costs jsonb not null default '[]'::jsonb
    check (private.valid_program_costs(costs));

comment on column public.programs.itinerary is
  'Day by day: [{day, title_ar, title_en, detail_ar?, detail_en?}].';
comment on column public.programs.costs is
  'Every cost: [{label_ar, label_en, included, amount?}]; included means in the package price, otherwise paid on top (amount null when it varies).';

-- ── Travel Kit: routes and requirements (editors) ─────────────────────────

create type public.travel_confidence as enum ('official', 'secondary', 'unconfirmed');
create type public.travel_item_kind as enum ('document', 'task', 'question');
create type public.travel_document_status as enum ('not_started', 'in_progress', 'ready');

create table public.travel_routes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  -- ISO 3166-1 alpha-2.
  country text not null check (country ~ '^[A-Z]{2}$'),
  visa_ar text not null check (char_length(visa_ar) between 1 and 200),
  visa_en text not null check (char_length(visa_en) between 1 and 200),
  -- Where to apply, and whom to ask when in doubt.
  apply_at_ar text check (char_length(apply_at_ar) <= 1000),
  apply_at_en text check (char_length(apply_at_en) <= 1000),
  ask_ar text check (char_length(ask_ar) <= 500),
  ask_en text check (char_length(ask_en) <= 500),
  -- Shown on top, e.g. that the data is thin.
  note_ar text check (char_length(note_ar) <= 2000),
  note_en text check (char_length(note_en) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'published', 'retired')),
  checked_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or checked_on is not null)
);

comment on table public.travel_routes is
  'A Travel Kit template: one country and visa type, entered and dated by editors. Readable by everyone once published.';

create table public.travel_requirements (
  id uuid primary key default gen_random_uuid(),
  -- A route's own line, or a program's extra (exactly one).
  route_id uuid references public.travel_routes (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete cascade,
  kind public.travel_item_kind not null,
  -- Documents are tracked once per member by this key ("passport").
  doc_key text check (doc_key ~ '^[a-z0-9_]{2,40}$'),
  position smallint not null default 0,
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  title_en text not null check (char_length(title_en) between 1 and 200),
  detail_ar text check (char_length(detail_ar) <= 2000),
  detail_en text check (char_length(detail_en) <= 2000),
  -- Printed copies to bring.
  copies smallint check (copies between 0 and 20),
  -- Scheduled this many days before the member's appointment or departure.
  anchor text check (anchor in ('appointment', 'departure')),
  lead_days smallint check (lead_days between 0 and 365),
  minors_only boolean not null default false,
  confidence public.travel_confidence not null,
  source_url text not null check (source_url ~ '^https?://' and char_length(source_url) <= 1000),
  checked_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(route_id, opportunity_id) = 1),
  check ((kind = 'document') = (doc_key is not null)),
  check ((anchor is null) = (lead_days is null))
);

comment on table public.travel_requirements is
  'A line of a Travel Kit (a document, task or open question) with its source, confidence and checked date. Belongs to a route, or to an opportunity as that program''s extra.';

create index travel_requirements_route_id_idx on public.travel_requirements (route_id, position);
create index travel_requirements_opportunity_id_idx on public.travel_requirements (opportunity_id, position);

-- The routes an opportunity's travellers take (a kit can start from it).
create table public.opportunity_travel_routes (
  opportunity_id uuid not null references public.opportunities (id) on delete cascade,
  route_id uuid not null references public.travel_routes (id) on delete cascade,
  primary key (opportunity_id, route_id)
);

create index opportunity_travel_routes_route_id_idx on public.opportunity_travel_routes (route_id);

create trigger set_updated_at before update on public.travel_routes
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.travel_requirements
  for each row execute function private.set_updated_at();

-- A requirement is readable when its route is published, or its program is
-- listed; editors read everything.
create function private.travel_requirement_visible(route uuid, opportunity uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_staff_role('{editor}')
    or exists (
      select 1 from public.travel_routes r where r.id = route and r.status = 'published'
    )
    or exists (
      select 1 from public.opportunities o
      where o.id = opportunity and o.status in ('approved', 'closed')
    );
$$;

alter table public.travel_routes enable row level security;
alter table public.travel_requirements enable row level security;
alter table public.opportunity_travel_routes enable row level security;

create policy "Published routes are public; editors see all"
  on public.travel_routes for select to anon, authenticated
  using (status = 'published' or (select private.has_staff_role('{editor}')));
create policy "Editors add routes"
  on public.travel_routes for insert to authenticated
  with check ((select private.has_staff_role('{editor}')));
create policy "Editors change routes"
  on public.travel_routes for update to authenticated
  using ((select private.has_staff_role('{editor}')))
  with check ((select private.has_staff_role('{editor}')));
create policy "Editors delete routes"
  on public.travel_routes for delete to authenticated
  using ((select private.has_staff_role('{editor}')));

create policy "Requirements of published routes and listed programs are public"
  on public.travel_requirements for select to anon, authenticated
  using ((select private.travel_requirement_visible(route_id, opportunity_id)));
create policy "Editors add requirements"
  on public.travel_requirements for insert to authenticated
  with check ((select private.has_staff_role('{editor}')));
create policy "Editors change requirements"
  on public.travel_requirements for update to authenticated
  using ((select private.has_staff_role('{editor}')))
  with check ((select private.has_staff_role('{editor}')));
create policy "Editors delete requirements"
  on public.travel_requirements for delete to authenticated
  using ((select private.has_staff_role('{editor}')));

create policy "Routes of opportunities are public"
  on public.opportunity_travel_routes for select to anon, authenticated
  using (true);
create policy "Editors link routes"
  on public.opportunity_travel_routes for insert to authenticated
  with check ((select private.has_staff_role('{editor}')));
create policy "Editors unlink routes"
  on public.opportunity_travel_routes for delete to authenticated
  using ((select private.has_staff_role('{editor}')));

grant select on public.travel_routes, public.travel_requirements, public.opportunity_travel_routes
  to anon, authenticated;
grant insert, update, delete on public.travel_routes, public.travel_requirements
  to authenticated;
grant insert, delete on public.opportunity_travel_routes to authenticated;

-- ── Travel Kit: a member's kit (private to them) ──────────────────────────

create table public.travel_kits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  route_id uuid not null references public.travel_routes (id) on delete cascade,
  opportunity_id uuid references public.opportunities (id) on delete set null,
  appointment_on date,
  departure_on date,
  -- Adds the guardian steps (`minors_only` requirements).
  minor boolean not null default false,
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (user_id, route_id, opportunity_id)
);

comment on table public.travel_kits is
  'A member''s Travel Kit for one trip: their dates, the under-18 switch, notes. Private to them; never holds a document.';

create index travel_kits_route_id_idx on public.travel_kits (route_id);
create index travel_kits_opportunity_id_idx on public.travel_kits (opportunity_id);

create table public.travel_documents (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  doc_key text not null check (doc_key ~ '^[a-z0-9_]{2,40}$'),
  status public.travel_document_status not null default 'not_started',
  updated_at timestamptz not null default now(),
  primary key (user_id, doc_key)
);

comment on table public.travel_documents is
  'Where a member stands with each kind of document, shared by all their kits. A status only, never the document.';

create table public.travel_kit_ticks (
  kit_id uuid not null references public.travel_kits (id) on delete cascade,
  requirement_id uuid not null references public.travel_requirements (id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (kit_id, requirement_id)
);

comment on table public.travel_kit_ticks is
  'The tasks and open questions a member ticked in one kit.';

create index travel_kit_ticks_requirement_id_idx on public.travel_kit_ticks (requirement_id);

create trigger set_updated_at before update on public.travel_kits
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.travel_documents
  for each row execute function private.set_updated_at();

-- Kits start from a published route; the user is always the caller.
create function private.guard_travel_kit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (new.user_id <> old.user_id or new.route_id <> old.route_id) then
    raise exception 'A kit keeps its member and route' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' and not exists (
    select 1 from public.travel_routes r where r.id = new.route_id and r.status = 'published'
  ) then
    raise exception 'Kits start from a published route' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger guard_travel_kit before insert or update on public.travel_kits
  for each row execute function private.guard_travel_kit();

-- Whether the caller owns this kit.
create function private.owns_travel_kit(kit uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.travel_kits k where k.id = kit and k.user_id = (select auth.uid())
  );
$$;

alter table public.travel_kits enable row level security;
alter table public.travel_documents enable row level security;
alter table public.travel_kit_ticks enable row level security;

create policy "Members see their kits"
  on public.travel_kits for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Members start kits"
  on public.travel_kits for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members change their kits"
  on public.travel_kits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members delete their kits"
  on public.travel_kits for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Members see their documents"
  on public.travel_documents for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Members add their documents"
  on public.travel_documents for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "Members change their documents"
  on public.travel_documents for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members delete their documents"
  on public.travel_documents for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Members see their ticks"
  on public.travel_kit_ticks for select to authenticated
  using ((select private.owns_travel_kit(kit_id)));
create policy "Members tick their kits"
  on public.travel_kit_ticks for insert to authenticated
  with check ((select private.owns_travel_kit(kit_id)));
create policy "Members untick their kits"
  on public.travel_kit_ticks for delete to authenticated
  using ((select private.owns_travel_kit(kit_id)));

grant select, insert, update, delete on public.travel_kits, public.travel_documents
  to authenticated;
grant select, insert, delete on public.travel_kit_ticks to authenticated;

-- The checks run as whoever writes a program (editors, Staff's server).
revoke all on function private.valid_program_itinerary(jsonb) from public, anon;
revoke all on function private.valid_program_costs(jsonb) from public, anon;
grant execute on function private.valid_program_itinerary(jsonb) to authenticated, service_role;
grant execute on function private.valid_program_costs(jsonb) to authenticated, service_role;
revoke all on function private.travel_requirement_visible(uuid, uuid) from public;
grant execute on function private.travel_requirement_visible(uuid, uuid) to anon, authenticated;
revoke all on function private.guard_travel_kit() from public, anon, authenticated;
revoke all on function private.owns_travel_kit(uuid) from public;
grant execute on function private.owns_travel_kit(uuid) to authenticated;
