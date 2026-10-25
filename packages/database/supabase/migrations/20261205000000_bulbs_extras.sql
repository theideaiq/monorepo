-- More ways to earn Bulbs.
--
-- - The IDEA Plus payments earn cashback at the member's rate (their tier
--   and the Plus bonus), usable at once: a membership has no return window.
--   A refunded payment voids it.
-- - Birthday: 25 Bulbs once a year, on the member's birthday (Baghdad time),
--   with a notification. Members set their birthday once in My Pass;
--   support can correct it.
-- - Photo review: 5 Bulbs for a published review with a photo of a product
--   the member bought or rented, once per product (deleting the review and
--   writing it again earns nothing more); voided if staff hide it.
-- - Event check-in: 10 Bulbs when staff check a member in at an event they
--   RSVP'd for, once per event.

alter table public.bulb_entries
  add column payment_id uuid references public.payments (id) on delete set null,
  add column review_id uuid references public.product_reviews (id) on delete set null,
  add column event_id uuid references public.events (id) on delete set null,
  add column product_id uuid references public.products (id) on delete set null;

create index bulb_entries_payment_idx on public.bulb_entries (payment_id);
create index bulb_entries_review_idx on public.bulb_entries (review_id);
create index bulb_entries_event_idx on public.bulb_entries (event_id);
create index bulb_entries_product_idx on public.bulb_entries (product_id);

create unique index bulb_entries_payment_purchase_key
  on public.bulb_entries (payment_id) where kind = 'purchase';
-- Per member and product, not per review, so a deleted review keeps its entry.
create unique index bulb_entries_photo_review_key
  on public.bulb_entries (user_id, product_id) where reason = 'photo_review';
create unique index bulb_entries_check_in_key
  on public.bulb_entries (user_id, event_id) where reason = 'event_check_in';
-- One birthday bonus a year: the reason carries the year (birthday_2026).
create unique index bulb_entries_birthday_key
  on public.bulb_entries (user_id, reason) where kind = 'bonus' and reason like 'birthday_%';

-- ── The IDEA Plus payments ─────────────────────────────────────────────────

create function private.on_payment_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  bulbs integer;
begin
  if new.subscription_id is null then
    return null;
  end if;

  if new.status = 'refunded' and tg_op = 'UPDATE' and old.status is distinct from 'refunded' then
    update public.bulb_entries set status = 'void'
    where payment_id = new.id and kind = 'purchase' and status <> 'void';
    return null;
  end if;
  if new.status <> 'paid' or (tg_op = 'UPDATE' and old.status = 'paid') then
    return null;
  end if;

  select s.user_id into member
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.id = new.subscription_id and p.audience = 'plus';
  if member is null then
    return null;
  end if;

  -- 1 Bulb = 100 IQD.
  bulbs := floor(new.amount * private.bulb_rate(member) / 100 / 100);
  if bulbs > 0 then
    insert into public.bulb_entries (user_id, amount, kind, payment_id)
    values (member, bulbs, 'purchase', new.id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger bulbs_on_payment
  after insert or update of status on public.payments
  for each row execute function private.on_payment_bulbs();

-- ── Birthdays ──────────────────────────────────────────────────────────────

alter table public.profiles
  add column birthday date check (birthday between date '1900-01-01' and date '2100-01-01');

comment on column public.profiles.birthday is
  'Set once by the member (support can correct it); 25 Bulbs each year on the day.';

grant update (birthday) on public.profiles to authenticated;

-- Only the member reads their birthday (column privileges keep it from
-- co-members and other selects), through my_birthday().
create function private.my_birthday()
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select p.birthday from public.profiles p where p.id = (select auth.uid());
$$;

create function public.my_birthday()
returns date
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_birthday() $$;

-- Members set their birthday once; changing it afterwards is for support
-- (otherwise it could be moved to collect the bonus again).
create function private.guard_birthday()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.birthday is not null
    and new.birthday is distinct from old.birthday
    and current_user = 'authenticated'
    and not private.has_staff_role('{support}')
  then
    raise exception 'Contact support to change your birthday' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger guard_birthday before update of birthday on public.profiles
  for each row execute function private.guard_birthday();

-- Today's birthdays (Baghdad time) get their bonus and a notification;
-- 29 February birthdays count on 28 February in other years.
create function private.run_birthday_bulbs(out rewarded integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Baghdad')::date;
  leap boolean := extract(day from (date_trunc('year', today) + interval '2 months' - interval '1 day')) = 29;
begin
  with due as (
    select p.id
    from public.profiles p
    where p.birthday is not null
      and p.banned_at is null
      and (
        (extract(month from p.birthday), extract(day from p.birthday))
          = (extract(month from today), extract(day from today))
        or (not leap and extract(month from p.birthday) = 2 and extract(day from p.birthday) = 29
          and extract(month from today) = 2 and extract(day from today) = 28)
      )
  ),
  paid as (
    insert into public.bulb_entries (user_id, amount, kind, reason)
    select due.id, 25, 'bonus', 'birthday_' || extract(year from today)::text
    from due
    on conflict do nothing
    returning user_id, amount
  ),
  told as (
    insert into public.notifications (user_id, kind, event, data, link)
    select paid.user_id, 'system', 'bulbs_birthday',
      jsonb_build_object('bulbs', paid.amount), '/pass/bulbs'
    from paid
    returning 1
  )
  select count(*)::integer into rewarded from told;
end;
$$;

create function public.run_birthday_bulbs(out rewarded integer)
language sql
volatile
security invoker
set search_path = ''
as $$ select * from private.run_birthday_bulbs() $$;

-- ── Photo reviews ──────────────────────────────────────────────────────────

alter table public.product_reviews
  add column photos text[] not null default '{}'
    check (cardinality(photos) <= 4);

comment on column public.product_reviews.photos is
  'Paths in the public `reviews` bucket, "<user id>/…".';

grant insert (photos) on public.product_reviews to authenticated;
grant update (photos) on public.product_reviews to authenticated;

-- Photos belong to their author.
create function private.check_review_photos()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from unnest(new.photos) as photo
    where split_part(photo, '/', 1) <> new.user_id::text
  ) then
    raise exception 'Review photos must be the author''s own uploads' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_review_photos before insert or update of photos on public.product_reviews
  for each row execute function private.check_review_photos();

create function private.on_review_bulbs()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'hidden' then
    update public.bulb_entries set status = 'void'
    where review_id = new.id and reason = 'photo_review' and status <> 'void';
  elsif new.status = 'published' and new.verified_purchase and cardinality(new.photos) > 0 then
    insert into public.bulb_entries (user_id, amount, kind, review_id, product_id, reason)
    values (new.user_id, 5, 'bonus', new.id, new.product_id, 'photo_review')
    on conflict do nothing;
  end if;
  return null;
end;
$$;

create trigger bulbs_on_review
  after insert or update of photos, status on public.product_reviews
  for each row execute function private.on_review_bulbs();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reviews', 'reviews', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "Members upload their review photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reviews'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Members and support delete review photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reviews'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select private.has_staff_role('{support}'))
    )
  );

