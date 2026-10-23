-- IDEA Plus: a membership for renting games, books and movies.
--
-- Rental items are products with kind = 'rental' (stock_count = copies on
-- hand). Members with an active Plus subscription request items with
-- `request_rental()`, up to their plan's `rental_slots` at a time; support
-- staff deliver them, set the due date and mark them returned. Nothing is
-- charged per rental: the membership pays for it.

create type public.rental_status as enum (
  'requested', 'active', 'returned', 'overdue', 'cancelled'
);

create table public.rentals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  -- Snapshots, so history survives catalog edits.
  name_ar text not null,
  name_en text not null,
  status public.rental_status not null default 'requested',
  requested_at timestamptz not null default now(),
  started_at timestamptz,
  due_at timestamptz,
  returned_at timestamptz,
  staff_note text check (char_length(staff_note) <= 2000),
  updated_at timestamptz not null default now(),
  check (due_at is null or started_at is null or due_at > started_at)
);

create index rentals_user_id_idx on public.rentals (user_id, requested_at desc);
create index rentals_status_idx on public.rentals (status, due_at);

create trigger set_updated_at before update on public.rentals
  for each row execute function private.set_updated_at();

-- Rental slots of the caller's live Plus membership (0 without one).
create function private.plus_rental_slots(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(p.rental_slots), 0)
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = member
    and s.status in ('active', 'past_due')
    and p.audience = 'plus'
    and (s.current_period_end is null or s.current_period_end > now());
$$;

create function public.request_rental(rental_product uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  open_rentals integer;
  created public.rentals;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select * into item from public.products
  where id = rental_product and kind = 'rental' and status = 'active'
  for update;

  if not found then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  select count(*) into open_rentals from public.rentals
  where user_id = caller and status in ('requested', 'active', 'overdue');

  if open_rentals >= private.plus_rental_slots(caller) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  if item.stock_count < 1 then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  update public.products set stock_count = stock_count - 1 where id = item.id;

  insert into public.rentals (user_id, product_id, name_ar, name_en)
  values (caller, item.id, item.name_ar, item.name_en)
  returning * into created;

  return created;
end;
$$;

-- Members cancel requests that haven't been delivered yet.
create function public.cancel_rental(rental uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- The status trigger puts the copy back in stock.
  update public.rentals set status = 'cancelled'
  where id = rental and user_id = (select auth.uid()) and status = 'requested';

  if not found then
    raise exception 'Rental not found or already delivered' using errcode = 'no_data_found';
  end if;
end;
$$;

-- Keeps stock and timestamps consistent when staff change a rental's status.
create function private.on_rental_status()
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
    or (old.status = 'active' and new.status in ('returned', 'overdue'))
    or (old.status = 'overdue' and new.status in ('returned', 'active'))
  ) then
    raise exception 'Rental status can''t change from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'active' and old.status = 'requested' then
    new.started_at := coalesce(new.started_at, now());
    new.due_at := coalesce(new.due_at, new.started_at + interval '14 days');
  end if;

  if new.status in ('returned', 'cancelled') then
    if new.status = 'returned' then
      new.returned_at := coalesce(new.returned_at, now());
    end if;
    update public.products set stock_count = stock_count + 1 where id = new.product_id;
  end if;

  return new;
end;
$$;

create trigger on_rental_status before update of status on public.rentals
  for each row execute function private.on_rental_status();

-- Daily job (apps/api cron): flags rentals past their due date.
create function public.mark_overdue_rentals()
returns integer
language sql
security definer
set search_path = ''
as $$
  with updated as (
    update public.rentals set status = 'overdue'
    where status = 'active' and due_at < now()
    returning 1
  )
  select count(*)::integer from updated;
$$;

-- ── Row Level Security ──────────────────────────────────────────────────────

alter table public.rentals enable row level security;

create policy "Members see their rentals; support sees all"
  on public.rentals for select to authenticated
  using (user_id = (select auth.uid()) or private.has_staff_role('{support}'));

create policy "Support manages rentals"
  on public.rentals for update to authenticated
  using (private.has_staff_role('{support}'))
  with check (private.has_staff_role('{support}'));

create trigger audit_rentals after update on public.rentals
  for each row execute function private.audit_change();

revoke all on public.rentals from anon, authenticated;
grant select on public.rentals to authenticated;
grant update (status, due_at, staff_note) on public.rentals to authenticated;
grant all on public.rentals to service_role;

revoke all on function private.plus_rental_slots(uuid) from public, anon, authenticated;
revoke all on function private.on_rental_status() from public, anon, authenticated;
grant execute on function private.plus_rental_slots(uuid) to service_role;

revoke all on function public.request_rental(uuid) from public, anon;
revoke all on function public.cancel_rental(uuid) from public, anon;
revoke all on function public.mark_overdue_rentals() from public, anon, authenticated;
grant execute on function public.request_rental(uuid) to authenticated;
grant execute on function public.cancel_rental(uuid) to authenticated;
grant execute on function public.mark_overdue_rentals() to service_role;

-- How many more items the caller can rent right now.
create function public.my_rental_allowance()
returns table (slots integer, in_use integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.plus_rental_slots((select auth.uid())),
    (
      select count(*)::integer from public.rentals
      where user_id = (select auth.uid()) and status in ('requested', 'active', 'overdue')
    );
$$;

revoke all on function public.my_rental_allowance() from public, anon;
grant execute on function public.my_rental_allowance() to authenticated;
