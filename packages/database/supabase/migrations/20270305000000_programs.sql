-- The IDEA's paid programs (28 October brief, step 14.1; Program Revision
-- v2, Stage 5): a program opportunity The IDEA runs, sold as a whole
-- package (travel insurance, a chaperone for under-18 groups), with an
-- installment plan and a refund schedule.
--
-- * Members apply from the program's page: their details come from the
--   Pass (name, date of birth, phone, area, university) and they add an
--   emergency contact and, when asked, passport scans (private bucket
--   `program-documents`, "<user id>/<program id>/…").
-- * Under 18: the guardian approves the application first, and later
--   payments for it need no second approval.
-- * Editors accept (within the seats), waitlist or refuse. Accepting fixes
--   the price (the Plus price for Plus members) and the installments.
-- * Each installment is paid through the one cart (online only, never as
--   a gift): the next one, or everything left. Paying the first confirms
--   the place.
-- * Withdrawing refunds by the program's schedule (days before it
--   starts); a refused visa refunds the program's visa share; a program
--   The IDEA calls off refunds everything. Finance marks refunds paid.
-- * Passport scans are deleted 30 days after the application ends or the
--   program does (`sweep_program_documents`, the API's daily cron).

-- ── Plans and schedules ───────────────────────────────────────────────────

-- Installments: 1 to 6 shares of the price that add up to 100%. The first
-- is due within the program's payment window after acceptance; each later
-- one has its own date, in order.
create function private.valid_installments(plan jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  step jsonb;
  total integer := 0;
  previous date;
  due date;
  n integer := 0;
begin
  if jsonb_typeof(plan) is distinct from 'array'
    or jsonb_array_length(plan) not between 1 and 6
  then
    return false;
  end if;
  for step in select * from jsonb_array_elements(plan) loop
    n := n + 1;
    if jsonb_typeof(step) <> 'object'
      or jsonb_typeof(step -> 'percent') is distinct from 'number'
      or (step ->> 'percent') !~ '^[0-9]+$'
      or (step ->> 'percent')::integer not between 1 and 100
      or exists (select 1 from jsonb_object_keys(step) k where k not in ('percent', 'due_on'))
    then
      return false;
    end if;
    if n = 1 then
      if step ? 'due_on' then
        return false;
      end if;
    else
      if jsonb_typeof(step -> 'due_on') is distinct from 'string'
        or (step ->> 'due_on') !~ '^\d{4}-\d{2}-\d{2}$'
      then
        return false;
      end if;
      -- make_date (immutable) rather than a cast; an impossible date fails.
      due := make_date(
        substr(step ->> 'due_on', 1, 4)::integer,
        substr(step ->> 'due_on', 6, 2)::integer,
        substr(step ->> 'due_on', 9, 2)::integer
      );
      if previous is not null and due <= previous then
        return false;
      end if;
      previous := due;
    end if;
    total := total + (step ->> 'percent')::integer;
  end loop;
  return total = 100;
end;
$$;

-- Refunds on withdrawing: up to 6 steps, from the furthest out, each the
-- share refunded when withdrawing at least that many days before the
-- program starts; the shares never grow closer to the start. Nothing is
-- refunded after the last step.
create function private.valid_refund_schedule(schedule jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  step jsonb;
  last_days integer;
  last_percent integer;
begin
  if jsonb_typeof(schedule) is distinct from 'array' or jsonb_array_length(schedule) > 6 then
    return false;
  end if;
  for step in select * from jsonb_array_elements(schedule) loop
    if jsonb_typeof(step) <> 'object'
      or (step ->> 'days_before') !~ '^[0-9]+$'
      or (step ->> 'percent') !~ '^[0-9]+$'
      or jsonb_typeof(step -> 'days_before') <> 'number'
      or jsonb_typeof(step -> 'percent') <> 'number'
      or (step ->> 'days_before')::integer > 365
      or (step ->> 'percent')::integer > 100
      or exists (select 1 from jsonb_object_keys(step) k where k not in ('days_before', 'percent'))
    then
      return false;
    end if;
    if last_days is not null and (
      (step ->> 'days_before')::integer >= last_days
      or (step ->> 'percent')::integer > last_percent
    ) then
      return false;
    end if;
    last_days := (step ->> 'days_before')::integer;
    last_percent := (step ->> 'percent')::integer;
  end loop;
  return true;
end;
$$;

-- ── Programs ──────────────────────────────────────────────────────────────

create table public.programs (
  opportunity_id uuid primary key references public.opportunities (id) on delete cascade,
  -- The whole package, in IQD.
  price bigint not null check (price >= 0 and price % 250 = 0),
  -- For Plus members, when lower.
  plus_price bigint check (plus_price >= 0 and plus_price % 250 = 0),
  seats integer check (seats between 1 and 1000),
  min_age smallint not null default 13 check (min_age between 13 and 99),
  max_age smallint check (max_age between 13 and 99),
  -- Abroad: travel insurance is part of every travelling package.
  travel boolean not null default true,
  insurance boolean not null default true,
  -- Groups with anyone under 18 travel with a chaperone from The IDEA.
  chaperone boolean not null default true,
  passport_required boolean not null default true,
  includes_ar text check (char_length(includes_ar) <= 2000),
  includes_en text check (char_length(includes_en) <= 2000),
  installments jsonb not null default '[{"percent": 100}]'::jsonb
    check (private.valid_installments(installments)),
  refund_schedule jsonb not null default '[]'::jsonb
    check (private.valid_refund_schedule(refund_schedule)),
  -- The share refunded when the visa is refused.
  visa_refund_rate smallint not null default 100 check (visa_refund_rate between 0 and 100),
  -- Days to pay the first installment once accepted.
  pay_within_days smallint not null default 7 check (pay_within_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (plus_price is null or plus_price < price),
  check (max_age is null or max_age >= min_age),
  check (not travel or insurance),
  check (min_age >= 18 or chaperone)
);

comment on table public.programs is
  'The IDEA''s paid program behind a program opportunity: the package (insurance, chaperone), its price, seats, ages, installments and refund schedule.';

create trigger set_updated_at before update on public.programs
  for each row execute function private.set_updated_at();

-- Only The IDEA's own program opportunities are sold as packages.
create function private.check_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.opportunities o
    where o.id = new.opportunity_id and o.kind = 'program' and o.organization_id is null
  ) then
    raise exception 'Only The IDEA''s own programs are sold here' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_program before insert or update of opportunity_id on public.programs
  for each row execute function private.check_program();

alter table public.programs enable row level security;

-- As its opportunity: anyone once listed, editors always.
create policy "Programs show with their opportunity" on public.programs
  for select to anon, authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));

create policy "Editors add programs" on public.programs
  for insert to authenticated
  with check ((select private.has_staff_role('{editor}')));

create policy "Editors change programs" on public.programs
  for update to authenticated
  using ((select private.has_staff_role('{editor}')))
  with check ((select private.has_staff_role('{editor}')));

create policy "Editors delete programs" on public.programs
  for delete to authenticated
  using ((select private.has_staff_role('{editor}')));

grant select on public.programs to anon, authenticated;
grant insert, update, delete on public.programs to authenticated;

-- ── Applications ──────────────────────────────────────────────────────────

create table public.program_applications (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (opportunity_id) on delete restrict,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'submitted' check (status in (
    'submitted', 'waitlisted', 'accepted', 'confirmed', 'completed',
    'refused', 'withdrawn', 'cancelled'
  )),
  -- What the Pass held when applying (name, date of birth, phone, area,
  -- university), so staff don't ask again.
  details jsonb not null default '{}'::jsonb,
  emergency_name text not null check (char_length(trim(emergency_name)) between 1 and 120),
  emergency_phone text not null check (emergency_phone ~ '^\+[1-9][0-9]{7,14}$'),
  motivation text check (char_length(motivation) <= 2000),
  -- Passport scans in `program-documents`; emptied when deleted.
  passport_files text[] not null default '{}' check (cardinality(passport_files) <= 3),
  documents_removed_at timestamptz,
  -- Under 18: the guardian's yes before review.
  guardian_id uuid references auth.users (id) on delete set null,
  guardian_status text check (guardian_status in ('pending', 'approved', 'declined')),
  guardian_decided_at timestamptz,
  -- Fixed on acceptance.
  price bigint check (price >= 0),
  plus_price boolean not null default false,
  pay_by date,
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  -- Why a place was cancelled.
  cancel_reason text check (cancel_reason in ('guardian', 'visa_refused', 'unpaid', 'the_idea')),
  ended_at timestamptz,
  refund_amount bigint check (refund_amount >= 0),
  refunded_at timestamptz,
  refunded_by uuid references auth.users (id) on delete set null,
  refund_reference text check (char_length(refund_reference) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'cancelled') = (cancel_reason is not null))
);

