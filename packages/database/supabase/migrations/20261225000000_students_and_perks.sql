-- Program revision v1, step 5e: student verification and partner perks.
--
-- Students
--   A Pass holder verifies as a student with a university email (a code is
--   emailed by the API, `issue_student_code()`, and typed back,
--   `confirm_student_email()`), or with a photo of their student card that
--   support reviews (`request_student_review()`, `review_student_card()`).
--   Each university lists its email domains (`universities`). The badge
--   (`student_badges`) lasts until the end of the academic year (30 June),
--   then asks again; the card photo is deleted after review and only
--   "student at X until <date>" is kept.
--   A verified student gets the Plus student price (20% off the monthly
--   plans, `plans.student_of`), rents single items and books kits without a
--   deposit, and the student perks.
--
-- Perks
--   Partners are organizations in The IDEA Business. Each perk is open to
--   everyone with a Pass, to students or to Plus members. The partner's team
--   checks a card from the Business dashboard (`partner_check()`) and
--   records a use (`redeem_perk()`), once a day per person and perk
--   (Baghdad time); `perk_stats()` counts them by month.

-- ── Universities ───────────────────────────────────────────────────────────

create table public.universities (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(id) <= 40),
  name_ar text not null check (char_length(name_ar) between 1 and 160),
  name_en text not null check (char_length(name_en) between 1 and 160),
  -- Email domains, lower case; subdomains count (coeng.uobaghdad.edu.iq).
  domains text[] not null default '{}'
    check (cardinality(domains) <= 10 and array_to_string(domains, ',') !~ '[A-Z@ ]'),
  active boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.universities is
  'Universities students verify with, each with its email domains (subdomains count).';

alter table public.universities enable row level security;

create policy "Universities are public" on public.universities
  for select to anon, authenticated using (active or (select private.has_staff_role('{support}')));
create policy "Support adds universities" on public.universities
  for insert to authenticated with check ((select private.has_staff_role('{support}')));
create policy "Support edits universities" on public.universities
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

grant select on public.universities to anon, authenticated;
grant insert, update on public.universities to authenticated;

create trigger set_updated_at before update on public.universities
  for each row execute function private.set_updated_at();

insert into public.universities (id, name_ar, name_en, domains, position) values
  ('auib', 'الجامعة الأمريكية في العراق، بغداد', 'American University of Iraq, Baghdad', '{auib.edu.iq}', 1),
  ('uobaghdad', 'جامعة بغداد', 'University of Baghdad', '{uobaghdad.edu.iq}', 2),
  ('mustansiriyah', 'الجامعة المستنصرية', 'Mustansiriyah University', '{uomustansiriyah.edu.iq}', 3),
  ('uotechnology', 'الجامعة التكنولوجية', 'University of Technology', '{uotechnology.edu.iq}', 4),
  ('nahrain', 'جامعة النهرين', 'Al-Nahrain University', '{nahrainuniv.edu.iq}', 5),
  ('aliraqia', 'الجامعة العراقية', 'Al-Iraqia University', '{aliraqia.edu.iq}', 6),
  ('mansour', 'كلية المنصور الجامعة', 'Al-Mansour University College', '{muc.edu.iq}', 7),
  ('dijlah', 'جامعة دجلة', 'Dijlah University', '{duc.edu.iq}', 8),
  ('rafidain', 'جامعة الرافدين', 'Al-Rafidain University', '{ruc.edu.iq}', 9)
on conflict (id) do nothing;

-- ── Badges and requests ────────────────────────────────────────────────────

create table public.student_badges (
  user_id uuid primary key references auth.users (id) on delete cascade,
  university_id text not null references public.universities (id),
  valid_until date not null,
  method text not null check (method in ('email', 'card')),
  -- The university email that verified it (hashed), so one address
  -- verifies one Pass at a time.
  email_hash text,
  verified_at timestamptz not null default now()
);

comment on table public.student_badges is
  'Verified students: the university and until when (the end of the academic year). Nothing else is kept.';

create unique index student_badges_email_idx on public.student_badges (email_hash) where email_hash is not null;
create index student_badges_university_idx on public.student_badges (university_id);

