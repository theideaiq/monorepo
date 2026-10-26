-- Program revision v1, step 5b: The IDEA Plus launches in Baghdad.
--
-- * Places: Plus opens for `store_settings.plus_capacity` members (60).
--   Beyond that people join a waitlist; when a place opens the next person
--   in line (in Baghdad) is invited and has `plus_invite_hours` (72) to
--   join, else the invite passes on. Outside Baghdad, people wait for their
--   governorate.
-- * Homes: joining asks for the member's area in Baghdad (`plus_areas`,
--   each with its delivery day) and address (`plus_homes`).
-- * No due dates: Plus rentals are kept as long as the member likes, so
--   they never go overdue (single-item rents still do).
-- * The queue: Saved (`wishlist_items`) in an order the member sets.
-- * Swaps: the member books what goes back and what comes next
--   (`book_swap()`); home swaps count against the plan's monthly allowance
--   (`plans.home_swaps`, 1/2/4) and an extra one costs
--   `store_settings.extra_swap_fee` (3,000 IQD) as an order; swaps at the
--   counter are unlimited. Staff complete them (`complete_swap()`).
-- * Plans: annual plans (pay 10 months, get 12); pause up to 31 days a
--   year (`pause_plus()`); cancel at the end of the paid period
--   (`cancel_plus()`); change plan from the next renewal
--   (`change_plus_plan()`).

-- ── Settings and plans ─────────────────────────────────────────────────────

alter table public.store_settings
  add column plus_capacity integer not null default 60 check (plus_capacity >= 0),
  add column plus_invite_hours integer not null default 72 check (plus_invite_hours between 1 and 720),
  add column extra_swap_fee bigint not null default 3000 check (extra_swap_fee >= 0);

comment on column public.store_settings.plus_capacity is
  'How many members The IDEA Plus takes; beyond that people join the waitlist.';
comment on column public.store_settings.plus_invite_hours is
  'How long an invite from the Plus waitlist stays open.';
comment on column public.store_settings.extra_swap_fee is
  'What a home swap beyond the plan''s monthly allowance costs.';

alter table public.plans
  add column home_swaps integer check (home_swaps >= 0);

comment on column public.plans.home_swaps is
  'Home swaps included each month (The IDEA Plus); swaps at the counter are unlimited.';

update public.plans set home_swaps = rental_slots where audience = 'plus' and rental_slots is not null;

-- Annual plans: pay 10 months, get 12.
insert into public.plans (
  id, name, name_ar, description, amount, currency, billing_interval, audience,
  rental_slots, tier, bulb_rate, free_delivery, home_swaps, features_ar, features_en, position, active
)
select p.id || '-year', p.name, p.name_ar, p.description, p.amount * 10, p.currency, 'year', p.audience,
  p.rental_slots, p.tier, p.bulb_rate, p.free_delivery, p.home_swaps,
  p.features_ar || '{"ادفع 10 أشهر واحصل على 12"}', p.features_en || '{"Pay 10 months, get 12"}',
  p.position + 10, p.active
from public.plans p
where p.id in ('plus-glow', 'plus-shine', 'plus-blaze')
on conflict (id) do nothing;

alter table public.subscriptions
  add column next_plan_id text references public.plans (id),
  add column paused_until timestamptz;

comment on column public.subscriptions.next_plan_id is
  'The plan the subscription switches to at its next renewal.';
comment on column public.subscriptions.paused_until is
  'The IDEA Plus paused until then: no swaps, and the paid period moved on by the pause.';

create index subscriptions_next_plan_idx on public.subscriptions (next_plan_id);

-- ── Areas and homes ────────────────────────────────────────────────────────

create table public.plus_areas (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null check (char_length(name_ar) between 1 and 80),
  name_en text not null check (char_length(name_en) between 1 and 80),
  -- 0 Sunday … 6 Saturday; null until staff give the area a day.
  weekday smallint check (weekday between 0 and 6),
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.plus_areas is
  'Parts of Baghdad The IDEA Plus delivers to, each with its delivery day.';

alter table public.plus_areas enable row level security;

create policy "Plus areas are public" on public.plus_areas
  for select to anon, authenticated using (active or (select private.has_staff_role('{support}')));
create policy "Support adds Plus areas" on public.plus_areas
  for insert to authenticated with check ((select private.has_staff_role('{support}')));
create policy "Support edits Plus areas" on public.plus_areas
  for update to authenticated
  using ((select private.has_staff_role('{support}')))
  with check ((select private.has_staff_role('{support}')));

grant select on public.plus_areas to anon, authenticated;
grant insert, update on public.plus_areas to authenticated;

insert into public.plus_areas (name_ar, name_en, position)
values
  ('الكرادة', 'Karrada', 1),
  ('الجادرية', 'Jadriya', 2),
  ('المنصور', 'Mansour', 3),
  ('اليرموك', 'Yarmouk', 4),
  ('الحارثية', 'Harthiya', 5),
  ('الأعظمية', 'Adhamiya', 6),
  ('الكاظمية', 'Kadhimiya', 7),
  ('زيونة', 'Zayouna', 8),
  ('شارع فلسطين', 'Palestine Street', 9),
  ('بغداد الجديدة', 'Baghdad al-Jadida', 10),
  ('الدورة', 'Dora', 11),
  ('السيدية', 'Saydiya', 12),
  ('الغزالية', 'Ghazaliya', 13),
  ('العامرية', 'Amiriya', 14),
  ('مدينة الصدر', 'Sadr City', 15);

create table public.plus_homes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  area_id uuid not null references public.plus_areas (id),
  address text not null check (char_length(trim(address)) between 1 and 500),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz not null default now()
);

