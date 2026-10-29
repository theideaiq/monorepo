-- Verification, part 1 (step 13; brief section 21): identity checks and the
-- educator badge.
--
-- * Identity: photos of both sides of the National Card and a selfie, in the
--   private `verifications` bucket under "<user id>/…", reviewed by support.
--   Only the result, the name on the card and the date are kept
--   (`identity_verifications`); the review clears the paths and Staff deletes
--   the files. Needed later by people who sell, receive payouts, bid above a
--   set amount or rent without a deposit (`private.identity_verified`).
-- * Educator badge: a staff email at a university (an emailed 8-digit code,
--   as for students) or a staff card / employer letter reviewed by support.
--   Educators get the same perks as students (student prices, Plus at 20%
--   off, partner perks for students), so `private.is_student` now counts
--   them too; the Pass card tells the two apart, and partner student checks
--   (which read `student_badges`) stay students only.

-- ── Results ────────────────────────────────────────────────────────────────

create table public.identity_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  legal_name text not null check (char_length(trim(legal_name)) between 1 and 120),
  verified_at timestamptz not null default now(),
  verified_by uuid references auth.users (id) on delete set null
);

comment on table public.identity_verifications is
  'People whose National Card and selfie were checked: the name on the card and the date. The photos are deleted after review.';

create index identity_verifications_verified_by_idx on public.identity_verifications (verified_by);

alter table public.identity_verifications enable row level security;

create policy "Members see their identity check; support sees all" on public.identity_verifications
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.identity_verifications to authenticated;

create table public.educator_badges (
  user_id uuid primary key references auth.users (id) on delete cascade,
  institution text not null check (char_length(trim(institution)) between 1 and 160),
  university_id text references public.universities (id),
  valid_until date not null,
  method text not null check (method in ('email', 'document')),
  -- The staff email that verified it (hashed): one address, one Pass.
  email_hash text,
  verified_at timestamptz not null default now()
);

comment on table public.educator_badges is
  'Verified educators: where they teach and until when. Same perks as students.';

create unique index educator_badges_email_idx on public.educator_badges (email_hash) where email_hash is not null;
create index educator_badges_university_idx on public.educator_badges (university_id);

alter table public.educator_badges enable row level security;

create policy "Educators see their badge; support sees all" on public.educator_badges
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.educator_badges to authenticated;

-- ── Requests ───────────────────────────────────────────────────────────────

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('identity', 'educator')),
  method text not null check (method in ('documents', 'email')),
  -- Educators: where they teach (and the university, for a staff email).
  institution text check (char_length(trim(institution)) between 1 and 160),
  university_id text references public.universities (id),
  -- Email: the address and the emailed code (hashed), for 15 minutes.
  email text check (char_length(email) <= 254),
  code_hash text,
  code_expires_at timestamptz,
  attempts integer not null default 0,
  -- Documents: paths in the private verifications bucket until review.
  files text[] not null default '{}' check (cardinality(files) <= 3),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  reject_reason text check (char_length(reject_reason) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint verification_requests_kind_method_check check (
    (kind = 'identity' and method = 'documents')
    or (kind = 'educator' and institution is not null)
  )
);

comment on table public.verification_requests is
  'Identity and educator checks: documents waiting for review in Staff → Inbox, or an emailed code.';

create index verification_requests_user_idx on public.verification_requests (user_id, kind, created_at desc);
create index verification_requests_pending_idx on public.verification_requests (created_at)
  where status = 'pending' and method = 'documents';
create index verification_requests_university_idx on public.verification_requests (university_id);
create index verification_requests_reviewed_by_idx on public.verification_requests (reviewed_by);

alter table public.verification_requests enable row level security;

create policy "Members see their checks; support sees all" on public.verification_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

-- The code's hash never leaves the database.
grant select (
  id, user_id, kind, method, institution, university_id, email, files, status,
  reject_reason, reviewed_at, created_at
) on public.verification_requests to authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────────

create function private.identity_verified(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.identity_verifications v where v.user_id = member);
$$;

create function private.is_educator(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.educator_badges b
    where b.user_id = member and b.valid_until >= private.baghdad_today()
  );
$$;

-- A verified student, for what only students have (the badge on the card).
create function private.is_enrolled_student(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.student_badges b
    where b.user_id = member and b.valid_until >= private.baghdad_today()
  );
$$;