comment on table public.program_applications is
  'A member''s application to one of The IDEA''s paid programs: details from the Pass, passport scans, the guardian''s approval, the decision, the price fixed on acceptance and any refund. Written only through the program functions.';

create unique index program_applications_live_key on public.program_applications (program_id, user_id)
  where status not in ('refused', 'withdrawn', 'cancelled');
create index program_applications_user_id_idx on public.program_applications (user_id);
create index program_applications_guardian_id_idx on public.program_applications (guardian_id);
create index program_applications_reviewed_by_idx on public.program_applications (reviewed_by);
create index program_applications_refunded_by_idx on public.program_applications (refunded_by);
create index program_applications_status_idx on public.program_applications (status, created_at);

create trigger set_updated_at before update on public.program_applications
  for each row execute function private.set_updated_at();

alter table public.program_applications enable row level security;

create policy "Applicants, their guardians and staff see applications"
  on public.program_applications for select to authenticated
  using (
    user_id = (select auth.uid())
    or guardian_id = (select auth.uid())
    or (select private.has_staff_role('{editor,finance}'))
  );

grant select on public.program_applications to authenticated;

-- Each installment of an accepted application, and the order paying it.
create table public.program_payments (
  application_id uuid not null references public.program_applications (id) on delete cascade,
  position smallint not null check (position between 1 and 6),
  amount bigint not null check (amount > 0),
  due_on date not null,
  order_id uuid references public.orders (id) on delete set null,
  paid_at timestamptz,
  primary key (application_id, position)
);

comment on table public.program_payments is
  'An installment of an accepted program application: amount, due date, and the order that paid it.';

create index program_payments_order_id_idx on public.program_payments (order_id);

alter table public.program_payments enable row level security;

create policy "Payments show with their application" on public.program_payments
  for select to authenticated
  using (exists (select 1 from public.program_applications a where a.id = application_id));

grant select on public.program_payments to authenticated;

-- ── Passport scans ────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-documents', 'program-documents', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Members upload program documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'program-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members and editors read program documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'program-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{editor}'))
    )
  );

create policy "Members and editors delete program documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'program-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{editor}'))
    )
  );

-- The member's scans for one program: their own folder for it, uploaded.
create function private.program_files_ok(member uuid, program uuid, paths text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(bool_and(
    split_part(f, '/', 1) = member::text
    and split_part(f, '/', 2) = program::text
    and char_length(f) <= 500
    and exists (
      select 1 from storage.objects s where s.bucket_id = 'program-documents' and s.name = f
    )
  ), true)
  from unnest(paths) f;
$$;

-- ── Applying ──────────────────────────────────────────────────────────────

-- What the Pass knows that an application needs.
create function private.program_applicant(member uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'full_name', p.full_name,
    'legal_name', (select i.legal_name from public.identity_verifications i where i.user_id = member),
    'birthday', p.birthday,
    'email', (select u.email from auth.users u where u.id = member),
    'phone', (select v.phone from public.verified_phones v where v.user_id = member),
    'whatsapp', p.whatsapp_phone,
    'governorate', a.governorate,
    'area', a.area,
    'university_ar', un.name_ar,
    'university_en', un.name_en,
    'major', b.major,
    'study_year', b.study_year
  ))
  from public.profiles p
  left join lateral (
    select ua.governorate, ua.area from public.user_addresses ua
    where ua.user_id = member
    order by ua.is_default desc, ua.created_at
    limit 1
  ) a on true
  left join public.student_badges b on b.user_id = member and b.valid_until >= current_date
  left join public.universities un on un.id = b.university_id
  where p.id = member;
$$;

create function private.apply_to_program(
  program uuid,
  emergency_name text,
  emergency_phone text,
  motivation text default null,
  passport_files text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  found public.programs;
  listing public.opportunities;
  years integer;
  guardian uuid;
  created uuid;
  files text[] := coalesce(passport_files, '{}');
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select * into found from public.programs p where p.opportunity_id = program;
  select * into listing from public.opportunities o where o.id = program;
  if found.opportunity_id is null or listing.status <> 'approved' then
    raise exception 'Program not found' using errcode = 'no_data_found';
  end if;
  if (listing.opens_at is not null and listing.opens_at > now())
    or (listing.deadline is not null and listing.deadline <= now())
  then
    raise exception 'Applications are closed' using errcode = 'check_violation';
  end if;

  -- Ages on the day it starts (today when it has no date yet).
  select extract(year from age(
    coalesce(listing.starts_on, (now() at time zone 'Asia/Baghdad')::date), p.birthday
  ))::integer
  into years
  from public.profiles p where p.id = caller;
  if years is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  if years < found.min_age or years > coalesce(found.max_age, 99) then
    raise exception 'This program is for other ages' using errcode = 'check_violation';
  end if;

  if private.is_minor(caller) then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your application' using errcode = 'check_violation';
    end if;
  end if;

  if found.passport_required and cardinality(files) = 0 then
    raise exception 'Add your passport' using errcode = 'check_violation';
  end if;
  if not private.program_files_ok(caller, program, files) then
    raise exception 'Invalid documents' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.program_applications a
    where a.program_id = program and a.user_id = caller
      and a.status not in ('refused', 'withdrawn', 'cancelled')
  ) then
    raise exception 'You have already applied' using errcode = 'unique_violation';
  end if;

  insert into public.program_applications (
    program_id, user_id, details, emergency_name, emergency_phone, motivation,
    passport_files, guardian_id, guardian_status
  )
  values (
    program, caller, private.program_applicant(caller), trim(emergency_name),
    emergency_phone, nullif(trim(coalesce(motivation, '')), ''), files,
    guardian, case when guardian is not null then 'pending' end
  )
  returning id into created;

  if guardian is not null then
    perform private.notify(
      guardian, 'system', 'program_guardian_request',
      jsonb_build_object(
        'name', private.first_name(caller),
        'title_ar', listing.title_ar,
        'title_en', listing.title_en
      ),
      '/pass/settings#guardian'
    );
  end if;
  return created;
end;
$$;

create function public.apply_to_program(
  program uuid,
  emergency_name text,
  emergency_phone text,
  motivation text default null,
  passport_files text[] default '{}'
)
returns uuid
language sql
set search_path = ''
as $$ select private.apply_to_program(program, emergency_name, emergency_phone, motivation, passport_files) $$;