comment on table public.plus_homes is
  'Where a Plus member''s swaps go: their area in Baghdad and address.';

create index plus_homes_area_idx on public.plus_homes (area_id);

alter table public.plus_homes enable row level security;

create policy "Members see their Plus home; support sees all" on public.plus_homes
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.plus_homes to authenticated;

create trigger set_updated_at before update on public.plus_homes
  for each row execute function private.set_updated_at();

-- ── The waitlist ───────────────────────────────────────────────────────────

create table public.plus_waitlist (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan_id text references public.plans (id),
  governorate text not null check (char_length(governorate) between 1 and 60),
  area_id uuid references public.plus_areas (id),
  status text not null default 'waiting'
    check (status in ('waiting', 'invited', 'joined', 'expired', 'left')),
  invited_at timestamptz,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.plus_waitlist is
  'People waiting for a place in The IDEA Plus, first come first served; outside Baghdad they wait for their governorate.';

create index plus_waitlist_queue_idx on public.plus_waitlist (status, created_at);
create index plus_waitlist_plan_idx on public.plus_waitlist (plan_id);
create index plus_waitlist_area_idx on public.plus_waitlist (area_id);

alter table public.plus_waitlist enable row level security;

create policy "People see their waitlist place; support sees all" on public.plus_waitlist
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.plus_waitlist to authenticated;

-- Live Plus members: anyone with an active or past-due Plus subscription.
create function private.plus_member_count()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct s.user_id)::integer
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where p.audience = 'plus' and s.user_id is not null
    and s.status in ('active', 'past_due')
    and (s.current_period_end is null or s.current_period_end > now());
$$;

-- Places nobody holds: capacity less members and open invites.
create function private.plus_places_free()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0,
    (select plus_capacity from public.store_settings limit 1)
    - private.plus_member_count()
    - (select count(*)::integer from public.plus_waitlist w
       where w.status = 'invited' and w.invite_expires_at > now()
         and (private.member_plan(w.user_id)).id is null)
  );
$$;

-- Whether `member` may start paying for Plus now, and why not.
create function private.plus_join_reason(member uuid)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  place public.plus_waitlist;
begin
  if (private.member_plan(member)).id is not null then
    return 'member';
  end if;
  select * into place from public.plus_waitlist where user_id = member;
  if place.governorate is not null and place.governorate <> 'baghdad' and place.status = 'waiting' then
    return 'outside_baghdad';
  end if;
  if not exists (select 1 from public.plus_homes where user_id = member) then
    return 'needs_home';
  end if;
  if place.status = 'invited' and place.invite_expires_at > now() then
    return 'invited';
  end if;
  if private.plus_places_free() > 0 and not exists (
    select 1 from public.plus_waitlist w
    where w.status = 'waiting' and w.governorate = 'baghdad' and w.user_id <> member
  ) then
    return 'open';
  end if;
  return 'full';
end;
$$;

-- What /plus shows: places, the caller's waitlist place and whether they
-- can join now.
create function private.plus_status()
returns table (
  capacity integer,
  places_free integer,
  waiting integer,
  join_reason text,
  can_join boolean,
  waitlist_status text,
  waitlist_position integer,
  waitlist_governorate text,
  invite_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select plus_capacity from public.store_settings limit 1),
    private.plus_places_free(),
    (select count(*)::integer from public.plus_waitlist where status = 'waiting'),
    r.reason,
    r.reason in ('member', 'invited', 'open'),
    w.status,
    case when w.status = 'waiting' then (
      select count(*)::integer from public.plus_waitlist o
      where o.status = 'waiting' and o.governorate = w.governorate and o.created_at <= w.created_at
    ) end,
    w.governorate,
    case when w.status = 'invited' then w.invite_expires_at end
  from (select case when (select auth.uid()) is null then 'signed_out'
          else private.plus_join_reason((select auth.uid())) end as reason) r
  left join public.plus_waitlist w on w.user_id = (select auth.uid());
$$;

create function public.plus_status()
returns table (
  capacity integer,
  places_free integer,
  waiting integer,
  join_reason text,
  can_join boolean,
  waitlist_status text,
  waitlist_position integer,
  waitlist_governorate text,
  invite_expires_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.plus_status() $$;

-- The member's area in Baghdad and address, needed before joining.
create function private.set_plus_home(area uuid, address text, phone text)
returns public.plus_homes
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  saved public.plus_homes;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.plus_areas a where a.id = area and a.active) then
    raise exception 'Area not available' using errcode = 'check_violation';
  end if;
  if coalesce(trim(address), '') = '' or coalesce(phone, '') !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Invalid shipping address' using errcode = 'check_violation';
  end if;
  insert into public.plus_homes (user_id, area_id, address, phone)
  values (caller, area, left(trim(address), 500), phone)
  on conflict (user_id) do update
    set area_id = excluded.area_id, address = excluded.address, phone = excluded.phone
  returning * into saved;
  -- Someone waiting from Baghdad keeps their place with their area.
  update public.plus_waitlist set area_id = area where user_id = caller and governorate = 'baghdad';
  return saved;