-- Student perks: verified students and educators.
create or replace function private.is_student(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_enrolled_student(member) or private.is_educator(member);
$$;

-- The Pass card names the badge: student or educator.
create or replace function private.pass_card(member uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'name', coalesce(nullif(trim(p.full_name), ''), private.first_name(member)),
    'member_number', p.member_number,
    'since', p.created_at::date,
    'plan_en', (private.member_plan(member)).name,
    'plan_ar', (private.member_plan(member)).name_ar,
    'student', private.is_enrolled_student(member),
    'educator', private.is_educator(member)
  )
  from public.profiles p where p.id = member;
$$;

-- Uploaded paths must be the member's own: "<user id>/…".
create function private.own_files(member uuid, paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(bool_and(split_part(f, '/', 1) = member::text and char_length(f) <= 500), false)
  from unnest(paths) f;
$$;

-- ── Identity ───────────────────────────────────────────────────────────────

-- The member uploaded the front and back of their National Card and a selfie.
create function private.request_identity_check(files text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  created uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if private.identity_verified(caller) then
    raise exception 'Your identity is already verified' using errcode = 'check_violation';
  end if;
  if cardinality(files) <> 3 or not private.own_files(caller, files) then
    raise exception 'Add both sides of your National Card and a selfie' using errcode = 'check_violation';
  end if;

  update public.verification_requests set status = 'cancelled'
  where user_id = caller and kind = 'identity' and status = 'pending';

  insert into public.verification_requests (user_id, kind, method, files)
  values (caller, 'identity', 'documents', files)
  returning id into created;
  return created;
end;
$$;

-- Support approves (with the name on the card) or rejects. Returns the
-- photos' paths for Staff to delete; the request keeps none.
create function private.review_identity_check(
  target uuid,
  approve boolean,
  legal_name text default null,
  reason text default null
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.verification_requests;
  name text := nullif(trim(coalesce(legal_name, '')), '');
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into request from public.verification_requests r
  where r.id = target and r.kind = 'identity' and r.status = 'pending'
  for update;
  if request.id is null then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if approve and name is null then
    raise exception 'Enter the name on the card' using errcode = 'check_violation';
  end if;

  update public.verification_requests set
    status = case when approve then 'approved' else 'rejected' end,
    reject_reason = case when approve then null else left(nullif(trim(reason), ''), 500) end,
    files = '{}',
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = request.id;

  if approve then
    insert into public.identity_verifications (user_id, legal_name, verified_by)
    values (request.user_id, left(name, 120), (select auth.uid()))
    on conflict (user_id) do update set
      legal_name = excluded.legal_name, verified_at = now(), verified_by = excluded.verified_by;
  end if;
  perform private.notify(
    request.user_id, 'system',
    case when approve then 'identity_verified' else 'identity_rejected' end,
    '{}'::jsonb,
    '/pass/settings#verification'
  );
  return request.files;
end;
$$;

-- ── Educators ──────────────────────────────────────────────────────────────

-- A staff card or employer letter (one or two files) for review.
create function private.request_educator_check(institution text, files text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  place text := nullif(trim(coalesce(institution, '')), '');
  created uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if place is null or char_length(place) > 160 then
    raise exception 'Enter where you teach' using errcode = 'check_violation';
  end if;
  if cardinality(files) not between 1 and 2 or not private.own_files(caller, files) then
    raise exception 'Add your staff card or a letter from your employer' using errcode = 'check_violation';
  end if;

  update public.verification_requests set status = 'cancelled', code_hash = null, email = null
  where user_id = caller and kind = 'educator' and status = 'pending';

  insert into public.verification_requests (user_id, kind, method, institution, files)
  values (caller, 'educator', 'documents', place, files)
  returning id into created;
  return created;
end;
$$;

-- A staff email at a university: the API emails the code this returns
-- (service role only, like student codes).
create function public.issue_educator_code(member uuid, university text, address text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  clean text := lower(trim(coalesce(address, '')));
  place text;
begin
  if member is null or not exists (select 1 from public.profiles p where p.id = member and p.banned_at is null) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or not private.email_university(university, clean) then
    raise exception 'Use your university email' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.educator_badges b
    where b.email_hash = private.hash_text(clean) and b.user_id <> member
  ) then
    raise exception 'This email already verified another Pass' using errcode = 'check_violation';
  end if;
  if (
    select count(*) from public.verification_requests r
    where r.user_id = member and r.kind = 'educator' and r.method = 'email'
      and r.created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Too many codes today' using errcode = 'check_violation';
  end if;
  select u.name_en into place from public.universities u where u.id = university;

  update public.verification_requests set status = 'cancelled', code_hash = null, email = null
  where user_id = member and kind = 'educator' and status = 'pending';

  insert into public.verification_requests (
    user_id, kind, method, institution, university_id, email, code_hash, code_expires_at
  ) values (
    member, 'educator', 'email', coalesce(place, university), university, clean,
    private.hash_text(code), now() + interval '15 minutes'
  );
  return code;
end;
$$;

create function private.confirm_educator_email(code text)
returns public.educator_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  request public.verification_requests;
  saved public.educator_badges;
begin
  select * into request from public.verification_requests r
  where r.user_id = caller and r.kind = 'educator' and r.method = 'email' and r.status = 'pending'
  order by r.created_at desc
  limit 1
  for update;
  if request.id is null or request.code_expires_at < now() then
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.attempts >= 5 then
    update public.verification_requests set status = 'expired', code_hash = null, email = null
    where id = request.id;
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.code_hash is distinct from private.hash_text(coalesce(code, '')) then
    update public.verification_requests set attempts = attempts + 1 where id = request.id;
    raise exception 'Wrong code' using errcode = 'check_violation';
  end if;

  update public.verification_requests
  set status = 'approved', code_hash = null, email = null, reviewed_at = now()
  where id = request.id;
  insert into public.educator_badges (user_id, institution, university_id, valid_until, method, email_hash)
  values (
    caller, request.institution, request.university_id,
    private.academic_year_end(private.baghdad_today()), 'email', private.hash_text(request.email)
  )
  on conflict (user_id) do update set
    institution = excluded.institution, university_id = excluded.university_id,
    valid_until = excluded.valid_until, method = excluded.method,
    email_hash = excluded.email_hash, verified_at = now()
  returning * into saved;
  return saved;
end;
$$;

-- Support approves a staff card or letter (until a date within the
-- academic year, the end of it by default) or rejects it. Returns the
-- files' paths for Staff to delete.
create function private.review_educator_check(
  target uuid,
  approve boolean,
  until date default null,
  reason text default null
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.verification_requests;
  ends date := coalesce(until, private.academic_year_end(private.baghdad_today()));
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into request from public.verification_requests r
  where r.id = target and r.kind = 'educator' and r.method = 'documents' and r.status = 'pending'
  for update;
  if request.id is null then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if approve and (ends < private.baghdad_today() or ends > private.academic_year_end(private.baghdad_today())) then
    raise exception 'Invalid date' using errcode = 'check_violation';
  end if;

  update public.verification_requests set
    status = case when approve then 'approved' else 'rejected' end,
    reject_reason = case when approve then null else left(nullif(trim(reason), ''), 500) end,
    files = '{}',
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = request.id;

  if approve then
    insert into public.educator_badges (user_id, institution, valid_until, method)
    values (request.user_id, request.institution, ends, 'document')
    on conflict (user_id) do update set
      institution = excluded.institution, university_id = null, valid_until = excluded.valid_until,
      method = excluded.method, email_hash = null, verified_at = now();
  end if;
  perform private.notify(
    request.user_id, 'system',
    case when approve then 'educator_verified' else 'educator_rejected' end,
    jsonb_build_object('until', to_char(ends, 'YYYY-MM-DD')),
    '/pass/settings#verification'
  );
  return request.files;
end;
$$;

-- ── What the member sees ───────────────────────────────────────────────────

-- The Verification section of Pass → Settings: each check's state, the
-- latest rejection reason, and nothing from the documents.
create function private.my_verifications()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'identity', jsonb_build_object(
      'verified', iv.user_id is not null,
      'name', iv.legal_name,
      'verified_at', iv.verified_at,
      'pending', exists (
        select 1 from public.verification_requests r
        where r.user_id = me.id and r.kind = 'identity' and r.status = 'pending'
      ),
      'rejected_reason', (
        select r.reject_reason from public.verification_requests r
        where r.user_id = me.id and r.kind = 'identity' and r.status in ('approved', 'rejected')
        order by r.created_at desc limit 1
      )
    ),
    'educator', jsonb_build_object(
      'verified', coalesce(eb.valid_until >= private.baghdad_today(), false),
      'institution', eb.institution,
      'valid_until', eb.valid_until,
      'pending', (
        select r.method from public.verification_requests r
        where r.user_id = me.id and r.kind = 'educator' and r.status = 'pending'
          and (r.method = 'documents' or r.code_expires_at > now())
        order by r.created_at desc limit 1
      ),
      'rejected_reason', (
        select r.reject_reason from public.verification_requests r
        where r.user_id = me.id and r.kind = 'educator' and r.method = 'documents'
          and r.status in ('approved', 'rejected')
        order by r.created_at desc limit 1
      )
    )
  )
  from (select (select auth.uid()) as id) me
  left join public.identity_verifications iv on iv.user_id = me.id
  left join public.educator_badges eb on eb.user_id = me.id
  where me.id is not null;
$$;

-- ── Public wrappers ────────────────────────────────────────────────────────

create function public.request_identity_check(files text[])
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.request_identity_check(files) $$;

create function public.review_identity_check(
  target uuid, approve boolean, legal_name text default null, reason text default null
)
returns text[]
language sql
security invoker
set search_path = ''
as $$ select private.review_identity_check(target, approve, legal_name, reason) $$;

create function public.request_educator_check(institution text, files text[])
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.request_educator_check(institution, files) $$;

create function public.confirm_educator_email(code text)
returns public.educator_badges
language sql
security invoker
set search_path = ''
as $$ select * from private.confirm_educator_email(code) $$;

create function public.review_educator_check(
  target uuid, approve boolean, until date default null, reason text default null
)
returns text[]
language sql
security invoker
set search_path = ''
as $$ select private.review_educator_check(target, approve, until, reason) $$;

create function public.my_verifications()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.my_verifications() $$;

-- ── Documents ──────────────────────────────────────────────────────────────

-- Identity and educator documents: private, "<user id>/…"; the member
-- uploads, support reads and deletes after review.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verifications', 'verifications', false, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

create policy "Members upload verification documents"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'verifications'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members and support read verification documents"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'verifications'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{support}'))
    )
  );

create policy "Support deletes reviewed verification documents"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'verifications'
    and (select private.has_staff_role('{support}'))
  );

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.identity_verified(uuid) from public, anon, authenticated;
revoke all on function private.is_educator(uuid) from public, anon, authenticated;
revoke all on function private.is_enrolled_student(uuid) from public, anon, authenticated;
revoke all on function private.own_files(uuid, text[]) from public, anon, authenticated;
revoke all on function private.request_identity_check(text[]) from public, anon;
revoke all on function public.request_identity_check(text[]) from public, anon;
revoke all on function private.review_identity_check(uuid, boolean, text, text) from public, anon;
revoke all on function public.review_identity_check(uuid, boolean, text, text) from public, anon;
revoke all on function private.request_educator_check(text, text[]) from public, anon;
revoke all on function public.request_educator_check(text, text[]) from public, anon;
revoke all on function public.issue_educator_code(uuid, text, text) from public, anon, authenticated;
revoke all on function private.confirm_educator_email(text) from public, anon;
revoke all on function public.confirm_educator_email(text) from public, anon;
revoke all on function private.review_educator_check(uuid, boolean, date, text) from public, anon;
revoke all on function public.review_educator_check(uuid, boolean, date, text) from public, anon;
revoke all on function private.my_verifications() from public, anon;
revoke all on function public.my_verifications() from public, anon;

grant execute on function private.request_identity_check(text[]) to authenticated;
grant execute on function public.request_identity_check(text[]) to authenticated;
grant execute on function private.review_identity_check(uuid, boolean, text, text) to authenticated;
grant execute on function public.review_identity_check(uuid, boolean, text, text) to authenticated;
grant execute on function private.request_educator_check(text, text[]) to authenticated;
grant execute on function public.request_educator_check(text, text[]) to authenticated;
grant execute on function public.issue_educator_code(uuid, text, text) to service_role;
grant execute on function private.confirm_educator_email(text) to authenticated;
grant execute on function public.confirm_educator_email(text) to authenticated;
grant execute on function private.review_educator_check(uuid, boolean, date, text) to authenticated;
grant execute on function public.review_educator_check(uuid, boolean, date, text) to authenticated;
grant execute on function private.my_verifications() to authenticated;
grant execute on function public.my_verifications() to authenticated;