-- The public review list shows the photos too.
drop function public.product_review_list(uuid, integer, integer);
drop function private.product_review_list(uuid, integer, integer);

create function private.product_review_list(review_product uuid, max_rows integer default 20, skip integer default 0)
returns table (
  id uuid,
  rating smallint,
  comment text,
  verified_purchase boolean,
  created_at timestamptz,
  author_name text,
  photos text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.rating, r.comment, r.verified_purchase, r.created_at,
    nullif(split_part(trim(coalesce(p.full_name, '')), ' ', 1), ''),
    r.photos
  from public.product_reviews r
  left join public.profiles p on p.id = r.user_id
  where r.product_id = review_product and r.status = 'published'
  order by r.created_at desc
  limit least(greatest(max_rows, 1), 50) offset greatest(skip, 0);
$$;

create function public.product_review_list(review_product uuid, max_rows integer default 20, skip integer default 0)
returns table (
  id uuid,
  rating smallint,
  comment text,
  verified_purchase boolean,
  created_at timestamptz,
  author_name text,
  photos text[]
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.product_review_list($1, $2, $3) $$;

revoke all on function private.product_review_list(uuid, integer, integer) from public;
grant execute on function private.product_review_list(uuid, integer, integer) to anon, authenticated, service_role;
revoke all on function public.product_review_list(uuid, integer, integer) from public;
grant execute on function public.product_review_list(uuid, integer, integer) to anon, authenticated, service_role;

-- ── Event check-ins ────────────────────────────────────────────────────────

alter table public.event_rsvps
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references auth.users (id) on delete set null;

create index event_rsvps_checked_in_by_idx on public.event_rsvps (checked_in_by);

-- Editors check members in at the door; the bonus follows.
create function private.check_in_rsvp(event uuid, member uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  at timestamptz;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Editors only' using errcode = 'insufficient_privilege';
  end if;
  update public.event_rsvps r
  set checked_in_at = coalesce(r.checked_in_at, now()),
    checked_in_by = coalesce(r.checked_in_by, (select auth.uid()))
  where r.event_id = event and r.user_id = member
  returning r.checked_in_at into at;
  if at is null then
    raise exception 'No RSVP for this member' using errcode = 'no_data_found';
  end if;
  insert into public.bulb_entries (user_id, amount, kind, event_id, reason)
  values (member, 10, 'bonus', event, 'event_check_in')
  on conflict do nothing;
  return at;
end;
$$;

create function public.check_in_rsvp(event uuid, member uuid)
returns timestamptz
language sql
volatile
security invoker
set search_path = ''
as $$ select private.check_in_rsvp(event, member) $$;

comment on function public.check_in_rsvp(uuid, uuid) is
  'Checks a member in at an event they RSVP''d for (editors) and pays the 10-Bulb check-in bonus once.';

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.on_payment_bulbs() from public, anon, authenticated;
revoke all on function private.run_birthday_bulbs() from public, anon, authenticated;
revoke all on function private.on_review_bulbs() from public, anon, authenticated;

revoke all on function public.run_birthday_bulbs() from public, anon, authenticated;
grant execute on function public.run_birthday_bulbs() to service_role;

revoke all on function private.my_birthday() from public, anon;
grant execute on function private.my_birthday() to authenticated, service_role;
revoke all on function public.my_birthday() from public, anon;
grant execute on function public.my_birthday() to authenticated, service_role;

revoke all on function private.check_in_rsvp(uuid, uuid) from public, anon;
grant execute on function private.check_in_rsvp(uuid, uuid) to authenticated, service_role;
revoke all on function public.check_in_rsvp(uuid, uuid) from public, anon;
grant execute on function public.check_in_rsvp(uuid, uuid) to authenticated, service_role;