end;
$$;

create function public.set_plus_home(area uuid, address text, phone text)
returns public.plus_homes
language sql
security invoker
set search_path = ''
as $$ select private.set_plus_home(area, address, phone) $$;

-- Join (or move within) the waitlist; returns the caller's position.
create function private.join_plus_waitlist(plan text, governorate text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  wanted text := lower(trim(governorate));
  wanted_plan text := nullif(trim(plan), '');
  saved public.plus_waitlist;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if (private.member_plan(caller)).id is not null then
    raise exception 'Already a member' using errcode = 'check_violation';
  end if;
  if wanted_plan is not null and not exists (
    select 1 from public.plans p where p.id = wanted_plan and p.audience = 'plus' and p.active
  ) then
    raise exception 'Plan not available' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.delivery_zones z where z.governorate = wanted) then
    raise exception 'Delivery zone not available' using errcode = 'check_violation';
  end if;

  insert into public.plus_waitlist (user_id, plan_id, governorate, area_id)
  values (caller, wanted_plan, wanted, (select area_id from public.plus_homes where user_id = caller))
  on conflict (user_id) do update
    set plan_id = excluded.plan_id,
      governorate = excluded.governorate,
      area_id = excluded.area_id,
      -- Joining again after an expired invite or leaving goes to the back.
      status = case when plus_waitlist.status in ('waiting', 'invited') then plus_waitlist.status else 'waiting' end,
      created_at = case when plus_waitlist.status in ('waiting', 'invited') then plus_waitlist.created_at else now() end
  returning * into saved;

  return (
    select count(*)::integer from public.plus_waitlist o
    where o.status = 'waiting' and o.governorate = saved.governorate and o.created_at <= saved.created_at
  );
end;
$$;

create function public.join_plus_waitlist(plan text, governorate text)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.join_plus_waitlist(plan, governorate) $$;

create function private.leave_plus_waitlist()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.plus_waitlist set status = 'left', invite_expires_at = null
  where user_id = (select auth.uid()) and status in ('waiting', 'invited');
$$;

create function public.leave_plus_waitlist()
returns void
language sql
security invoker
set search_path = ''
as $$ select private.leave_plus_waitlist() $$;

-- Expires old invites, then invites the next people in Baghdad while
-- places are free. Returns how many were invited.
create function private.invite_from_plus_waitlist()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  hours integer := (select plus_invite_hours from public.store_settings limit 1);
  invited integer := 0;
  next_up public.plus_waitlist;
begin
  update public.plus_waitlist set status = 'expired'
  where status = 'invited' and invite_expires_at <= now();

  loop
    exit when private.plus_places_free() <= 0;
    select * into next_up from public.plus_waitlist w
    where w.status = 'waiting' and w.governorate = 'baghdad'
    order by w.created_at
    limit 1
    for update skip locked;
    exit when next_up.user_id is null;

    update public.plus_waitlist
    set status = 'invited', invited_at = now(), invite_expires_at = now() + make_interval(hours => hours)
    where user_id = next_up.user_id;
    perform private.notify(
      next_up.user_id, 'plus', 'plus_invite',
      jsonb_build_object('hours', hours), '/plus#join'
    );
    invited := invited + 1;
    next_up := null;
  end loop;
  return invited;
end;
$$;

-- Daily (and whenever a place opens): the API's cron calls this.
create function public.run_plus_waitlist()
returns integer
language sql
security definer
set search_path = ''
as $$ select private.invite_from_plus_waitlist() $$;

-- Joining marks the waitlist place as used; a member leaving opens a place.
create function private.on_plus_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null or not exists (
    select 1 from public.plans p where p.id = new.plan_id and p.audience = 'plus'
  ) then
    return new;
  end if;
  if new.status = 'active' then
    update public.plus_waitlist set status = 'joined', invite_expires_at = null
    where user_id = new.user_id and status in ('waiting', 'invited', 'expired');
  end if;
  if tg_op = 'UPDATE' and old.status in ('active', 'past_due') and new.status not in ('active', 'past_due') then
    perform private.invite_from_plus_waitlist();
  end if;
  return new;
end;
$$;

create trigger on_plus_subscription
  after insert or update of status on public.subscriptions
  for each row execute function private.on_plus_subscription();

-- ── No due dates for Plus ──────────────────────────────────────────────────

alter table public.rentals
  add column swap_id uuid,
  add column return_swap_id uuid;

comment on column public.rentals.swap_id is
  'The swap that brings this Plus rental to the member.';
comment on column public.rentals.return_swap_id is
  'The swap that takes this Plus rental back.';

