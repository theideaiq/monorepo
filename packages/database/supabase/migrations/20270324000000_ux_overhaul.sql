-- The UX overhaul (owner, 30 Oct; docs/program/ux-overhaul.md).
--
-- * Plus availability in words: `plus_availability(product)` is `now` (a
--   copy for rent is on the shelf), `short` (every copy is out, no more
--   people queued than copies), `long` (more queued than copies) or
--   `coming` (in Plus, no copy for rent yet).
-- * Staff's Demand view: `staff_plus_demand()` lists the queued products
--   with their copies and a suggested number to buy (one copy for every
--   three people queued).
-- * Family: guardians and Plus Duo become one family. A manager (the Plus
--   holder, or a guardian) adds kids under 13 as profiles in their own Pass
--   (`family_profiles`, no sign-in) and queues items for them; a linked
--   teen (13–17, own Pass, today's guardian link) asks for an item
--   (`ask_family`), and the guardian approves it into their queue
--   (`decide_family_request`). Queue rows say who an item is for
--   (`rental_queue_items.for_profile`, `for_user`). 18+ items are never
--   queued for a kid.
-- * One-off rentals are switched off: the cart takes no rent lines (any
--   left are removed) and the website's functions for renting one item,
--   renting several together and textbook terms are dropped. The internals
--   checkout still references stay, unused.

-- ── Plus availability ──────────────────────────────────────────────────────

create function private.plus_availability(product uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  with item as (
    select p.id, p.rentable from public.products p
    where p.id = product and p.status = 'active'
  ), copies as (
    select
      count(*) filter (where s.status = 'available') as available,
      count(*) as total
    from public.stock_items s
    join public.product_variants v on v.id = s.variant_id
    where s.product_id = product and v.active and s.purpose = 'rental'
      and s.status in ('available', 'reserved', 'rented', 'repair')
  ), queued as (
    select count(*) as people from public.rental_queue_items q where q.product_id = product
  )
  select case
    when not item.rentable then null
    when copies.available > 0 then 'now'
    when copies.total = 0 then 'coming'
    when queued.people <= copies.total then 'short'
    else 'long'
  end
  from item, copies, queued
$$;

create function public.plus_availability(product uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select private.plus_availability(product) $$;

comment on function public.plus_availability(uuid) is
  'In Plus, in words: now (a copy is on the shelf), short (all out, no more queued than copies), long (more queued than copies), coming (no copy yet); null when not in Plus.';

revoke all on function private.plus_availability(uuid) from public;
revoke all on function public.plus_availability(uuid) from public;
grant execute on function private.plus_availability(uuid) to anon, authenticated;
grant execute on function public.plus_availability(uuid) to anon, authenticated;

-- ── Staff: Plus demand ─────────────────────────────────────────────────────

create function private.staff_plus_demand()
returns table (
  product_id uuid,
  slug text,
  name_en text,
  name_ar text,
  images text[],
  queued integer,
  copies integer,
  available integer,
  rented_out integer,
  suggested integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{editor,support,finance}') then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;
  return query
  with queued as (
    select q.product_id, count(*)::integer as people
    from public.rental_queue_items q
    group by q.product_id
  ), copies as (
    select s.product_id,
      count(*)::integer as total,
      (count(*) filter (where s.status = 'available'))::integer as available
    from public.stock_items s
    where s.purpose = 'rental' and s.status in ('available', 'reserved', 'rented', 'repair')
    group by s.product_id
  )
  select p.id, p.slug, p.name_en, p.name_ar, p.images,
    q.people,
    coalesce(c.total, 0),
    coalesce(c.available, 0),
    coalesce(c.total, 0) - coalesce(c.available, 0),
    greatest(ceil(q.people / 3.0)::integer - coalesce(c.total, 0), 0)
  from queued q
  join public.products p on p.id = q.product_id
  left join copies c on c.product_id = q.product_id
  order by greatest(ceil(q.people / 3.0)::integer - coalesce(c.total, 0), 0) desc, q.people desc, p.name_en;
end;
$$;

create function public.staff_plus_demand()
returns table (
  product_id uuid,
  slug text,
  name_en text,
  name_ar text,
  images text[],
  queued integer,
  copies integer,
  available integer,
  rented_out integer,
  suggested integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.staff_plus_demand() $$;

revoke all on function private.staff_plus_demand() from public, anon;
revoke all on function public.staff_plus_demand() from public, anon;
grant execute on function private.staff_plus_demand() to authenticated;
grant execute on function public.staff_plus_demand() to authenticated;

-- ── Family ─────────────────────────────────────────────────────────────────

create table public.family_profiles (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  birthday date not null,
  created_at timestamptz not null default now()
);

comment on table public.family_profiles is
  'A kid under 13 in a manager''s Pass: a name and birthday, no sign-in. Written only through the family functions.';

create index family_profiles_manager_idx on public.family_profiles (manager_id);

alter table public.family_profiles enable row level security;

create policy "Managers read their kids' profiles" on public.family_profiles
  for select to authenticated
  using (manager_id = (select auth.uid()) or private.has_staff_role('{support}'));

create table public.family_requests (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references auth.users (id) on delete cascade,
  manager_id uuid not null references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

comment on table public.family_requests is
  'A linked teen asks their guardian for an item; approved, it joins the guardian''s Plus queue for them. Written only through the family functions.';

create unique index family_requests_pending_key on public.family_requests (teen_id, product_id)
  where status = 'pending';
create index family_requests_manager_idx on public.family_requests (manager_id, status);
create index family_requests_product_idx on public.family_requests (product_id);

alter table public.family_requests enable row level security;

create policy "Teens and their guardians read requests" on public.family_requests
  for select to authenticated
  using (
    teen_id = (select auth.uid()) or manager_id = (select auth.uid())
    or private.has_staff_role('{support}')
  );

alter table public.rental_queue_items
  add column for_profile uuid references public.family_profiles (id) on delete set null,
  add column for_user uuid references auth.users (id) on delete set null;

comment on column public.rental_queue_items.for_profile is 'The kid''s profile this item was queued for.';
comment on column public.rental_queue_items.for_user is 'The linked teen this item was approved for.';

create index rental_queue_items_for_profile_idx on public.rental_queue_items (for_profile);
create index rental_queue_items_for_user_idx on public.rental_queue_items (for_user);

-- An age in whole years on a Baghdad day.
create function private.years_since(born date)
returns integer
language sql
stable
set search_path = ''
as $$
  select extract(year from age((now() at time zone 'Asia/Baghdad')::date, born))::integer
$$;

revoke all on function private.years_since(date) from public, anon, authenticated;

create function private.add_family_profile(name text, birthday date)
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
  if private.is_minor(caller) then
    raise exception 'A Family is managed by an adult' using errcode = 'insufficient_privilege';
  end if;
  if birthday is null or birthday > (now() at time zone 'Asia/Baghdad')::date
    or private.years_since(birthday) >= 13 then
    raise exception 'Kids'' profiles are for under 13s; teens use their own Pass' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.family_profiles f where f.manager_id = caller) >= 6 then
    raise exception 'At most 6 kids'' profiles' using errcode = 'check_violation';
  end if;
  insert into public.family_profiles (manager_id, name, birthday)
  values (caller, trim(name), birthday)
  returning id into created;
  return created;
end;
$$;

create function public.add_family_profile(name text, birthday date)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.add_family_profile(name, birthday) $$;

create function private.remove_family_profile(profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.family_profiles f
  where f.id = profile and f.manager_id = (select auth.uid());
  if not found then
    raise exception 'Profile not found' using errcode = 'no_data_found';
  end if;
end;
$$;

create function public.remove_family_profile(profile uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.remove_family_profile(profile) $$;

-- Puts an item in the caller's queue for one of their kids' profiles.
create function private.queue_add_for_profile(product uuid, profile uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  kid public.family_profiles;
  rating smallint;
begin
  select * into kid from public.family_profiles f where f.id = profile and f.manager_id = caller;
  if kid.id is null then
    raise exception 'Profile not found' using errcode = 'no_data_found';
  end if;
  select p.age_rating into rating from public.products p where p.id = product;
  if rating is not null and rating > private.years_since(kid.birthday) then
    raise exception 'Not for this age' using errcode = 'check_violation';
  end if;
  perform private.queue_add(product);
  update public.rental_queue_items q set for_profile = profile, for_user = null
  where q.user_id = caller and q.product_id = product;
end;
$$;

create function public.queue_add_for_profile(product uuid, profile uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.queue_add_for_profile(product, profile) $$;

-- A linked teen asks their guardian for an item.
create function private.ask_family(product uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  guardian uuid;
  item public.products;
  created uuid;
begin
  select g.guardian_id into guardian from public.guardian_links g
  where g.teen_id = caller and g.status = 'active';
  if guardian is null then
    raise exception 'Ask a guardian to link with your Pass first' using errcode = 'insufficient_privilege';
  end if;
  select * into item from public.products p
  where p.id = product and p.status = 'active' and p.rentable;
  if item.id is null then
    raise exception 'Not in Plus' using errcode = 'check_violation';
  end if;
  if item.age_rating = 18 then
    raise exception 'Not available under 18' using errcode = 'check_violation';
  end if;
  insert into public.family_requests (teen_id, manager_id, product_id)
  values (caller, guardian, product)
  on conflict (teen_id, product_id) where status = 'pending' do nothing
  returning id into created;
  if created is not null then
    insert into public.notifications (user_id, kind, event, data, link)
    values (
      guardian, 'plus', 'family_request',
      jsonb_build_object('request_id', created, 'product_id', item.id,
        'name_en', item.name_en, 'name_ar', item.name_ar,
        'teen', (select p.full_name from public.profiles p where p.id = caller)),
      '/pass/family'
    );
  end if;
  return created;
end;
$$;

create function public.ask_family(product uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.ask_family(product) $$;

-- The guardian approves (into their queue, for the teen) or declines.
create function private.decide_family_request(request uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  asked public.family_requests;
begin
  select * into asked from public.family_requests r
  where r.id = request and r.manager_id = caller and r.status = 'pending'
  for update;
  if asked.id is null then
    raise exception 'Request not found' using errcode = 'no_data_found';
  end if;
  if approve then
    perform private.queue_add(asked.product_id);
    update public.rental_queue_items q set for_user = asked.teen_id, for_profile = null
    where q.user_id = caller and q.product_id = asked.product_id;
  end if;
  update public.family_requests r
  set status = case when approve then 'approved' else 'declined' end, decided_at = now()
  where r.id = asked.id;
  insert into public.notifications (user_id, kind, event, data, link)
  select asked.teen_id, 'plus',
    case when approve then 'family_request_approved' else 'family_request_declined' end,
    jsonb_build_object('product_id', p.id, 'name_en', p.name_en, 'name_ar', p.name_ar),
    '/store/' || p.slug
  from public.products p where p.id = asked.product_id;
end;
$$;

create function public.decide_family_request(request uuid, approve boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.decide_family_request(request, approve) $$;

revoke all on function private.add_family_profile(text, date) from public, anon;
revoke all on function public.add_family_profile(text, date) from public, anon;
grant execute on function private.add_family_profile(text, date) to authenticated;
grant execute on function public.add_family_profile(text, date) to authenticated;
revoke all on function private.remove_family_profile(uuid) from public, anon;
revoke all on function public.remove_family_profile(uuid) from public, anon;
grant execute on function private.remove_family_profile(uuid) to authenticated;
grant execute on function public.remove_family_profile(uuid) to authenticated;
revoke all on function private.queue_add_for_profile(uuid, uuid) from public, anon;
revoke all on function public.queue_add_for_profile(uuid, uuid) from public, anon;
grant execute on function private.queue_add_for_profile(uuid, uuid) to authenticated;
grant execute on function public.queue_add_for_profile(uuid, uuid) to authenticated;
revoke all on function private.ask_family(uuid) from public, anon;
revoke all on function public.ask_family(uuid) from public, anon;
grant execute on function private.ask_family(uuid) to authenticated;
grant execute on function public.ask_family(uuid) to authenticated;
revoke all on function private.decide_family_request(uuid, boolean) from public, anon;
revoke all on function public.decide_family_request(uuid, boolean) from public, anon;
grant execute on function private.decide_family_request(uuid, boolean) to authenticated;
grant execute on function public.decide_family_request(uuid, boolean) to authenticated;

-- ── One-off rentals off ────────────────────────────────────────────────────

delete from public.cart_items where purpose = 'rent';

create or replace function private.check_cart_rent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.purpose = 'rent' then
    raise exception 'Renting one item is gone: add it to your Plus queue' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop function public.create_rental_order(uuid, jsonb, public.order_fulfilment, public.order_payment_method, uuid, uuid);
drop function public.create_rentals_order(jsonb, jsonb, public.order_payment_method, uuid);
drop function public.rental_quote(uuid, uuid);
drop function public.rentals_quote(jsonb, uuid);
drop function public.rental_term();
drop function public.set_rental_deposit_rate(numeric);