alter table public.student_badges enable row level security;

create policy "Students see their badge; support sees all" on public.student_badges
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.student_badges to authenticated;

create table public.student_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  university_id text not null references public.universities (id),
  method text not null check (method in ('email', 'card')),
  -- Email: the address and the emailed code (hashed), for 15 minutes.
  email text check (char_length(email) <= 254),
  code_hash text,
  code_expires_at timestamptz,
  attempts integer not null default 0,
  -- Card: the photo in the private student-cards bucket until review.
  card_path text check (char_length(card_path) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  reject_reason text check (char_length(reject_reason) <= 500),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.student_requests is
  'Student verification attempts: an emailed code or a student card photo waiting for review.';

create index student_requests_user_idx on public.student_requests (user_id, created_at desc);
create index student_requests_pending_idx on public.student_requests (created_at) where status = 'pending' and method = 'card';
create index student_requests_university_idx on public.student_requests (university_id);
create index student_requests_reviewed_by_idx on public.student_requests (reviewed_by);

alter table public.student_requests enable row level security;

create policy "Students see their requests; support sees all" on public.student_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

-- The code's hash never leaves the database.
grant select (
  id, user_id, university_id, method, email, card_path, status, reject_reason, reviewed_at, created_at
) on public.student_requests to authenticated;

-- ── Helpers ────────────────────────────────────────────────────────────────

create function private.baghdad_today()
returns date
language sql
stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Baghdad')::date $$;

-- The end of the academic year a day falls in: 30 June.
create function private.academic_year_end(day date)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(extract(year from day)::integer + case when extract(month from day) >= 7 then 1 else 0 end, 6, 30);
$$;

-- Whether the member is a verified student today.
create function private.is_student(member uuid)
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

-- The university whose domains the address belongs to (subdomains count).
create function private.email_university(university text, address text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.universities u, unnest(u.domains) d
    where u.id = university and u.active
      and (split_part(lower(address), '@', 2) = d or split_part(lower(address), '@', 2) like '%.' || d)
  );
$$;

create function private.hash_text(value text)
returns text
language sql
immutable
set search_path = ''
as $$ select encode(extensions.digest(lower(trim(value)), 'sha256'), 'hex') $$;

-- ── Verifying with a university email ──────────────────────────────────────

-- The API asks for a code for the signed-in member and emails it: the
-- address must be the university's, not already verify another Pass, and
-- at most 5 codes a day.
create function private.issue_student_code(member uuid, university text, address text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := lpad((floor(random() * 100000000))::bigint::text, 8, '0');
  clean text := lower(trim(coalesce(address, '')));
begin
  if member is null or not exists (select 1 from public.profiles p where p.id = member and p.banned_at is null) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or not private.email_university(university, clean) then
    raise exception 'Use your university email' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.student_badges b
    where b.email_hash = private.hash_text(clean) and b.user_id <> member
  ) then
    raise exception 'This email already verified another Pass' using errcode = 'check_violation';
  end if;
  if (
    select count(*) from public.student_requests r
    where r.user_id = member and r.method = 'email' and r.created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'Too many codes today' using errcode = 'check_violation';
  end if;

  update public.student_requests set status = 'cancelled', code_hash = null, email = null
  where user_id = member and method = 'email' and status = 'pending';

  insert into public.student_requests (user_id, university_id, method, email, code_hash, code_expires_at)
  values (member, university, 'email', clean, private.hash_text(code), now() + interval '15 minutes');
  return code;
end;
$$;

create function public.issue_student_code(member uuid, university text, address text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.issue_student_code(member, university, address) $$;

-- The badge for `member` at `university` until `until`.
create function private.grant_student_badge(member uuid, university text, until date, how text, address_hash text)
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.student_badges;
begin
  insert into public.student_badges (user_id, university_id, valid_until, method, email_hash, verified_at)
  values (member, university, until, how, address_hash, now())
  on conflict (user_id) do update set
    university_id = excluded.university_id,
    valid_until = excluded.valid_until,
    method = excluded.method,
    email_hash = excluded.email_hash,
    verified_at = excluded.verified_at
  returning * into saved;
  return saved;
end;
$$;

-- The member types the emailed code: 5 tries, 15 minutes.
create function private.confirm_student_email(code text)
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  request public.student_requests;
begin
  select * into request from public.student_requests r
  where r.user_id = caller and r.method = 'email' and r.status = 'pending'
  order by r.created_at desc
  limit 1
  for update;
  if request.id is null or request.code_expires_at < now() then
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.attempts >= 5 then
    update public.student_requests set status = 'expired', code_hash = null, email = null where id = request.id;
    raise exception 'The code has expired' using errcode = 'check_violation';
  end if;
  if request.code_hash is distinct from private.hash_text(coalesce(code, '')) then
    update public.student_requests set attempts = attempts + 1 where id = request.id;
    raise exception 'Wrong code' using errcode = 'check_violation';
  end if;

  update public.student_requests
  set status = 'approved', code_hash = null, email = null, reviewed_at = now()
  where id = request.id;
  return private.grant_student_badge(
    caller, request.university_id, private.academic_year_end(private.baghdad_today()), 'email',
    private.hash_text(request.email)
  );
end;
$$;

create function public.confirm_student_email(code text)
returns public.student_badges
language sql
security invoker
set search_path = ''
as $$ select private.confirm_student_email(code) $$;

-- ── Verifying with a student card ──────────────────────────────────────────

-- The member uploaded a photo of their student card (student-cards bucket,
-- under their id): support reviews it. One review at a time.
create function private.request_student_review(university text, photo text)
returns public.student_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  saved public.student_requests;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.universities u where u.id = university and u.active) then
    raise exception 'Choose your university' using errcode = 'check_violation';
  end if;
  if coalesce(photo, '') not like caller::text || '/%' or photo like '%..%' then
    raise exception 'Invalid photo' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.student_requests r
    where r.user_id = caller and r.method = 'card' and r.status = 'pending'
  ) then
    raise exception 'Your card is already waiting for review' using errcode = 'check_violation';
  end if;

  insert into public.student_requests (user_id, university_id, method, card_path)
  values (caller, university, 'card', photo)
  returning * into saved;
  return saved;
end;
$$;

create function public.request_student_review(university text, photo text)
returns public.student_requests
language sql
security invoker
set search_path = ''
as $$ select private.request_student_review(university, photo) $$;

-- Support approves (until the end of the academic year, or an earlier date
-- the card shows) or rejects a card. Returns the photo's path so the back
-- office deletes it; only the outcome is kept.
create function private.review_student_card(
  target uuid,
  approve boolean,
  until date default null,
  reason text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  request public.student_requests;
  ends date := coalesce(until, private.academic_year_end(private.baghdad_today()));
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into request from public.student_requests r
  where r.id = target and r.method = 'card' and r.status = 'pending'
  for update;
  if request.id is null then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if approve and (ends < private.baghdad_today() or ends > private.academic_year_end(private.baghdad_today())) then
    raise exception 'Invalid date' using errcode = 'check_violation';
  end if;

  update public.student_requests set
    status = case when approve then 'approved' else 'rejected' end,
    reject_reason = case when approve then null else left(nullif(trim(reason), ''), 500) end,
    card_path = null,
    reviewed_by = (select auth.uid()),
    reviewed_at = now()
  where id = request.id;

  if approve then
    perform private.grant_student_badge(request.user_id, request.university_id, ends, 'card', null);
  end if;
  perform private.notify(
    request.user_id, 'system',
    case when approve then 'student_verified' else 'student_rejected' end,
    jsonb_build_object('until', to_char(ends, 'YYYY-MM-DD')),
    '/pass/settings#student'
  );
  return request.card_path;
end;
$$;

create function public.review_student_card(
  target uuid,
  approve boolean,
  until date default null,
  reason text default null
)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.review_student_card(target, approve, until, reason) $$;

-- The caller's student status for Pass → Settings.
create function private.my_student()
returns table (
  verified boolean,
  university_id text,
  valid_until date,
  method text,
  pending text,
  rejected_reason text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(b.valid_until >= private.baghdad_today(), false),
    b.university_id,
    b.valid_until,
    b.method,
    (select r.method from public.student_requests r
      where r.user_id = (select auth.uid()) and r.status = 'pending'
        and (r.method = 'card' or r.code_expires_at > now())
      order by r.created_at desc limit 1),
    (select r.reject_reason from public.student_requests r
      where r.user_id = (select auth.uid()) and r.method = 'card'
      order by r.created_at desc limit 1)
  from (select 1) one
  left join public.student_badges b on b.user_id = (select auth.uid());
$$;

create function public.my_student()
returns table (
  verified boolean,
  university_id text,
  valid_until date,
  method text,
  pending text,
  rejected_reason text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_student() $$;

-- Student card photos: private, "<user id>/…"; the student uploads, support
-- reads and deletes after review.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-cards', 'student-cards', false, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Students upload their card photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'student-cards'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Students and support read card photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'student-cards'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{support}'))
    )
  );