create or replace function private.on_rental_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'requested' and new.status in ('active', 'cancelled'))
    or (old.status = 'active' and new.status in ('returned', 'overdue', 'kept'))
    or (old.status = 'overdue' and new.status in ('returned', 'active', 'kept'))
  ) then
    raise exception 'Rental status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'active' and old.status = 'requested' then
    if new.kind = 'single' and not exists (
      select 1 from public.orders o
      where o.id = new.order_id and o.status in ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
    ) then
      raise exception 'Waiting for payment' using errcode = 'check_violation';
    end if;
    new.started_at := coalesce(new.started_at, now());
    -- Plus items are kept as long as the member likes; only a single-item
    -- rent has a due date.
    new.due_at := case when new.kind = 'single'
      then coalesce(new.due_at, new.started_at + make_interval(days => coalesce(new.days, 14)))
    end;
  end if;

  if new.status in ('returned', 'cancelled') then
    if new.status = 'returned' then
      new.returned_at := coalesce(new.returned_at, now());
    end if;
    update public.stock_items set status = 'available', rental_id = null
    where rental_id = new.id and status = 'rented';
  end if;

  return new;
end;
$$;

-- Plus rentals made before this have no due date either.
update public.rentals set due_at = null, status = case when status = 'overdue' then 'active' else status end
where kind = 'plus' and (due_at is not null or status = 'overdue');

-- ── The queue (Saved, in order) ────────────────────────────────────────────

alter table public.wishlist_items add column position integer not null default 0;

comment on column public.wishlist_items.position is
  'The member''s order: for Plus members, Saved is the queue of what to rent next.';

update public.wishlist_items w
set position = o.position
from (
  select user_id, product_id, row_number() over (partition by user_id order by created_at) as position
  from public.wishlist_items
) o
where o.user_id = w.user_id and o.product_id = w.product_id;

create function private.wishlist_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.position := coalesce(
    (select max(w.position) from public.wishlist_items w where w.user_id = new.user_id), 0
  ) + 1;
  return new;
end;
$$;

create trigger wishlist_position before insert on public.wishlist_items
  for each row execute function private.wishlist_position();

