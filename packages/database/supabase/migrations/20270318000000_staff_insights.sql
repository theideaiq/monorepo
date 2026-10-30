-- Staff insights (brief section 24): searches that found nothing, and the
-- key numbers on Staff's home page.
--
-- * `search_misses`: each search term (folded like `search_products`) that
--   returned no product, with how often and when it was last seen. The
--   website's search page records it (`record_search_miss`, anyone); Staff
--   → Catalog lists and clears them (editors and admins).
-- * `cart_starts`: who put something in the cart each week (one row per
--   person and week, from a trigger on `cart_items`), so conversion from
--   cart to paid order can be counted although cart lines are deleted at
--   checkout.
-- * `staff_metrics(weeks)`: per week (Monday, Baghdad time), orders placed,
--   orders paid, new Passes, Plus sign-ups and cancellations, and the
--   people who started a cart. Any staff member.

-- ── Searches that found nothing ────────────────────────────────────────────

create table public.search_misses (
  term text primary key check (char_length(term) between 2 and 80),
  searches integer not null default 1 check (searches > 0),
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

comment on table public.search_misses is
  'Search terms that returned no product (folded), how often and when last seen; for Staff → Catalog.';

alter table public.search_misses enable row level security;

create policy "Editors read searches that found nothing" on public.search_misses
  for select to authenticated
  using ((select private.has_staff_role('{admin,editor}'::public.staff_role[])));

create policy "Editors clear searches that found nothing" on public.search_misses
  for delete to authenticated
  using ((select private.has_staff_role('{admin,editor}'::public.staff_role[])));

revoke all on public.search_misses from anon, authenticated;
grant select, delete on public.search_misses to authenticated;

create index search_misses_last_seen_idx on public.search_misses (last_seen desc);

-- Counts a search that found no product. Terms are folded the way search
-- matches them; very short or long ones are ignored.
create function private.record_search_miss(term text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  folded text := left(private.normalize_search(trim(coalesce(term, ''))), 80);
begin
  if char_length(folded) < 2 then
    return;
  end if;
  insert into public.search_misses (term) values (folded)
  on conflict on constraint search_misses_pkey do update
    set searches = public.search_misses.searches + 1,
        last_seen = now();
end;
$$;

create function public.record_search_miss(term text)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$ select private.record_search_miss(term) $$;

comment on function public.record_search_miss(text) is
  'Counts a search term that returned no product (the website''s search page).';

-- ── Carts started ──────────────────────────────────────────────────────────

create table public.cart_starts (
  user_id uuid not null references auth.users (id) on delete cascade,
  week date not null,
  primary key (user_id, week)
);

comment on table public.cart_starts is
  'Who put something in the cart each week (Monday, Baghdad time), for cart-to-paid conversion.';

alter table public.cart_starts enable row level security;

create policy "No client access" on public.cart_starts
  as restrictive for all to anon, authenticated
  using (false);

revoke all on public.cart_starts from anon, authenticated;

create index cart_starts_week_idx on public.cart_starts (week);

-- The Monday of `at`'s week in Baghdad.
create function private.baghdad_week(at timestamptz)
returns date
language sql
stable
set search_path = ''
as $$ select date_trunc('week', at at time zone 'Asia/Baghdad')::date $$;

create function private.note_cart_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.cart_starts (user_id, week)
  values (new.user_id, private.baghdad_week(new.created_at))
  on conflict do nothing;
  return null;
end;
$$;

create trigger note_cart_start
  after insert on public.cart_items
  for each row execute function private.note_cart_start();

insert into public.cart_starts (user_id, week)
select distinct c.user_id, private.baghdad_week(c.created_at)
from public.cart_items c
on conflict do nothing;

-- ── Key numbers ────────────────────────────────────────────────────────────

create function private.staff_metrics(weeks integer default 8)
returns table (
  week date,
  orders integer,
  paid_orders integer,
  new_passes integer,
  plus_joins integer,
  plus_cancellations integer,
  carts integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{admin,editor,finance,marketing,support}'::public.staff_role[]) then
    raise exception 'Staff only' using errcode = 'insufficient_privilege';
  end if;

  return query
  with span as (
    select generate_series(
      private.baghdad_week(now()) - (least(greatest(coalesce(weeks, 8), 1), 52) - 1) * 7,
      private.baghdad_week(now()),
      interval '7 days'
    )::date as week
  ),
  plus as (
    select s.created_at, s.updated_at, s.status, s.cancel_at_period_end
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.audience = 'plus' and s.user_id is not null
  )
  select
    span.week,
    (select count(*)::integer from public.orders o
      where private.baghdad_week(o.created_at) = span.week),
    (select count(*)::integer from public.orders o
      where private.baghdad_week(o.created_at) = span.week
        and o.status in ('paid', 'processing', 'shipped', 'delivered')),
    (select count(*)::integer from public.profiles p
      where private.baghdad_week(p.created_at) = span.week),
    (select count(*)::integer from plus
      where private.baghdad_week(plus.created_at) = span.week
        and plus.status <> 'incomplete'),
    (select count(*)::integer from plus
      where private.baghdad_week(plus.updated_at) = span.week
        and (plus.status = 'canceled' or plus.cancel_at_period_end)),
    (select count(*)::integer from public.cart_starts c where c.week = span.week)
  from span
  order by span.week desc;
end;
$$;

create function public.staff_metrics(weeks integer default 8)
returns table (
  week date,
  orders integer,
  paid_orders integer,
  new_passes integer,
  plus_joins integer,
  plus_cancellations integer,
  carts integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.staff_metrics(weeks) $$;

comment on function public.staff_metrics(integer) is
  'Staff''s key numbers per week (Monday, Baghdad time): orders placed and paid, new Passes, Plus sign-ups and cancellations, carts started.';

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.record_search_miss(text) from public;
grant execute on function private.record_search_miss(text) to anon, authenticated;
revoke all on function public.record_search_miss(text) from public;
grant execute on function public.record_search_miss(text) to anon, authenticated;

revoke all on function private.note_cart_start() from public, anon, authenticated;

revoke all on function private.staff_metrics(integer) from public, anon;
grant execute on function private.staff_metrics(integer) to authenticated;
revoke all on function public.staff_metrics(integer) from public, anon;
grant execute on function public.staff_metrics(integer) to authenticated;