create policy "Support deletes reviewed card photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'student-cards'
    and (select private.has_staff_role('{support}'))
  );

-- ── The student price for Plus ─────────────────────────────────────────────

-- A student plan is a monthly plan's student price; `student_of` names the
-- plan it discounts. Only verified students check out with it, and it
-- moves to the full price at the renewal after the badge ends.
alter table public.plans
  add column student_of text references public.plans (id);

create index plans_student_of_idx on public.plans (student_of);

comment on column public.plans.student_of is
  'Set on a student price: the plan it is 20% off. Verified students only.';

insert into public.plans (
  id, name, name_ar, description, amount, currency, billing_interval, active, audience, rental_slots,
  features_ar, features_en, position, tier, bulb_rate, free_delivery, home_swaps, student_of
)
select
  p.id || '-student', p.name || ' (students)', coalesce(p.name_ar, p.name) || ' (للطلاب)', p.description,
  -- 20% off, kept on a …750 ending.
  (floor((p.amount * 0.8 - 750) / 1000) * 1000 + 750)::bigint,
  p.currency, p.billing_interval, p.active, p.audience, p.rental_slots,
  p.features_ar, p.features_en, p.position + 20, p.tier, p.bulb_rate, p.free_delivery, p.home_swaps, p.id
from public.plans p
where p.audience = 'plus' and p.billing_interval = 'month' and p.student_of is null
on conflict (id) do nothing;