-- Sets the order of the caller's Saved items (the first is next).
create function private.reorder_saved(products uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.wishlist_items w
  set position = o.position
  from unnest(products) with ordinality as o (product_id, position)
  where w.user_id = (select auth.uid()) and w.product_id = o.product_id;
$$;

create function public.reorder_saved(products uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$ select private.reorder_saved(products) $$;

-- ── Swaps ──────────────────────────────────────────────────────────────────

create table public.plus_swaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  method text not null check (method in ('home', 'counter')),
  status text not null default 'booked' check (status in ('booked', 'done', 'cancelled')),
  area_id uuid references public.plus_areas (id),
  scheduled_for date,
  -- Counts against the plan's monthly home swaps.
  counted boolean not null default false,
  fee bigint not null default 0 check (fee >= 0),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

comment on table public.plus_swaps is
  'A Plus member''s swap: what goes back and what comes next, at home (on the area''s day) or at the counter.';

create index plus_swaps_user_idx on public.plus_swaps (user_id, created_at desc);
create index plus_swaps_open_idx on public.plus_swaps (status, scheduled_for);
create index plus_swaps_area_idx on public.plus_swaps (area_id);
create index plus_swaps_order_idx on public.plus_swaps (order_id);

alter table public.rentals
  add constraint rentals_swap_fk foreign key (swap_id) references public.plus_swaps (id) on delete set null,
  add constraint rentals_return_swap_fk foreign key (return_swap_id) references public.plus_swaps (id) on delete set null;

create index rentals_swap_idx on public.rentals (swap_id);
create index rentals_return_swap_idx on public.rentals (return_swap_id);

alter table public.plus_swaps enable row level security;

create policy "Members see their swaps; support sees all" on public.plus_swaps
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.plus_swaps to authenticated;

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('sale', 'rental', 'deposit', 'keep', 'swap'));

-- The next delivery day for an area (from tomorrow), or null when the
-- area has no day yet.
create function private.next_area_day(area uuid)
returns date
language sql
stable
set search_path = ''
as $$
  select d::date
  from public.plus_areas a,
    generate_series(
      (now() at time zone 'Asia/Baghdad')::date + 1,
      (now() at time zone 'Asia/Baghdad')::date + 7,
      interval '1 day'
    ) as d
  where a.id = area and a.weekday is not null and extract(dow from d) = a.weekday
  order by d
  limit 1;
$$;

-- Home swaps the member has used this month (Baghdad time).
create function private.home_swaps_used(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.plus_swaps s
  where s.user_id = member and s.counted and s.status <> 'cancelled'
    and date_trunc('month', s.created_at at time zone 'Asia/Baghdad')
      = date_trunc('month', now() at time zone 'Asia/Baghdad');
$$;

-- Holds a copy of a product for a Plus member's swap (plan tier checked);
-- the slot count is the swap's to check.
create function private.hold_plus_copy(member uuid, product uuid, swap uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.products;
  copy public.stock_items;
  created public.rentals;
begin
  select * into item from public.products p
  where p.id = product and p.status = 'active'
    and exists (
      select 1 from public.stock_items s
      where s.product_id = p.id and s.purpose = 'rental' and s.status in ('available', 'rented')
    );
  if item.id is null then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;
  if item.rental_tier is not null and private.plus_tier(member) < item.rental_tier then
    raise exception 'This item needs a higher plan' using errcode = 'check_violation';
  end if;
  if item.age_rating = 18 and private.is_minor(member) then
    raise exception 'Not available under 18' using errcode = 'check_violation';
  end if;

  select s.* into copy from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = item.id and v.active and s.purpose = 'rental' and s.status = 'available'
  order by s.created_at
  limit 1
  for update of s skip locked;
  if copy.id is null then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  insert into public.rentals (user_id, product_id, variant_id, name_ar, name_en, swap_id)
  values (member, item.id, copy.variant_id, item.name_ar, item.name_en, swap)
  returning * into created;
  update public.stock_items set status = 'rented', rental_id = created.id where id = copy.id;
  return created;
end;
$$;

-- Books a swap: `returns` (rentals the member has) go back, `wants`
-- (products, in order) come next, at home or at the counter.
create function private.book_swap(
  returns uuid[],
  wants uuid[],
  method text default 'home',
  payment_method public.order_payment_method default 'online'
)
returns public.plus_swaps
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  plan public.plans;
  sub public.subscriptions;
  home public.plus_homes;
  settings public.store_settings;
  holding integer;
  giving integer := coalesce(cardinality(returns), 0);
  taking integer := coalesce(cardinality(wants), 0);
  counts boolean;
  extra boolean := false;
  swap public.plus_swaps;
  created public.orders;
  product uuid;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  plan := private.member_plan(caller);
  if plan.id is null then
    raise exception 'Not a Plus member' using errcode = 'insufficient_privilege';
  end if;
  select s.* into sub from public.subscriptions s
  where s.user_id = caller and s.plan_id = plan.id and s.status in ('active', 'past_due')
  order by s.current_period_end desc nulls last limit 1;
  if sub.paused_until > now() then
    raise exception 'Plus is paused' using errcode = 'check_violation';
  end if;
  if method not in ('home', 'counter') or (giving = 0 and taking = 0) then
    raise exception 'Invalid swap' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.plus_swaps s where s.user_id = caller and s.status = 'booked') then
    raise exception 'A swap is already booked' using errcode = 'check_violation';
  end if;
  -- Cancelling: keep what's at home, but nothing new comes.
  if sub.cancel_at_period_end and taking > 0 then
    raise exception 'Plus ends at the end of this period' using errcode = 'check_violation';
  end if;

  if giving > 0 and (
    select count(*) from public.rentals r
    where r.id = any (returns) and r.user_id = caller and r.kind = 'plus'
      and r.status in ('active', 'overdue') and r.return_swap_id is null
  ) <> giving then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;

  select count(*)::integer into holding from public.rentals r
  where r.user_id = caller and r.kind = 'plus' and r.status in ('requested', 'active', 'overdue');
  if holding - giving + taking > coalesce(plan.rental_slots, 0) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  select * into settings from public.store_settings limit 1;
  if method = 'home' then
    select * into home from public.plus_homes where user_id = caller;
    if home.user_id is null then
      raise exception 'Add your Plus address first' using errcode = 'check_violation';
    end if;
    -- The first delivery to a member with nothing at home is free.
    counts := holding > 0;
    extra := counts and private.home_swaps_used(caller) >= coalesce(plan.home_swaps, 0);
  else
    counts := false;
  end if;
  if extra and payment_method = 'cash_on_delivery' and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  insert into public.plus_swaps (user_id, method, area_id, scheduled_for, counted, fee)
  values (
    caller, method, home.area_id,
    case when method = 'home' then private.next_area_day(home.area_id) end,
    counts, case when extra then settings.extra_swap_fee else 0 end
  )
  returning * into swap;

  update public.rentals set return_swap_id = swap.id where id = any (returns);
  foreach product in array coalesce(wants, '{}') loop
    perform private.hold_plus_copy(caller, product, swap.id);
  end loop;

  if extra and settings.extra_swap_fee > 0 then
    insert into public.orders (
      user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address,
      fulfilment, payment_method, guardian_status
    )
    values (
      caller,
      case when payment_method = 'cash_on_delivery' then 'confirmed' else 'pending' end::public.order_status,
      settings.extra_swap_fee, 0, settings.extra_swap_fee, 0,
      jsonb_build_object(
        'full_name', coalesce((select full_name from public.profiles where id = caller), ''),
        'phone', home.phone, 'governorate', 'baghdad',
        'city', (select name_en from public.plus_areas where id = home.area_id),
        'address', home.address, 'notes', ''
      ),
      'delivery', payment_method, null
    )
    returning * into created;
    insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
    values (created.id, 'تبديل إضافي في المنزل', 'Extra home swap', settings.extra_swap_fee, 1, 'swap');
    update public.plus_swaps set order_id = created.id where id = swap.id returning * into swap;
  end if;

  perform private.notify(
    caller, 'plus', 'plus_swap_booked',
    jsonb_build_object('method', method, 'date', swap.scheduled_for), '/plus#yours'
  );
  return swap;
end;
$$;

create function public.book_swap(
  returns uuid[],
  wants uuid[],
  method text default 'home',
  payment_method public.order_payment_method default 'online'
)
returns public.plus_swaps
language sql
security invoker
set search_path = ''
as $$ select private.book_swap(returns, wants, method, payment_method) $$;

-- The member (or support) cancels a booked swap: held copies go back,
-- items going back stay at home, an unpaid extra-swap order is cancelled.
create function private.cancel_swap(target uuid)
returns public.plus_swaps
language plpgsql
security definer
set search_path = ''
as $$
declare
  swap public.plus_swaps;
begin
  select * into swap from public.plus_swaps s
  where s.id = target and s.status = 'booked'
    and (s.user_id = (select auth.uid()) or private.has_staff_role('{support}'))
  for update;
  if swap.id is null then
    raise exception 'Swap not found' using errcode = 'no_data_found';
  end if;
  update public.rentals set status = 'cancelled' where swap_id = swap.id and status = 'requested';
  update public.rentals set return_swap_id = null where return_swap_id = swap.id;
  update public.orders set status = 'cancelled'
  where id = swap.order_id and status in ('pending', 'confirmed');
  update public.plus_swaps set status = 'cancelled' where id = swap.id returning * into swap;
  return swap;
end;
$$;

create function public.cancel_swap(target uuid)
returns public.plus_swaps
language sql
security invoker
set search_path = ''
as $$ select private.cancel_swap(target) $$;

-- Support completes a swap at the door or counter: items back are
-- returned, the new ones are with the member.
create function private.complete_swap(target uuid)
returns public.plus_swaps
language plpgsql
security definer
set search_path = ''
as $$
declare
  swap public.plus_swaps;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into swap from public.plus_swaps s where s.id = target and s.status = 'booked' for update;
  if swap.id is null then
    raise exception 'Swap not found' using errcode = 'no_data_found';
  end if;
  if swap.order_id is not null and not exists (
    select 1 from public.orders o
    where o.id = swap.order_id and o.status in ('paid', 'confirmed', 'processing', 'shipped', 'delivered')
  ) then
    raise exception 'Waiting for payment' using errcode = 'check_violation';
  end if;
  update public.rentals set status = 'returned'
  where return_swap_id = swap.id and status in ('active', 'overdue');
  update public.rentals set status = 'active' where swap_id = swap.id and status = 'requested';
  update public.orders set status = 'delivered'
  where id = swap.order_id and status in ('paid', 'confirmed', 'processing', 'shipped');
  update public.plus_swaps set status = 'done', done_at = now() where id = swap.id returning * into swap;
  perform private.notify(swap.user_id, 'plus', 'plus_swap_done', '{}'::jsonb, '/plus#yours');
  return swap;
end;
$$;

create function public.complete_swap(target uuid)
returns public.plus_swaps
language sql
security invoker
set search_path = ''
as $$ select private.complete_swap(target) $$;

-- What the member's next swap would be: home swaps left this month, the
-- fee for an extra one and the date it would come.
create function private.my_swap_terms()
returns table (home_swaps integer, home_swaps_used integer, extra_fee bigint, next_date date, area_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((private.member_plan((select auth.uid()))).home_swaps, 0),
    private.home_swaps_used((select auth.uid())),
    (select extra_swap_fee from public.store_settings limit 1),
    private.next_area_day(h.area_id),
    h.area_id
  from (select 1) one
  left join public.plus_homes h on h.user_id = (select auth.uid());
$$;

create function public.my_swap_terms()
returns table (home_swaps integer, home_swaps_used integer, extra_fee bigint, next_date date, area_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_swap_terms() $$;

-- ── Pause, cancel and change plan ──────────────────────────────────────────

create table public.plus_pauses (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  check (ends_at > starts_at)
);

comment on table public.plus_pauses is
  'Pauses of The IDEA Plus: up to 31 days in any 12 months.';

create index plus_pauses_user_idx on public.plus_pauses (user_id, starts_at desc);
create index plus_pauses_subscription_idx on public.plus_pauses (subscription_id);

alter table public.plus_pauses enable row level security;

create policy "Members see their pauses; support sees all" on public.plus_pauses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

grant select on public.plus_pauses to authenticated;

-- The caller's live, self-paid Plus subscription.
create function private.my_plus_subscription()
returns public.subscriptions
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = (select auth.uid()) and p.audience = 'plus'
    and s.organization_id is null and s.provider <> 'company'
    and s.status in ('active', 'past_due')
    and (s.current_period_end is null or s.current_period_end > now())
  order by s.current_period_end desc nulls last
  limit 1;
$$;

-- Days of pause the caller has left in the last 12 months.
create function private.pause_days_left(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(0, 31 - coalesce(sum(
    extract(epoch from (least(p.ends_at, now() + interval '1 year') - p.starts_at)) / 86400
  ), 0))::integer
  from public.plus_pauses p
  where p.user_id = member and p.starts_at > now() - interval '1 year';
$$;

-- Pauses Plus for `days`: no swaps meanwhile, and the paid period moves on
-- by the same days.
create function private.pause_plus(days integer)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_plus_subscription();
  saved public.subscriptions;
begin
  if sub.id is null or sub.status <> 'active' then
    raise exception 'Not a Plus member' using errcode = 'insufficient_privilege';
  end if;
  if sub.paused_until > now() then
    raise exception 'Plus is paused' using errcode = 'check_violation';
  end if;
  if days is null or days < 1 or days > private.pause_days_left(sub.user_id) then
    raise exception 'Not enough pause days left' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.plus_swaps s where s.user_id = sub.user_id and s.status = 'booked') then
    raise exception 'A swap is already booked' using errcode = 'check_violation';
  end if;
  insert into public.plus_pauses (subscription_id, user_id, ends_at)
  values (sub.id, sub.user_id, now() + make_interval(days => days));
  update public.subscriptions set
    paused_until = now() + make_interval(days => days),
    current_period_end = current_period_end + make_interval(days => days)
  where id = sub.id
  returning * into saved;
  return saved;
end;
$$;

create function public.pause_plus(days integer)
returns public.subscriptions
language sql
security invoker
set search_path = ''
as $$ select private.pause_plus(days) $$;

-- Ends a pause early; the unused days are given back.
create function private.resume_plus()
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_plus_subscription();
  ended timestamptz;
  unused interval;
  saved public.subscriptions;
begin
  if sub.id is null or not (sub.paused_until > now()) then
    raise exception 'Plus isn''t paused' using errcode = 'check_violation';
  end if;
  -- A pause counts at least one day.
  select greatest(now(), p.starts_at + interval '1 day') into ended
  from public.plus_pauses p
  where p.subscription_id = sub.id and p.ends_at > now()
  order by p.starts_at desc limit 1;
  ended := least(coalesce(ended, now()), sub.paused_until);
  unused := sub.paused_until - ended;
  update public.plus_pauses set ends_at = ended
  where subscription_id = sub.id and ends_at > now();
  update public.subscriptions set
    paused_until = null,
    current_period_end = current_period_end - unused
  where id = sub.id
  returning * into saved;
  return saved;
end;
$$;

create function public.resume_plus()
returns public.subscriptions
language sql
security invoker
set search_path = ''
as $$ select private.resume_plus() $$;

-- Cancels at the end of the paid period (`keep` true undoes it).
create function private.cancel_plus(keep boolean default false)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_plus_subscription();
  saved public.subscriptions;
begin
  if sub.id is null then
    raise exception 'Not a Plus member' using errcode = 'insufficient_privilege';
  end if;
  update public.subscriptions set cancel_at_period_end = not keep, next_plan_id = null
  where id = sub.id
  returning * into saved;
  return saved;
end;
$$;

create function public.cancel_plus(keep boolean default false)
returns public.subscriptions
language sql
security invoker
set search_path = ''
as $$ select private.cancel_plus(keep) $$;

-- Changes plan from the next renewal (the current plan again clears it).
create function private.change_plus_plan(plan text)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_plus_subscription();
  saved public.subscriptions;
begin
  if sub.id is null then
    raise exception 'Not a Plus member' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.plans p where p.id = plan and p.audience = 'plus' and p.active) then
    raise exception 'Plan not available' using errcode = 'check_violation';
  end if;
  update public.subscriptions set
    next_plan_id = nullif(plan, sub.plan_id),
    cancel_at_period_end = false
  where id = sub.id
  returning * into saved;
  return saved;
end;
$$;

create function public.change_plus_plan(plan text)
returns public.subscriptions
language sql
security invoker
set search_path = ''
as $$ select private.change_plus_plan(plan) $$;

-- Support's Plus settings: places, how long invites stay open, the extra
-- home swap fee.
create function private.set_plus_settings(capacity integer, invite_hours integer, swap_fee bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if capacity is null or capacity < 0 or invite_hours is null or invite_hours not between 1 and 720
    or swap_fee is null or swap_fee < 0 then
    raise exception 'Invalid amount' using errcode = 'check_violation';
  end if;
  update public.store_settings
  set plus_capacity = capacity, plus_invite_hours = invite_hours, extra_swap_fee = swap_fee
  where true;
  perform private.invite_from_plus_waitlist();
end;
$$;

create function public.set_plus_settings(capacity integer, invite_hours integer, swap_fee bigint)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.set_plus_settings(capacity, invite_hours, swap_fee) $$;

-- Support invites someone from the waitlist now, whatever their place.
create function private.invite_to_plus(member uuid)
returns public.plus_waitlist
language plpgsql
security definer
set search_path = ''
as $$
declare
  hours integer := (select plus_invite_hours from public.store_settings limit 1);
  saved public.plus_waitlist;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.plus_waitlist
  set status = 'invited', invited_at = now(), invite_expires_at = now() + make_interval(hours => hours)
  where user_id = member and status in ('waiting', 'expired', 'left')
  returning * into saved;
  if saved.user_id is null then
    raise exception 'Not on the waitlist' using errcode = 'no_data_found';
  end if;
  perform private.notify(member, 'plus', 'plus_invite', jsonb_build_object('hours', hours), '/plus#join');
  return saved;
end;
$$;

create function public.invite_to_plus(member uuid)
returns public.plus_waitlist
language sql
security invoker
set search_path = ''
as $$ select private.invite_to_plus(member) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.plus_member_count() from public, anon;
revoke all on function private.plus_places_free() from public, anon;
revoke all on function private.plus_join_reason(uuid) from public, anon;
revoke all on function private.plus_status() from public;
revoke all on function private.set_plus_home(uuid, text, text) from public, anon;
revoke all on function private.join_plus_waitlist(text, text) from public, anon;
revoke all on function private.leave_plus_waitlist() from public, anon;
revoke all on function private.invite_from_plus_waitlist() from public, anon, authenticated;
revoke all on function private.on_plus_subscription() from public, anon, authenticated;
revoke all on function private.wishlist_position() from public, anon, authenticated;
revoke all on function private.reorder_saved(uuid[]) from public, anon;
revoke all on function private.next_area_day(uuid) from public, anon;
revoke all on function private.home_swaps_used(uuid) from public, anon;
revoke all on function private.hold_plus_copy(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.book_swap(uuid[], uuid[], text, public.order_payment_method) from public, anon;
revoke all on function private.cancel_swap(uuid) from public, anon;
revoke all on function private.complete_swap(uuid) from public, anon;
revoke all on function private.my_swap_terms() from public, anon;
revoke all on function private.my_plus_subscription() from public, anon;
revoke all on function private.pause_days_left(uuid) from public, anon;
revoke all on function private.pause_plus(integer) from public, anon;
revoke all on function private.resume_plus() from public, anon;
revoke all on function private.cancel_plus(boolean) from public, anon;
revoke all on function private.change_plus_plan(text) from public, anon;
revoke all on function private.set_plus_settings(integer, integer, bigint) from public, anon;
revoke all on function private.invite_to_plus(uuid) from public, anon;

revoke all on function public.plus_status() from public;
revoke all on function public.set_plus_home(uuid, text, text) from public, anon;
revoke all on function public.join_plus_waitlist(text, text) from public, anon;
revoke all on function public.leave_plus_waitlist() from public, anon;
revoke all on function public.run_plus_waitlist() from public, anon, authenticated;
revoke all on function public.reorder_saved(uuid[]) from public, anon;
revoke all on function public.book_swap(uuid[], uuid[], text, public.order_payment_method) from public, anon;
revoke all on function public.cancel_swap(uuid) from public, anon;
revoke all on function public.complete_swap(uuid) from public, anon;
revoke all on function public.my_swap_terms() from public, anon;
revoke all on function public.pause_plus(integer) from public, anon;
revoke all on function public.resume_plus() from public, anon;
revoke all on function public.cancel_plus(boolean) from public, anon;
revoke all on function public.change_plus_plan(text) from public, anon;
revoke all on function public.set_plus_settings(integer, integer, bigint) from public, anon;
revoke all on function public.invite_to_plus(uuid) from public, anon;

grant execute on function private.plus_member_count() to authenticated;
grant execute on function private.plus_places_free() to authenticated;
grant execute on function private.plus_join_reason(uuid) to authenticated;
grant execute on function private.plus_status() to anon, authenticated;
grant execute on function private.set_plus_home(uuid, text, text) to authenticated;
grant execute on function private.join_plus_waitlist(text, text) to authenticated;
grant execute on function private.leave_plus_waitlist() to authenticated;
grant execute on function private.reorder_saved(uuid[]) to authenticated;
grant execute on function private.next_area_day(uuid) to authenticated;
grant execute on function private.home_swaps_used(uuid) to authenticated;
grant execute on function private.book_swap(uuid[], uuid[], text, public.order_payment_method) to authenticated;
grant execute on function private.cancel_swap(uuid) to authenticated;
grant execute on function private.complete_swap(uuid) to authenticated;
grant execute on function private.my_swap_terms() to authenticated;
grant execute on function private.my_plus_subscription() to authenticated;
grant execute on function private.pause_days_left(uuid) to authenticated;
grant execute on function private.pause_plus(integer) to authenticated;
grant execute on function private.resume_plus() to authenticated;
grant execute on function private.cancel_plus(boolean) to authenticated;
grant execute on function private.change_plus_plan(text) to authenticated;
grant execute on function private.set_plus_settings(integer, integer, bigint) to authenticated;
grant execute on function private.invite_to_plus(uuid) to authenticated;

grant execute on function public.plus_status() to anon, authenticated;
grant execute on function public.set_plus_home(uuid, text, text) to authenticated;
grant execute on function public.join_plus_waitlist(text, text) to authenticated;
grant execute on function public.leave_plus_waitlist() to authenticated;
grant execute on function public.run_plus_waitlist() to service_role;
grant execute on function public.reorder_saved(uuid[]) to authenticated;
grant execute on function public.book_swap(uuid[], uuid[], text, public.order_payment_method) to authenticated;
grant execute on function public.cancel_swap(uuid) to authenticated;
grant execute on function public.complete_swap(uuid) to authenticated;
grant execute on function public.my_swap_terms() to authenticated;
grant execute on function public.pause_plus(integer) to authenticated;
grant execute on function public.resume_plus() to authenticated;
grant execute on function public.cancel_plus(boolean) to authenticated;
grant execute on function public.change_plus_plan(text) to authenticated;
grant execute on function public.set_plus_settings(integer, integer, bigint) to authenticated;
grant execute on function public.invite_to_plus(uuid) to authenticated;