-- The applicant replaces their passport scans while the application is
-- open; the old files are theirs to delete.
create function private.set_program_documents(application uuid, files text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
begin
  select * into found from public.program_applications a
  where a.id = application and a.user_id = (select auth.uid())
  for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.status not in ('submitted', 'waitlisted', 'accepted', 'confirmed')
    or found.documents_removed_at is not null
  then
    raise exception 'This application is closed' using errcode = 'check_violation';
  end if;
  if cardinality(coalesce(files, '{}')) = 0
    and (select p.passport_required from public.programs p where p.opportunity_id = found.program_id)
  then
    raise exception 'Add your passport' using errcode = 'check_violation';
  end if;
  if not private.program_files_ok(found.user_id, found.program_id, coalesce(files, '{}')) then
    raise exception 'Invalid documents' using errcode = 'check_violation';
  end if;
  update public.program_applications set passport_files = coalesce(files, '{}')
  where id = application;
end;
$$;

create function public.set_program_documents(application uuid, files text[])
returns void
language sql
set search_path = ''
as $$ select private.set_program_documents(application, files) $$;

-- The guardian approves or declines; declining cancels the application.
create function private.decide_program_guardian(application uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  listing public.opportunities;
begin
  select * into found from public.program_applications a
  where a.id = application and a.guardian_id = (select auth.uid())
  for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.guardian_status is distinct from 'pending' or found.status <> 'submitted' then
    raise exception 'Already decided' using errcode = 'check_violation';
  end if;
  select * into listing from public.opportunities o where o.id = found.program_id;

  update public.program_applications set
    guardian_status = case when approve then 'approved' else 'declined' end,
    guardian_decided_at = now(),
    status = case when approve then status else 'cancelled' end,
    cancel_reason = case when approve then null else 'guardian' end,
    ended_at = case when approve then null else now() end
  where id = application;

  perform private.notify(
    found.user_id, 'system',
    case when approve then 'program_guardian_approved' else 'program_guardian_declined' end,
    jsonb_build_object('title_ar', listing.title_ar, 'title_en', listing.title_en),
    '/club/yours?tab=applications'
  );
end;
$$;

create function public.decide_program_guardian(application uuid, approve boolean)
returns void
language sql
set search_path = ''
as $$ select private.decide_program_guardian(application, approve) $$;

-- ── Review ────────────────────────────────────────────────────────────────

-- Editors accept (within the seats; a minor's guardian approved first),
-- waitlist or refuse. Accepting fixes the price and its installments.
create function private.review_program_application(
  application uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  program public.programs;
  listing public.opportunities;
  taken integer;
  cost bigint;
  plus boolean := false;
  first_due date;
  step jsonb;
  n integer := 0;
  share bigint;
  shared bigint := 0;
  steps integer;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if decision not in ('accepted', 'waitlisted', 'refused') then
    raise exception 'Accept, waitlist or refuse' using errcode = 'check_violation';
  end if;
  select * into found from public.program_applications a where a.id = application for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.status not in ('submitted', 'waitlisted') then
    raise exception 'Already decided' using errcode = 'check_violation';
  end if;
  -- Lock the program so two acceptances can't take the last seat.
  select * into program from public.programs p where p.opportunity_id = found.program_id for update;
  select * into listing from public.opportunities o where o.id = found.program_id;

  if decision = 'accepted' then
    if found.guardian_status is not null and found.guardian_status <> 'approved' then
      raise exception 'The guardian hasn''t approved yet' using errcode = 'check_violation';
    end if;
    select count(*) into taken from public.program_applications a
    where a.program_id = found.program_id and a.status in ('accepted', 'confirmed', 'completed');
    if program.seats is not null and taken >= program.seats then
      raise exception 'No seats left' using errcode = 'check_violation';
    end if;

    cost := program.price;
    if program.plus_price is not null and private.plus_tier(found.user_id) > 0 then
      cost := program.plus_price;
      plus := true;
    end if;
    first_due := (now() at time zone 'Asia/Baghdad')::date + program.pay_within_days;

    -- Each share rounded down to 250 IQD; the last takes what's left.
    steps := jsonb_array_length(program.installments);
    for step in select * from jsonb_array_elements(program.installments) loop
      n := n + 1;
      if n = steps then
        share := cost - shared;
      else
        share := floor(cost * (step ->> 'percent')::integer / 100 / 250)::bigint * 250;
      end if;
      if share > 0 then
        insert into public.program_payments (application_id, position, amount, due_on)
        values (
          application, n, share,
          greatest(coalesce((step ->> 'due_on')::date, first_due), first_due)
        );
      end if;
      shared := shared + share;
    end loop;
  end if;

  update public.program_applications set
    status = case
      when decision = 'accepted' and cost = 0 then 'confirmed'
      else decision
    end,
    price = case when decision = 'accepted' then cost else price end,
    plus_price = case when decision = 'accepted' then plus else plus_price end,
    pay_by = case when decision = 'accepted' and cost > 0 then first_due else pay_by end,
    review_note = left(nullif(trim(coalesce(note, '')), ''), 1000),
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    ended_at = case when decision = 'refused' then now() else ended_at end
  where id = application;

  perform private.notify(
    found.user_id, 'system', 'program_' || decision,
    jsonb_build_object('title_ar', listing.title_ar, 'title_en', listing.title_en),
    '/club/yours?tab=applications'
  );
end;
$$;

create function public.review_program_application(
  application uuid,
  decision text,
  note text default null
)
returns void
language sql
set search_path = ''
as $$ select private.review_program_application(application, decision, note) $$;

-- What has been paid on an application.
create function private.program_paid(application uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(p.amount), 0)::bigint from public.program_payments p
  where p.application_id = application and p.paid_at is not null;
$$;

-- The share refunded when withdrawing today, by the program's schedule.
create function private.program_refund_rate(program uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max((s ->> 'percent')::integer), 0)
  from public.programs p
  join public.opportunities o on o.id = p.opportunity_id
  cross join lateral jsonb_array_elements(p.refund_schedule) s
  where p.opportunity_id = program
    and o.starts_on is not null
    and o.starts_on - (now() at time zone 'Asia/Baghdad')::date >= (s ->> 'days_before')::integer;
$$;

-- Ends an application: its unpaid installments' open orders are cancelled
-- and it leaves the cart.
create function private.close_program_application(
  application uuid,
  outcome text,
  reason text,
  refund bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders o set status = 'cancelled'
  where o.status = 'pending'
    and o.id in (
      select p.order_id from public.program_payments p
      where p.application_id = application and p.paid_at is null and p.order_id is not null
    );
  delete from public.cart_programs where application_id = application;
  update public.program_applications set
    status = outcome,
    cancel_reason = reason,
    ended_at = now(),
    refund_amount = nullif(refund, 0)
  where id = application;
end;
$$;

-- The applicant withdraws before the program starts; what was paid comes
-- back by the refund schedule.
create function private.withdraw_program_application(application uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  starts date;
  refund bigint;
begin
  select * into found from public.program_applications a
  where a.id = application and a.user_id = (select auth.uid())
  for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.status not in ('submitted', 'waitlisted', 'accepted', 'confirmed') then
    raise exception 'This application is closed' using errcode = 'check_violation';
  end if;
  select o.starts_on into starts from public.opportunities o where o.id = found.program_id;
  if starts is not null and starts <= (now() at time zone 'Asia/Baghdad')::date then
    raise exception 'The program has started; talk to us' using errcode = 'check_violation';
  end if;

  refund := floor(
    private.program_paid(application) * private.program_refund_rate(found.program_id) / 100.0
  )::bigint;
  perform private.close_program_application(application, 'withdrawn', null, refund);
  return refund;
end;
$$;

create function public.withdraw_program_application(application uuid)
returns bigint
language sql
set search_path = ''
as $$ select private.withdraw_program_application(application) $$;

-- Editors close a place: the program done, a refused visa (the program's
-- visa share back), unpaid by the date (the refund schedule), or called
-- off by The IDEA (everything back).
create function private.end_program_application(application uuid, outcome text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  program public.programs;
  listing public.opportunities;
  paid bigint;
  refund bigint := 0;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if outcome not in ('completed', 'visa_refused', 'unpaid', 'the_idea') then
    raise exception 'Unknown outcome' using errcode = 'check_violation';
  end if;
  select * into found from public.program_applications a where a.id = application for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  select * into program from public.programs p where p.opportunity_id = found.program_id;
  select * into listing from public.opportunities o where o.id = found.program_id;
  paid := private.program_paid(application);

  if outcome = 'completed' then
    if found.status <> 'confirmed' then
      raise exception 'Only confirmed places complete' using errcode = 'check_violation';
    end if;
    update public.program_applications set status = 'completed', ended_at = now()
    where id = application;
    return 0;
  end if;

  if outcome = 'unpaid' then
    if found.status <> 'accepted' or found.pay_by >= (now() at time zone 'Asia/Baghdad')::date then
      raise exception 'Not overdue' using errcode = 'check_violation';
    end if;
    refund := floor(paid * private.program_refund_rate(found.program_id) / 100.0)::bigint;
  elsif found.status not in ('submitted', 'waitlisted', 'accepted', 'confirmed') then
    raise exception 'This application is closed' using errcode = 'check_violation';
  elsif outcome = 'visa_refused' then
    refund := floor(paid * program.visa_refund_rate / 100.0)::bigint;
  else
    refund := paid;
  end if;

  perform private.close_program_application(application, 'cancelled', outcome, refund);
  perform private.notify(
    found.user_id, 'system', 'program_cancelled',
    jsonb_build_object(
      'title_ar', listing.title_ar, 'title_en', listing.title_en,
      'reason', outcome, 'refund', refund
    ),
    '/club/yours?tab=applications'
  );
  return refund;
end;
$$;

create function public.end_program_application(application uuid, outcome text)
returns bigint
language sql
set search_path = ''
as $$ select private.end_program_application(application, outcome) $$;

-- Finance pays a refund (Wayl or cash) and records it.
create function private.mark_program_refunded(application uuid, reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  listing public.opportunities;
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into found from public.program_applications a where a.id = application for update;
  if found.id is null or coalesce(found.refund_amount, 0) = 0 or found.refunded_at is not null then
    raise exception 'No refund due' using errcode = 'check_violation';
  end if;
  select * into listing from public.opportunities o where o.id = found.program_id;
  update public.program_applications set
    refunded_at = now(),
    refunded_by = (select auth.uid()),
    refund_reference = left(nullif(trim(coalesce(reference, '')), ''), 200)
  where id = application;
  perform private.notify(
    found.user_id, 'system', 'program_refunded',
    jsonb_build_object(
      'title_ar', listing.title_ar, 'title_en', listing.title_en, 'amount', found.refund_amount
    ),
    '/club/yours?tab=applications'
  );
end;
$$;

create function public.mark_program_refunded(application uuid, reference text default null)
returns void
language sql
set search_path = ''
as $$ select private.mark_program_refunded(application, reference) $$;

-- ── In the cart ───────────────────────────────────────────────────────────

-- An accepted application's next installment, or everything left.
create table public.cart_programs (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  application_id uuid not null references public.program_applications (id) on delete cascade,
  pay_in_full boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (user_id, application_id)
);

comment on table public.cart_programs is
  'A program installment (or the rest) waiting in the cart; create_order adds it to the order.';

create index cart_programs_application_id_idx on public.cart_programs (application_id);

alter table public.cart_programs enable row level security;

create policy "Members see their cart's programs" on public.cart_programs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Members put their applications in the cart" on public.cart_programs
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.program_applications a
      where a.id = application_id and a.user_id = (select auth.uid())
        and a.status in ('accepted', 'confirmed')
    )
  );
create policy "Members change their cart's programs" on public.cart_programs
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "Members take programs out of their cart" on public.cart_programs
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.cart_programs to authenticated;
grant insert (application_id, pay_in_full) on public.cart_programs to authenticated;
grant update (pay_in_full) on public.cart_programs to authenticated;

-- Installments an application can pay now: unpaid and not in an open
-- order, the next one first.
create function private.program_due(application uuid, everything boolean)
returns table (installment smallint, amount bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.position, p.amount from public.program_payments p
  where p.application_id = application and p.paid_at is null
    and not exists (
      select 1 from public.orders o
      where o.id = p.order_id and o.status not in ('cancelled', 'refunded')
    )
  order by p.position
  limit case when everything then 6 else 1 end;
$$;

-- An order paid: its installments are paid, and paying the first confirms
-- the place.
create function private.on_order_paid_programs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'paid' and old.status is distinct from 'paid' then
    update public.program_payments set paid_at = coalesce(new.paid_at, now())
    where order_id = new.id and paid_at is null;
    update public.program_applications set status = 'confirmed'
    where status = 'accepted'
      and id in (select p.application_id from public.program_payments p where p.order_id = new.id);
  end if;
  return null;
end;
$$;

create trigger on_order_paid_programs after update of status on public.orders
  for each row execute function private.on_order_paid_programs();

-- ── Passport scans are deleted after ──────────────────────────────────────

-- 30 days after the application ends or the program does: the scans are
-- forgotten here and their paths returned for the API to delete.
create function public.sweep_program_documents()
returns table (application_id uuid, files text[])
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select a.id, a.passport_files from public.program_applications a
    join public.opportunities o on o.id = a.program_id
    where cardinality(a.passport_files) > 0
      and (
        a.ended_at < now() - interval '30 days'
        or coalesce(o.ends_on, o.starts_on) < (now() at time zone 'Asia/Baghdad')::date - 30
      )
    for update of a
  ),
  cleared as (
    update public.program_applications a set
      passport_files = '{}',
      documents_removed_at = now()
    from due
    where a.id = due.id
    returning a.id
  )
  select due.id, due.passport_files from due join cleared on cleared.id = due.id;
end;
$$;

-- ── Order lines ───────────────────────────────────────────────────────────

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('sale', 'rental', 'deposit', 'keep', 'swap', 'kit', 'survey', 'plus', 'program'));

-- Programs earn Bulbs like everything else bought.
create or replace function private.earn_order_bulbs(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  paid_share numeric;
  cap integer;
  earned integer;
  usable_at timestamptz := now() + private.return_window();
begin
  select o.user_id,
    case when o.subtotal + o.shipping_fee > 0
      then o.total::numeric / (o.subtotal + o.shipping_fee)
      else 0
    end,
    o.max_bulbs
  into member, paid_share, cap
  from public.orders o where o.id = target;
  if member is null then
    return;
  end if;

  select round(
    coalesce(sum(i.unit_price * i.quantity), 0) * paid_share * private.bulb_rate(member) / 100
  )::integer
  into earned
  from public.order_items i
  where i.order_id = target and i.kind in ('sale', 'rental', 'keep', 'kit', 'program');

  earned := least(earned, coalesce(cap, earned));

  if earned > 0 then
    insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id)
    values (member, earned, 'purchase', 'pending', usable_at, target)
    on conflict do nothing;
  end if;

  insert into public.bulb_entries (user_id, amount, kind, status, available_at, order_id, reason)
  values (member, 2000, 'bonus', 'pending', usable_at, target, 'first_order')
  on conflict do nothing;
end;
$$;

-- ── Checkout: program installments in the one cart ───────────────────────

create or replace function private.price_checkout(
  member uuid,
  governorate text,
  fulfilment public.order_fulfilment,
  payment_method public.order_payment_method,
  delivery_zone uuid,
  use_bulbs integer
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cash boolean := price_checkout.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(governorate, '')));
  settings public.store_settings;
  zone public.delivery_zones;
  plan public.plans;
  line record;
  lines jsonb := '[]'::jsonb;
  copies integer;
  line_price bigint;
  offer public.offers;
  deal_rate integer;
  student boolean := private.is_student(member);
  student_cost bigint;
  -- Plus members: the shop's Plus price, or a campaign's price before it
  -- opens to everyone.
  tier integer := private.plus_tier(member);
  plus_cost bigint;
  subtotal bigint := 0;
  fee bigint := 0;
  waived bigint := 0;
  free_reason text;
  invite public.referrals;
  coupon public.coupons;
  coupon_off bigint;
  promo bigint := 0;
  source text;
  cap bigint;
  usable bigint;
  bulbs integer := 0;
  total bigint;
  max_bulbs integer;
  earn integer;
  -- Rent lines: their rent, refundable deposits and the rentals to make.
  rental record;
  rate record;
  rent_items jsonb := '[]'::jsonb;
  rentals jsonb := '[]'::jsonb;
  rent bigint := 0;
  deposits bigint := 0;
  goods bigint := 0;
  item public.products;
  -- The cart's game night kit, if any.
  cart_kit public.cart_kits;
  kit_row public.kit_types;
  weekend record;
  kit jsonb;
  -- Plus months given as a gift, if any.
  cart_plus public.cart_plus_gifts;
  gift_plan public.plans;
  plus bigint := 0;
  plus_gift jsonb;
  -- Program installments, if any.
  cart_program record;
  program_lines jsonb := '[]'::jsonb;
  programs bigint := 0;
  program_amount bigint;
  program_positions smallint[];
  has_programs boolean;
  -- Whether anything in the cart is delivered.
  ships boolean;
begin
  select * into settings from public.store_settings;

  if price_checkout.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;


  if coalesce(use_bulbs, 0) < 0 then
    raise exception 'Invalid Bulbs' using errcode = 'check_violation';
  end if;

  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  select * into cart_kit from public.cart_kits k where k.user_id = member;
  select * into cart_plus from public.cart_plus_gifts g where g.user_id = member;
  ships := cart_kit.id is not null
    or exists (select 1 from public.cart_items where user_id = member);
  has_programs := exists (select 1 from public.cart_programs c where c.user_id = member);
  if not ships and cart_plus.user_id is null and not has_programs then
    raise exception 'Cart is empty' using errcode = 'no_data_found';
  end if;
  -- Programs are paid online, never on delivery.
  if cash and has_programs then
    raise exception 'Programs are paid online' using errcode = 'check_violation';
  end if;

  -- Plus months on their own are added to the recipient's Pass: nothing
  -- is delivered, so no zone is needed.
  if ships or delivery_zone is not null or wanted <> '' then
    if delivery_zone is not null then
      select * into zone from public.delivery_zones z
      where z.id = delivery_zone and z.active;
    else
      select * into zone from public.delivery_zones z
      where z.active and (z.governorate = wanted or lower(z.name_en) = wanted)
      order by z.position
      limit 1;
    end if;
    if zone.id is null then
      raise exception 'Delivery zone not available' using errcode = 'check_violation';
    end if;
  end if;

  for line in
    select
      c.product_id,
      c.variant_id,
      c.seller_id,
      sl.name as seller_name,
      sl.status as seller_status,
      coalesce(c.condition, p.condition) as condition,
      c.quantity,
      p.status,
      p.name_ar,
      p.name_en,
      coalesce(v.attributes, '{}'::jsonb) as attributes
    from public.cart_items c
    join public.products p on p.id = c.product_id
    join public.sellers sl on sl.id = c.seller_id
    left join public.product_variants v on v.id = c.variant_id
    where c.user_id = member and c.purpose = 'sale'
    order by c.created_at, c.product_id
  loop
    if line.status <> 'active' or line.seller_status <> 'approved' then
      raise exception 'A product in the cart is no longer available'
        using errcode = 'check_violation';
    end if;

    -- The line costs the dearest of the copies it gets (copies of the same
    -- condition normally share a price), so it never undercharges.
    select count(*), max(f.price) into copies, line_price
    from private.copies_for_line(line.product_id, line.variant_id, line.condition, line.quantity, line.seller_id) f;

    if copies < line.quantity then
      raise exception 'Not enough stock' using errcode = 'check_violation';
    end if;

    -- An accepted offer prices one copy of its listing for 24 hours.
    select * into offer from public.offers o
    where o.buyer_id = member and o.status = 'accepted' and o.cart_until > now()
      and o.seller_id = line.seller_id and o.variant_id = line.variant_id
      and o.condition = line.condition;
    if offer.id is not null then
      if line.quantity > 1 then
        raise exception 'An accepted offer is for one copy' using errcode = 'check_violation';
      end if;
      line_price := least(line_price, offer.amount);
    end if;

    -- A quantity deal takes its share off each copy from its quantity on.
    select d.discount_rate into deal_rate from public.quantity_deals d
    where d.seller_id = line.seller_id and d.variant_id = line.variant_id
      and d.condition = line.condition and d.min_quantity <= line.quantity
    order by d.discount_rate desc
    limit 1;
    if deal_rate is not null and offer.id is null then
      line_price := line_price - floor(line_price * deal_rate / 100)::bigint;
    else
      deal_rate := null;
    end if;

    -- A verified student pays the listing's student price when it is lower
    -- than everything above (never with an accepted offer); the shop pays it.
    student_cost := null;
    if student and offer.id is null then
      select sp.price into student_cost from public.student_prices sp
      where sp.seller_id = line.seller_id and sp.variant_id = line.variant_id
        and sp.condition = line.condition;
      if student_cost is not null and student_cost < line_price then
        line_price := student_cost;
        deal_rate := null;
      else
        student_cost := null;
      end if;
    end if;

    -- A Plus member pays the listing's Plus price (the shop pays it) or the
    -- early campaign price when it is lower still (never with an offer).
    plus_cost := null;
    if tier > 0 and offer.id is null then
      plus_cost := private.plus_price(line.seller_id, line.variant_id, line.condition, tier);
      if plus_cost is not null and plus_cost < line_price then
        line_price := plus_cost;
        deal_rate := null;
        student_cost := null;
      else
        plus_cost := null;
      end if;
    end if;

    subtotal := subtotal + line_price * line.quantity;
    lines := lines || jsonb_build_object(
      'product_id', line.product_id,
      'variant_id', line.variant_id,
      'seller_id', line.seller_id,
      'seller_name', line.seller_name,
      'condition', line.condition,
      'quantity', line.quantity,
      'unit_price', line_price,
      'offer_id', offer.id,
      'deal_rate', deal_rate,
      'student_price', student_cost is not null,
      'plus_price', plus_cost is not null,
      'name_ar', line.name_ar,
      'name_en', line.name_en,
      'attributes', line.attributes
    );
  end loop;

  goods := subtotal;

  -- Rent lines: 1 to 3, several only films, books and games; each priced
  -- by its rate, with a copy free to go out.
  select coalesce(jsonb_agg(
    jsonb_build_object('product', c.product_id, 'variant', c.variant_id)
    order by c.created_at, c.product_id
  ), '[]'::jsonb)
  into rent_items
  from public.cart_items c
  where c.user_id = member and c.purpose = 'rent';
  if jsonb_array_length(rent_items) > 0 then
    for rental in select * from private.rental_items(rent_items) loop
      select * into item from public.products p where p.id = rental.product;
      select * into rate from private.rental_quote(rental.product, rental.variant);
      if item.status is distinct from 'active' or rate.price is null then
        raise exception 'Item not available' using errcode = 'no_data_found';
      end if;
      if not exists (
        select 1 from public.stock_items s
        join public.product_variants v on v.id = s.variant_id
        where s.product_id = rental.product and v.active
          and (rental.variant is null or s.variant_id = rental.variant)
          and s.purpose = 'rental' and s.status = 'available'
      ) then
        raise exception 'All copies are rented out' using errcode = 'check_violation';
      end if;
      rent := rent + rate.price;
      deposits := deposits + rate.deposit;
      rentals := rentals || jsonb_build_object(
        'product_id', rental.product,
        'variant_id', rental.variant,
        'name_ar', item.name_ar,
        'name_en', item.name_en,
        'price', rate.price,
        'deposit', rate.deposit,
        'days', rate.days,
        'late_fee', rate.late_fee
      );
    end loop;
  end if;

  -- A game night kit: the weekend's price and its extra days count like
  -- rent, with its deposit (none for verified students); delivered in
  -- Baghdad only.
  if cart_kit.id is not null then
    select * into kit_row from public.kit_types k where k.id = cart_kit.kit_type and k.active;
    select * into weekend from private.kit_weekends(cart_kit.kit_type) w
    where w.starts_on = cart_kit.starts_on;
    if kit_row.id is null or weekend.starts_on is null then
      raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
    end if;
    if private.free_kit_unit(kit_row.id, cart_kit.starts_on, cart_kit.starts_on + 2 + cart_kit.extra_days) is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    if zone.governorate is distinct from 'baghdad' then
      raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
    end if;
    if private.is_student(member) then
      kit_row.deposit := 0;
    end if;
    kit := jsonb_build_object(
      'kit_type', kit_row.id,
      'name_ar', kit_row.name_ar,
      'name_en', kit_row.name_en,
      'starts_on', cart_kit.starts_on,
      'extra_days', cart_kit.extra_days,
      'games', to_jsonb(cart_kit.games),
      'price', weekend.price + cart_kit.extra_days * weekend.extra_day_price,
      'deposit', kit_row.deposit
    );
    rent := rent + (kit ->> 'price')::bigint;
    deposits := deposits + kit_row.deposit;
  end if;

  -- Plus months as a gift: the plan's monthly price for each month. They
  -- don't count towards free delivery, discounts, the giveaway cap or
  -- cashback.
  if cart_plus.user_id is not null then
    select * into gift_plan from public.plans p
    where p.id = cart_plus.plan_id and p.active and p.audience = 'plus'
      and p.billing_interval = 'month' and p.student_of is null;
    if gift_plan.id is null then
      raise exception 'Item not available' using errcode = 'no_data_found';
    end if;
    plus := gift_plan.amount * cart_plus.months;
    plus_gift := jsonb_build_object(
      'plan_id', gift_plan.id,
      'name', gift_plan.name,
      'name_ar', gift_plan.name_ar,
      'months', cart_plus.months,
      'monthly', gift_plan.amount,
      'price', plus
    );
  end if;
  -- Program installments: an accepted application's next one, or
  -- everything left. Nothing is delivered; they don't count towards free
  -- delivery or discounts, and earn cashback like the rest.
  for cart_program in
    select c.application_id, c.pay_in_full, a.status, o.title_ar, o.title_en
    from public.cart_programs c
    join public.program_applications a on a.id = c.application_id
    join public.opportunities o on o.id = a.program_id
    where c.user_id = member and a.user_id = member
    order by c.created_at, c.application_id
  loop
    if cart_program.status not in ('accepted', 'confirmed') then
      raise exception 'This application can''t be paid now' using errcode = 'check_violation';
    end if;
    select coalesce(sum(d.amount), 0), array_agg(d.installment order by d.installment)
    into program_amount, program_positions
    from private.program_due(cart_program.application_id, cart_program.pay_in_full) d;
    if program_amount = 0 then
      raise exception 'Nothing to pay on this application' using errcode = 'check_violation';
    end if;
    programs := programs + program_amount;
    program_lines := program_lines || jsonb_build_object(
      'application_id', cart_program.application_id,
      'positions', to_jsonb(program_positions),
      'installments', (
        select count(*) from public.program_payments p
        where p.application_id = cart_program.application_id
      ),
      'amount', program_amount,
      'title_ar', cart_program.title_ar,
      'title_en', cart_program.title_en
    );
  end loop;

  subtotal := goods + rent + deposits + plus + programs;

  if cash and settings.cash_limit is not null and subtotal > settings.cash_limit then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  plan := private.member_plan(member);

  -- Delivery costs the zone's fee, free from the zone's threshold for
  -- everyone or on any order with the member's plan.
  fee := coalesce(zone.fee, 0);
  -- Deposits come back, so they don't count towards the threshold.
  if zone.free_from is not null and goods + rent >= zone.free_from then
    free_reason := 'threshold';
  elsif zone.plus_free_delivery and coalesce(plan.free_delivery, false) then
    free_reason := 'plan';
  end if;
  if free_reason is not null then
    waived := fee;
    fee := 0;
  end if;
  if not ships then
    fee := 0;
    waived := 0;
    free_reason := null;
  end if;
  -- A kit on its own is delivered free, as before.
  if kit is not null and goods = 0 and jsonb_array_length(rentals) = 0 then
    fee := 0;
    waived := 0;
    free_reason := 'kit';
  end if;

  -- A friend's invite takes 10% off the first order (at most 15,000 IQD).
  select * into invite from public.referrals r
  where r.invitee_id = member and r.status = 'pending';
  -- Once: not after a paid order, nor while another invite order is open.
  if invite.invitee_id is not null and not exists (
    select 1 from public.orders o
    where o.user_id = member
      and (
        o.status not in ('cancelled', 'pending')
        or (o.discount_source = 'invite' and o.status <> 'cancelled')
      )
  ) then
    promo := least(floor(goods * 0.10)::bigint, 15000);
    source := 'invite';
  end if;

  -- A coupon applied to the cart (The IDEA pays it) replaces the invite
  -- discount when it takes more off; the cap below still holds.
  select c.* into coupon from public.cart_coupons cc
  join public.coupons c on c.id = cc.coupon_id
  where cc.user_id = member;
  -- Discounts are on what's bought; rentals keep their rates.
  if coupon.id is not null and private.coupon_problem(coupon.id, member, goods) is null then
    coupon_off := case coupon.kind
      when 'percent' then floor(goods * coupon.amount / 100)::bigint
      else coupon.amount
    end;
    coupon_off := least(coupon_off, coalesce(coupon.max_discount, coupon_off), goods);
    if coupon_off > promo then
      promo := coupon_off;
      source := 'coupon';
    end if;
  end if;

  -- The giveaway cap: delivery waived comes first, then the discount,
  -- then the cashback.
  cap := floor((goods + rent + programs) * settings.max_giveaway_rate / 100)::bigint;
  promo := least(promo, greatest(0, cap - waived));
  if promo = 0 then
    source := null;
  end if;

  -- Bulbs (1 IQD each) pay up to the whole order, from what's usable now,
  -- in steps of 250 and at least 1,000.
  if coalesce(use_bulbs, 0) > 0 then
    select b.available into usable from private.bulb_balance(member) b;
    if use_bulbs > usable then
      raise exception 'Not enough Bulbs' using errcode = 'check_violation';
    end if;
    -- Bulbs pay for what's bought, rented and program installments, never
    -- a deposit, and up to half of one month of gifted Plus.
    bulbs := (least(
      use_bulbs,
      goods + rent + programs + fee - promo + least(plus, coalesce(gift_plan.amount, 0) / 2)
    ) / 250 * 250)::integer;
    if bulbs < 1000 then
      bulbs := 0;
    end if;
  end if;

  total := subtotal + fee - promo - bulbs;
  max_bulbs := greatest(0, cap - waived - promo)::integer;
  -- Cashback on what's paid in money, at the member's rate, rounded.
  earn := least(
    round(
      (goods + rent + programs)
      * case when subtotal + fee > 0 then total::numeric / (subtotal + fee) else 0 end
      * private.bulb_rate(member) / 100
    )::integer,
    max_bulbs
  );

  return jsonb_build_object(
    'zone_id', zone.id,
    'zone_governorate', zone.governorate,
    'zone_name_en', zone.name_en,
    'lines', lines,
    'rentals', rentals,
    'kit', kit,
    'plus_gift', plus_gift,
    'plus', plus,
    'programs', program_lines,
    'program_total', programs,
    'ships', ships,
    'goods', goods,
    'rent', rent,
    'deposits', deposits,
    'subtotal', subtotal,
    'shipping_fee', fee,
    'delivery_waived', waived,
    'free_delivery', free_reason,
    'free_from', zone.free_from,
    'discount', promo,
    'discount_source', source,
    'coupon_code', case when coupon.id is not null then coupon.code end,
    'bulbs_used', bulbs,
    'bulbs_discount', bulbs,
    'total', total,
    'max_bulbs', max_bulbs,
    'bulbs_to_earn', earn,
    'bulb_rate', private.bulb_rate(member)
  );
end;
$$;

create or replace function private.create_order(
  shipping jsonb,
  fulfilment public.order_fulfilment default 'delivery',
  payment_method public.order_payment_method default 'online',
  delivery_zone uuid default null,
  use_bulbs integer default 0,
  gift boolean default false
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  cash boolean := create_order.payment_method = 'cash_on_delivery';
  wanted text := lower(trim(coalesce(shipping ->> 'governorate', '')));
  quote jsonb;
  created public.orders;
  minor boolean;
  guardian uuid;
  rental jsonb;
  copy public.stock_items;
  made public.rentals;
  kit jsonb;
  kit_unit uuid;
  booking public.kit_bookings;
  plus_gift jsonb;
  months integer;
  program jsonb;
  only_programs boolean;
  ships boolean := exists (select 1 from public.cart_items c where c.user_id = (select auth.uid()))
    or exists (select 1 from public.cart_kits k where k.user_id = (select auth.uid()));
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  -- Ages: a date of birth is needed to buy; 13–17-year-olds buy with
  -- their guardian's approval, and never PEGI 18 items.
  if (select p.birthday from public.profiles p where p.id = caller) is null then
    raise exception 'Add your date of birth first' using errcode = 'check_violation';
  end if;
  minor := private.is_minor(caller);
  if minor then
    guardian := private.active_guardian(caller);
    if guardian is null then
      raise exception 'A guardian must approve your orders' using errcode = 'check_violation';
    end if;
    if exists (
      select 1 from public.cart_items c
      join public.products p on p.id = c.product_id
      where c.user_id = caller and p.age_rating = 18
    ) then
      raise exception 'Not available under 18' using errcode = 'check_violation';
    end if;
  end if;

  if create_order.fulfilment is distinct from 'delivery' then
    raise exception 'Every order is delivered' using errcode = 'check_violation';
  end if;

  -- A gift is paid now and its address comes later, from the recipient
  -- (claim_gift): the buyer only picks the area it goes to.
  if gift then
    if create_order.payment_method is distinct from 'online' then
      raise exception 'Gifts are paid online or with Bulbs' using errcode = 'check_violation';
    end if;
    -- Plus months on their own go to the recipient's Pass, not an area.
    if delivery_zone is null and ships then
      raise exception 'Choose where the gift goes' using errcode = 'check_violation';
    end if;
  elsif not ships and create_order.payment_method is not null then
    -- Nothing is delivered (program installments): no address needed.
    null;
  elsif create_order.payment_method is null
    or jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or char_length(shipping::text) > 4000
    or coalesce(trim(shipping ->> 'address'), '') = ''
    -- Without a chosen zone, the governorate finds it.
    or (wanted = '' and delivery_zone is null)
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;

  -- Lock the catalog rows so concurrent orders see consistent stock, and
  -- the member's Bulbs so concurrent checkouts wait for each other.
  perform 1 from public.products p
  where p.id in (select c.product_id from public.cart_items c where c.user_id = caller)
  order by p.id
  for update;
  if coalesce(use_bulbs, 0) > 0 then
    perform pg_advisory_xact_lock(hashtextextended('bulbs:' || caller::text, 0));
  end if;

  quote := private.price_checkout(
    caller, wanted, create_order.fulfilment, create_order.payment_method, delivery_zone, use_bulbs
  );
  -- A rental comes back to whoever rented it, so it isn't a gift (yet).
  if gift and jsonb_array_length(quote -> 'rentals') > 0 then
    raise exception 'Rentals can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  kit := nullif(quote -> 'kit', 'null'::jsonb);
  -- Starting Plus for yourself is the plan page's own checkout.
  plus_gift := nullif(quote -> 'plus_gift', 'null'::jsonb);
  if plus_gift is not null and not gift then
    raise exception 'Plus months are sent as a gift' using errcode = 'check_violation';
  end if;
  -- Program installments are paid by the applicant, never as a gift; a
  -- minor's were approved with the application.
  if jsonb_array_length(quote -> 'programs') > 0 and gift then
    raise exception 'Programs can''t be sent as gifts' using errcode = 'check_violation';
  end if;
  only_programs := jsonb_array_length(quote -> 'programs') > 0
    and jsonb_array_length(quote -> 'lines') = 0
    and jsonb_array_length(quote -> 'rentals') = 0
    and kit is null and plus_gift is null;
  if kit is not null then
    if gift then
      raise exception 'Kits can''t be sent as gifts' using errcode = 'check_violation';
    end if;
    if not private.is_adult(caller) then
      raise exception 'You need to be 18 or over' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, discount, discount_source,
    bulbs_used, bulbs_discount, total, max_bulbs, shipping_address, fulfilment,
    payment_method, delivery_zone_id, guardian_status, is_gift
  )
  values (
    caller,
    case when cash and not minor then 'confirmed' else 'pending' end::public.order_status,
    (quote ->> 'subtotal')::bigint,
    (quote ->> 'shipping_fee')::bigint,
    (quote ->> 'discount')::bigint,
    quote ->> 'discount_source',
    (quote ->> 'bulbs_used')::integer,
    (quote ->> 'bulbs_discount')::bigint,
    (quote ->> 'total')::bigint,
    (quote ->> 'max_bulbs')::integer,
    case when gift then jsonb_strip_nulls(jsonb_build_object(
      'governorate', coalesce(quote ->> 'zone_governorate', quote ->> 'zone_name_en')
    )) when not ships then jsonb_strip_nulls(jsonb_build_object(
      'full_name', nullif(left(trim(coalesce(shipping ->> 'full_name', '')), 120), ''),
      'phone', case when shipping ->> 'phone' ~ '^\+[1-9][0-9]{7,14}$' then shipping ->> 'phone' end
    )) else jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      -- A zone that isn't a whole governorate is named instead.
      'governorate', coalesce(
        quote ->> 'zone_governorate',
        nullif(left(trim(shipping ->> 'governorate'), 60), ''),
        quote ->> 'zone_name_en'
      ),
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500),
      'landmark', left(trim(coalesce(shipping ->> 'landmark', '')), 200)
    ) || case
      when private.map_pin(shipping -> 'location') is null then '{}'::jsonb
      else jsonb_build_object('location', private.map_pin(shipping -> 'location'))
    end end,
    create_order.fulfilment,
    create_order.payment_method,
    (quote ->> 'zone_id')::uuid,
    case when minor and only_programs then 'approved' when minor then 'pending' end,
    gift
  )
  returning * into created;

  insert into public.order_items (
    order_id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en,
    attributes, unit_price, quantity
  )
  select
    created.id, l.product_id, l.variant_id, l.seller_id, l.seller_name, l.condition,
    l.name_ar, l.name_en, l.attributes, l.unit_price, l.quantity
  from jsonb_to_recordset(quote -> 'lines') as l (
    product_id uuid,
    variant_id uuid,
    seller_id uuid,
    seller_name text,
    condition public.product_condition,
    quantity integer,
    unit_price bigint,
    name_ar text,
    name_en text,
    attributes jsonb
  );

  -- Rent lines: a copy held for each, its rental and its rent and
  -- deposit lines (as create_rentals_order).
  for rental in select * from jsonb_array_elements(quote -> 'rentals') loop
    select s.* into copy from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = (rental ->> 'product_id')::uuid and v.active
      and (rental ->> 'variant_id' is null or s.variant_id = (rental ->> 'variant_id')::uuid)
      and s.purpose = 'rental' and s.status = 'available'
    order by s.created_at
    limit 1
    for update of s skip locked;
    if copy.id is null then
      raise exception 'All copies are rented out' using errcode = 'check_violation';
    end if;

    insert into public.rentals (
      user_id, product_id, variant_id, name_ar, name_en, kind, order_id, days, late_fee, deposit
    )
    values (
      caller, (rental ->> 'product_id')::uuid, copy.variant_id, rental ->> 'name_ar',
      rental ->> 'name_en', 'single', created.id, (rental ->> 'days')::integer,
      (rental ->> 'late_fee')::bigint, (rental ->> 'deposit')::bigint
    )
    returning * into made;

    update public.stock_items set status = 'rented', rental_id = made.id where id = copy.id;

    insert into public.order_items (
      order_id, product_id, variant_id, condition, name_ar, name_en, unit_price, quantity, kind, rental_id
    )
    values
      (created.id, made.product_id, copy.variant_id, copy.condition,
        made.name_ar || ' (إيجار ' || made.days || case when made.days between 3 and 10 then ' أيام)' else ' يومًا)' end,
        made.name_en || ' (rent, ' || made.days || ' days)',
        (rental ->> 'price')::bigint, 1, 'rental', made.id),
      (created.id, made.product_id, copy.variant_id, copy.condition,
        'تأمين قابل للاسترداد: ' || made.name_ar, 'Refundable deposit: ' || made.name_en,
        made.deposit, 1, 'deposit', made.id);
  end loop;

  -- The kit: a free unit for the weekend and its extra days, the games
  -- chosen, and its price and deposit lines (as book_kit).
  if kit is not null then
    kit_unit := private.free_kit_unit(
      kit ->> 'kit_type',
      (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer
    );
    if kit_unit is null then
      raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
    end if;
    insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
    values (
      caller, kit ->> 'kit_type', kit_unit, (kit ->> 'starts_on')::date,
      (kit ->> 'starts_on')::date + 2 + (kit ->> 'extra_days')::integer,
      (kit ->> 'extra_days')::integer, created.id, (kit ->> 'deposit')::bigint
    )
    returning * into booking;
    insert into public.kit_booking_games (booking_id, product_id)
    select booking.id, g::uuid from jsonb_array_elements_text(kit -> 'games') g;

    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (kit ->> 'name_ar') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'name_en') || ' · ' || (kit ->> 'starts_on'),
      (kit ->> 'price')::bigint, 1, 'kit'
    );
    if (kit ->> 'deposit')::bigint > 0 then
      insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
      values (
        created.id, 'تأمين قابل للاسترداد: ' || (kit ->> 'name_ar'),
        'Refundable deposit: ' || (kit ->> 'name_en'), (kit ->> 'deposit')::bigint, 1, 'deposit'
      );
    end if;
  end if;

  -- Plus months: one line, and the months the recipient claims.
  if plus_gift is not null then
    months := (plus_gift ->> 'months')::integer;
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      coalesce(plus_gift ->> 'name_ar', plus_gift ->> 'name') || ' · ' || case
        when months = 1 then 'شهر واحد'
        when months = 2 then 'شهران'
        when months between 3 and 10 then months || ' أشهر'
        else months || ' شهرًا'
      end,
      (plus_gift ->> 'name') || ' · ' || months
        || case when months = 1 then ' month' else ' months' end,
      (plus_gift ->> 'price')::bigint, 1, 'plus'
    );
    insert into public.plus_gift_months (order_id, plan_id, months)
    values (created.id, plus_gift ->> 'plan_id', months);
  end if;

  -- Program installments: one line each, and the installments it pays.
  for program in select * from jsonb_array_elements(quote -> 'programs') loop
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (
      created.id,
      (program ->> 'title_ar') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · الدفعة ' || (program -> 'positions' ->> 0) || ' من ' || (program ->> 'installments')
        else
          ' · الدفعات ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' من ' || (program ->> 'installments')
      end,
      (program ->> 'title_en') || case
        when (program ->> 'installments')::integer = 1 then ''
        when jsonb_array_length(program -> 'positions') = 1 then
          ' · installment ' || (program -> 'positions' ->> 0) || ' of ' || (program ->> 'installments')
        else
          ' · installments ' || (program -> 'positions' ->> 0) || '–' || (program -> 'positions' ->> -1)
            || ' of ' || (program ->> 'installments')
      end,
      (program ->> 'amount')::bigint, 1, 'program'
    );
    update public.program_payments p set order_id = created.id
    where p.application_id = (program ->> 'application_id')::uuid
      and p.position in (
        select x::smallint from jsonb_array_elements_text(program -> 'positions') x
      );
  end loop;

  delete from public.cart_items where user_id = caller;
  delete from public.cart_programs where user_id = caller;
  delete from public.cart_kits where user_id = caller;
  delete from public.cart_plus_gifts where user_id = caller;

  if created.bulbs_used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, order_id)
    values (caller, -created.bulbs_used, 'redemption', created.id);
  end if;

  -- A minor's order waits for the guardian (decide_guardian_order),
  -- unless it only pays programs the guardian already approved.
  if minor and not only_programs then
    perform private.notify(
      guardian,
      'order',
      'guardian_order_request',
      jsonb_build_object('number', created.number, 'name', private.first_name(caller)),
      '/pass/settings#guardian'
    );
    return created;
  end if;

  -- Paid in full with Bulbs: nothing to pay online, so it's paid now.
  if not cash and created.total = 0 then
    perform public.complete_order_payment(created.id);
    select * into created from public.orders o where o.id = created.id;
  end if;

  -- A cash order is confirmed now: its copies are set aside and the
  -- customer is told (online orders wait for the payment webhook).
  if cash then
    perform private.take_order_stock(created.id);
    perform private.notify(
      caller,
      'order',
      'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;

  -- The coming weekend: hold the kit's games now.
  if kit is not null then
    perform private.hold_kit_games();
  end if;
  return created;
end;
$$;

-- ── Grants ─────────────────────────────────────────────────────────────────

-- The plan checks run in the programs table's constraints, as the editor.
revoke all on function private.valid_installments(jsonb) from public, anon;
revoke all on function private.valid_refund_schedule(jsonb) from public, anon;
grant execute on function private.valid_installments(jsonb) to authenticated;
grant execute on function private.valid_refund_schedule(jsonb) to authenticated;
revoke all on function private.check_program() from public, anon, authenticated;
revoke all on function private.program_files_ok(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function private.program_applicant(uuid) from public, anon, authenticated;
revoke all on function private.program_paid(uuid) from public, anon, authenticated;
revoke all on function private.program_refund_rate(uuid) from public, anon, authenticated;
revoke all on function private.close_program_application(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function private.program_due(uuid, boolean) from public, anon, authenticated;
revoke all on function private.on_order_paid_programs() from public, anon, authenticated;
revoke all on function private.apply_to_program(uuid, text, text, text, text[]) from public, anon;
revoke all on function public.apply_to_program(uuid, text, text, text, text[]) from public, anon;
grant execute on function private.apply_to_program(uuid, text, text, text, text[]) to authenticated;
grant execute on function public.apply_to_program(uuid, text, text, text, text[]) to authenticated;
revoke all on function private.set_program_documents(uuid, text[]) from public, anon;
revoke all on function public.set_program_documents(uuid, text[]) from public, anon;
grant execute on function private.set_program_documents(uuid, text[]) to authenticated;
grant execute on function public.set_program_documents(uuid, text[]) to authenticated;
revoke all on function private.decide_program_guardian(uuid, boolean) from public, anon;
revoke all on function public.decide_program_guardian(uuid, boolean) from public, anon;
grant execute on function private.decide_program_guardian(uuid, boolean) to authenticated;
grant execute on function public.decide_program_guardian(uuid, boolean) to authenticated;
revoke all on function private.review_program_application(uuid, text, text) from public, anon;
revoke all on function public.review_program_application(uuid, text, text) from public, anon;
grant execute on function private.review_program_application(uuid, text, text) to authenticated;
grant execute on function public.review_program_application(uuid, text, text) to authenticated;
revoke all on function private.withdraw_program_application(uuid) from public, anon;
revoke all on function public.withdraw_program_application(uuid) from public, anon;
grant execute on function private.withdraw_program_application(uuid) to authenticated;
grant execute on function public.withdraw_program_application(uuid) to authenticated;
revoke all on function private.end_program_application(uuid, text) from public, anon;
revoke all on function public.end_program_application(uuid, text) from public, anon;
grant execute on function private.end_program_application(uuid, text) to authenticated;
grant execute on function public.end_program_application(uuid, text) to authenticated;
revoke all on function private.mark_program_refunded(uuid, text) from public, anon;
revoke all on function public.mark_program_refunded(uuid, text) from public, anon;
grant execute on function private.mark_program_refunded(uuid, text) to authenticated;
grant execute on function public.mark_program_refunded(uuid, text) to authenticated;
revoke all on function public.sweep_program_documents() from public, anon, authenticated;
grant execute on function public.sweep_program_documents() to service_role;