-- Only verified students subscribe to (or change to) a student price; at a
-- renewal after the badge has ended, the plan becomes the full price.
create function private.check_student_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_price text;
begin
  if new.user_id is null or private.is_student(new.user_id) then
    return new;
  end if;
  if new.next_plan_id is not null
    and (tg_op = 'INSERT' or new.next_plan_id is distinct from old.next_plan_id)
    and exists (select 1 from public.plans p where p.id = new.next_plan_id and p.student_of is not null)
  then
    raise exception 'The student price needs a verified student badge' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' or new.plan_id is distinct from old.plan_id then
    select p.student_of into full_price from public.plans p where p.id = new.plan_id;
    if full_price is not null and tg_op = 'INSERT' then
      raise exception 'The student price needs a verified student badge' using errcode = 'check_violation';
    elsif full_price is not null then
      new.plan_id := full_price;
    end if;
  end if;
  return new;
end;
$$;

create trigger check_student_plan
  before insert or update of plan_id, next_plan_id on public.subscriptions
  for each row execute function private.check_student_plan();

-- Daily: a member on a student price whose badge has ended moves to the
-- full price at the next renewal.
create function private.run_student_expiry()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  moved integer;
begin
  update public.subscriptions s set next_plan_id = p.student_of
  from public.plans p
  where p.id = s.plan_id
    and p.student_of is not null
    and s.status in ('active', 'past_due')
    and s.next_plan_id is null
    and s.user_id is not null
    and not private.is_student(s.user_id);
  get diagnostics moved = row_count;
  return moved;
end;
$$;

create function public.run_student_expiry()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.run_student_expiry() $$;

-- ── No deposit for verified students ───────────────────────────────────────

-- As before; a verified student pays no deposit.
create or replace function private.rental_quote(product uuid, variant uuid default null)
returns table (price bigint, days integer, late_fee bigint, deposit bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.price, r.days, r.late_fee,
    case when private.is_student((select auth.uid())) then 0::bigint
      else (floor(coalesce(v.price, p.price) * s.rental_deposit_rate / 100 / 250) * 250)::bigint
    end
  from public.products p
  join public.rental_rates r on r.category_id = p.category_id
  cross join public.store_settings s
  left join public.product_variants v
    on v.id = coalesce(variant, (
      select x.id from public.product_variants x
      where x.product_id = p.id and x.active
        and exists (select 1 from public.stock_items c where c.variant_id = x.id and c.purpose = 'rental')
      order by x.position limit 1
    ))
  where p.id = product and p.status = 'active' and p.rentable;
$$;

-- A waived deposit leaves no order line.
create function private.skip_free_deposit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'deposit' and new.unit_price = 0 then
    return null;
  end if;
  return new;
end;
$$;

create trigger skip_free_deposit
  before insert on public.order_items
  for each row execute function private.skip_free_deposit();

-- As before; a verified student books without the deposit.
create or replace function private.book_kit(
  kit text,
  starts_on date,
  shipping jsonb,
  delivery_zone uuid,
  extra_days integer default 0,
  games uuid[] default '{}',
  payment_method public.order_payment_method default 'online'
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  kit_row public.kit_types;
  weekend record;
  zone public.delivery_zones;
  settings public.store_settings;
  unit uuid;
  ends date;
  total_price bigint;
  created public.orders;
  booking public.kit_bookings;
  cash boolean := payment_method = 'cash_on_delivery';
  game uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  if not private.is_adult(caller) then
    raise exception 'You need to be 18 or over' using errcode = 'check_violation';
  end if;

  select * into kit_row from public.kit_types k where k.id = kit and k.active;
  if kit_row.id is null then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  if private.is_student(caller) then
    kit_row.deposit := 0;
  end if;
  if coalesce(extra_days, 0) not between 0 and 3 then
    raise exception 'Invalid booking' using errcode = 'check_violation';
  end if;
  select * into weekend from private.kit_weekends(kit) w where w.starts_on = book_kit.starts_on;
  if weekend.starts_on is null then
    raise exception 'Choose one of the coming weekends' using errcode = 'check_violation';
  end if;
  if coalesce(cardinality(games), 0) <> kit_row.games then
    raise exception 'Choose the kit''s games' using errcode = 'check_violation';
  end if;
  if kit_row.games > 0 and (
    select count(distinct p.id) from public.products p
    where p.id = any (games) and p.status = 'active' and p.rentable
      and (kit_row.games_category_id is null or p.category_id = kit_row.games_category_id)
      and not (p.age_rating = 18 and private.is_minor(caller))
  ) <> kit_row.games then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  if jsonb_typeof(shipping) is distinct from 'object'
    or coalesce(trim(shipping ->> 'full_name'), '') = ''
    or coalesce(shipping ->> 'phone', '') !~ '^\+[1-9][0-9]{7,14}$'
    or coalesce(trim(shipping ->> 'address'), '') = ''
    or char_length(shipping::text) > 4000
  then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;
  select * into zone from public.delivery_zones z
  where z.id = delivery_zone and z.active and z.governorate = 'baghdad';
  if zone.id is null then
    raise exception 'Kits are delivered in Baghdad only' using errcode = 'check_violation';
  end if;
  select * into settings from public.store_settings limit 1;
  if cash and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  -- Thursday evening to Saturday evening, plus the extra days.
  ends := book_kit.starts_on + 2 + coalesce(extra_days, 0);
  unit := private.free_kit_unit(kit, book_kit.starts_on, ends);
  if unit is null then
    raise exception 'All kits are booked that weekend' using errcode = 'check_violation';
  end if;

  total_price := weekend.price + coalesce(extra_days, 0) * weekend.extra_day_price;

  insert into public.orders (
    user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
    fulfilment, payment_method, delivery_zone_id
  )
  values (
    caller,
    case when cash then 'confirmed' else 'pending' end::public.order_status,
    total_price + kit_row.deposit, 0, total_price + kit_row.deposit, 0,
    jsonb_build_object(
      'full_name', left(trim(shipping ->> 'full_name'), 120),
      'phone', shipping ->> 'phone',
      'governorate', 'baghdad',
      'city', left(trim(coalesce(shipping ->> 'city', '')), 60),
      'address', left(trim(shipping ->> 'address'), 500),
      'notes', left(trim(coalesce(shipping ->> 'notes', '')), 500)
    ),
    'delivery', payment_method, zone.id
  )
  returning * into created;

  insert into public.kit_bookings (user_id, kit_type, unit_id, starts_on, ends_on, extra_days, order_id, deposit)
  values (caller, kit, unit, book_kit.starts_on, ends, coalesce(extra_days, 0), created.id, kit_row.deposit)
  returning * into booking;

  foreach game in array coalesce(games, '{}') loop
    insert into public.kit_booking_games (booking_id, product_id) values (booking.id, game);
  end loop;

  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values
    (created.id, kit_row.name_ar || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'),
      kit_row.name_en || ' · ' || to_char(book_kit.starts_on, 'YYYY-MM-DD'), total_price, 1, 'kit');
  if kit_row.deposit > 0 then
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (created.id, 'تأمين قابل للاسترداد: ' || kit_row.name_ar, 'Refundable deposit: ' || kit_row.name_en,
      kit_row.deposit, 1, 'deposit');
  end if;

  if cash then
    perform private.notify(
      caller, 'order', 'order_confirmed',
      jsonb_build_object('number', created.number, 'fulfilment', created.fulfilment),
      '/orders/view?id=' || created.id
    );
  end if;
  -- The coming weekend: hold the games now.
  perform private.hold_kit_games();
  return created;
end;
$$;

-- ── Perks ──────────────────────────────────────────────────────────────────

create table public.perks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  -- Shown to customers (organizations themselves are private).
  partner_name text not null check (char_length(partner_name) between 1 and 120),
  kind text not null default 'other'
    check (kind in ('cafe', 'books', 'print', 'gaming', 'cinema', 'music', 'repair', 'courses', 'other')),
  title_ar text not null check (char_length(title_ar) between 1 and 120),
  title_en text not null check (char_length(title_en) between 1 and 120),
  details_ar text not null default '' check (char_length(details_ar) <= 1000),
  details_en text not null default '' check (char_length(details_en) <= 1000),
  area_ar text not null default '' check (char_length(area_ar) <= 120),
  area_en text not null default '' check (char_length(area_en) <= 120),
  audience text not null default 'everyone' check (audience in ('everyone', 'students', 'plus')),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perks is
  'Partner perks on The IDEA Pass: open to every Pass, to students or to Plus members; checked by the partner from The IDEA Business.';

create index perks_organization_idx on public.perks (organization_id);
create index perks_listing_idx on public.perks (position) where active;

alter table public.perks enable row level security;

create policy "Visitors see the perks on offer" on public.perks
  for select to anon using (active);
create policy "Perks are public; partners and support see theirs" on public.perks
  for select to authenticated
  using (
    active
    or (select private.has_staff_role('{support}'))
    or (select private.is_org_member(organization_id))
  );
create policy "Support adds perks" on public.perks
  for insert to authenticated with check ((select private.has_staff_role('{support}')));
create policy "Support edits perks" on public.perks
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));
create policy "Support removes perks" on public.perks
  for delete to authenticated using ((select private.has_staff_role('{support}')));

grant select on public.perks to anon, authenticated;
grant insert, update, delete on public.perks to authenticated;

create trigger set_updated_at before update on public.perks
  for each row execute function private.set_updated_at();

create table public.perk_redemptions (
  id uuid primary key default gen_random_uuid(),
  perk_id uuid not null references public.perks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_on date not null default private.baghdad_today(),
  created_at timestamptz not null default now(),
  unique (perk_id, user_id, redeemed_on)
);

comment on table public.perk_redemptions is
  'Each use of a perk, once a day per person and perk (Baghdad time).';

create index perk_redemptions_user_idx on public.perk_redemptions (user_id);
create index perk_redemptions_redeemed_by_idx on public.perk_redemptions (redeemed_by);

alter table public.perk_redemptions enable row level security;

create policy "Members see their perk uses; support sees all" on public.perk_redemptions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.perk_redemptions to authenticated;

-- The holder of a scanned card (`IDEA:<member number>:<code>`), when its
-- code is current and the Pass isn't suspended.
create function private.pass_holder(scanned text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := regexp_match(trim(coalesce(scanned, '')), '^IDEA:([0-9]{1,18}):([0-9]{6})$');
  member public.profiles;
  seed bytea;
  now_step bigint := floor(extract(epoch from now()) / 30)::bigint;
begin
  if parts is null then
    return null;
  end if;
  select * into member from public.profiles p where p.member_number = parts[1]::bigint;
  select s.secret into seed from private.pass_secrets s where s.user_id = member.id;
  if member.id is null or seed is null or member.banned_at is not null then
    return null;
  end if;
  if parts[2] not in (
    private.pass_code(seed, now_step - 1),
    private.pass_code(seed, now_step),
    private.pass_code(seed, now_step + 1)
  ) then
    return null;
  end if;
  return member.id;
end;
$$;

-- Whether the member gets a perk open to `audience`.
create function private.perk_open_to(member uuid, audience text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case audience
    when 'everyone' then true
    when 'students' then private.is_student(member)
    when 'plus' then (private.member_plan(member)).id is not null
    else false
  end;
$$;

-- The partner's team checks a card: whose it is (first name and member
-- number only), its badges and the partner's perks with whether each is
-- open to them and already used today.
create function private.partner_check(org uuid, scanned text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  member uuid;
begin
  if not private.is_org_member(org) or not exists (select 1 from public.perks p where p.organization_id = org) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  member := private.pass_holder(scanned);
  if member is null then
    return jsonb_build_object('valid', false);
  end if;
  return jsonb_build_object(
    'valid', true,
    'first_name', private.first_name(member),
    'member_number', (select p.member_number from public.profiles p where p.id = member),
    'student', private.is_student(member),
    'plus', (private.member_plan(member)).id is not null,
    'perks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id,
        'title_ar', k.title_ar,
        'title_en', k.title_en,
        'audience', k.audience,
        'open', private.perk_open_to(member, k.audience),
        'used_today', exists (
          select 1 from public.perk_redemptions r
          where r.perk_id = k.id and r.user_id = member and r.redeemed_on = private.baghdad_today()
        )
      ) order by k.position, k.created_at)
      from public.perks k
      where k.organization_id = org and k.active
    ), '[]'::jsonb)
  );
end;
$$;

create function public.partner_check(org uuid, scanned text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.partner_check(org, scanned) $$;

-- The partner's team records a use of one of their perks.
create function private.redeem_perk(perk uuid, scanned text)
returns public.perk_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.perks;
  member uuid;
  saved public.perk_redemptions;
begin
  select * into target from public.perks p where p.id = perk and p.active;
  if target.id is null or not private.is_org_member(target.organization_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  member := private.pass_holder(scanned);
  if member is null then
    raise exception 'This card isn''t valid' using errcode = 'check_violation';
  end if;
  if not private.perk_open_to(member, target.audience) then
    raise exception 'This perk isn''t open to them' using errcode = 'check_violation';
  end if;

  insert into public.perk_redemptions (perk_id, user_id, redeemed_by)
  values (target.id, member, (select auth.uid()))
  on conflict (perk_id, user_id, redeemed_on) do nothing
  returning * into saved;
  if saved.id is null then
    raise exception 'Already used today' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

create function public.redeem_perk(perk uuid, scanned text)
returns public.perk_redemptions
language sql
security invoker
set search_path = ''
as $$ select private.redeem_perk(perk, scanned) $$;

-- Uses of the partner's perks by month (the last 12 months).
create function private.perk_stats(org uuid)
returns table (perk_id uuid, month date, uses bigint, people bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.is_org_member(org) or private.has_staff_role('{support}')) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
  select r.perk_id, date_trunc('month', r.redeemed_on)::date, count(*), count(distinct r.user_id)
  from public.perk_redemptions r
  join public.perks k on k.id = r.perk_id
  where k.organization_id = org
    and r.redeemed_on >= (date_trunc('month', private.baghdad_today()) - interval '11 months')::date
  group by 1, 2
  order by 2 desc, 1;
end;
$$;

create function public.perk_stats(org uuid)
returns table (perk_id uuid, month date, uses bigint, people bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.perk_stats(org) $$;

-- The organizations the caller checks perks for.
create function private.my_partners()
returns table (organization_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct o.id, o.name
  from public.memberships m
  join public.organizations o on o.id = m.organization_id
  where m.user_id = (select auth.uid())
    and exists (select 1 from public.perks p where p.organization_id = o.id);
$$;

create function public.my_partners()
returns table (organization_id uuid, name text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_partners() $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.baghdad_today() from public;
revoke all on function private.academic_year_end(date) from public;
revoke all on function private.is_student(uuid) from public, anon, authenticated;
revoke all on function private.email_university(text, text) from public, anon;
revoke all on function private.hash_text(text) from public, anon, authenticated;
revoke all on function private.issue_student_code(uuid, text, text) from public, anon, authenticated;
revoke all on function public.issue_student_code(uuid, text, text) from public, anon, authenticated;
revoke all on function private.grant_student_badge(uuid, text, date, text, text) from public, anon, authenticated;
revoke all on function private.confirm_student_email(text) from public, anon;
revoke all on function public.confirm_student_email(text) from public, anon;
revoke all on function private.request_student_review(text, text) from public, anon;
revoke all on function public.request_student_review(text, text) from public, anon;
revoke all on function private.review_student_card(uuid, boolean, date, text) from public, anon;
revoke all on function public.review_student_card(uuid, boolean, date, text) from public, anon;
revoke all on function private.my_student() from public, anon;
revoke all on function public.my_student() from public, anon;
revoke all on function private.check_student_plan() from public, anon, authenticated;
revoke all on function private.run_student_expiry() from public, anon, authenticated;
revoke all on function public.run_student_expiry() from public, anon, authenticated;
revoke all on function private.skip_free_deposit() from public, anon, authenticated;
revoke all on function private.pass_holder(text) from public, anon, authenticated;
revoke all on function private.perk_open_to(uuid, text) from public, anon, authenticated;
revoke all on function private.partner_check(uuid, text) from public, anon;
revoke all on function public.partner_check(uuid, text) from public, anon;
revoke all on function private.redeem_perk(uuid, text) from public, anon;
revoke all on function public.redeem_perk(uuid, text) from public, anon;
revoke all on function private.perk_stats(uuid) from public, anon;
revoke all on function public.perk_stats(uuid) from public, anon;
revoke all on function private.my_partners() from public, anon;
revoke all on function public.my_partners() from public, anon;

grant execute on function private.baghdad_today() to anon, authenticated, service_role;
grant execute on function private.academic_year_end(date) to anon, authenticated, service_role;
grant execute on function private.is_student(uuid) to service_role;
grant execute on function private.email_university(text, text) to service_role;
grant execute on function private.issue_student_code(uuid, text, text) to service_role;
grant execute on function public.issue_student_code(uuid, text, text) to service_role;
grant execute on function private.confirm_student_email(text) to authenticated;
grant execute on function public.confirm_student_email(text) to authenticated;
grant execute on function private.request_student_review(text, text) to authenticated;
grant execute on function public.request_student_review(text, text) to authenticated;
grant execute on function private.review_student_card(uuid, boolean, date, text) to authenticated;
grant execute on function public.review_student_card(uuid, boolean, date, text) to authenticated;
grant execute on function private.my_student() to authenticated;
grant execute on function public.my_student() to authenticated;
grant execute on function private.run_student_expiry() to service_role;
grant execute on function public.run_student_expiry() to service_role;
grant execute on function private.partner_check(uuid, text) to authenticated;
grant execute on function public.partner_check(uuid, text) to authenticated;
grant execute on function private.redeem_perk(uuid, text) to authenticated;
grant execute on function public.redeem_perk(uuid, text) to authenticated;
grant execute on function private.perk_stats(uuid) to authenticated;
grant execute on function public.perk_stats(uuid) to authenticated;
grant execute on function private.my_partners() to authenticated;
grant execute on function public.my_partners() to authenticated;
