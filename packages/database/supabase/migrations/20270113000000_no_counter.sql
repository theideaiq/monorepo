-- The counter goes (owner decisions of 2026-10-28, part 2, section 4): it
-- was part of The IDEA Space. Plus swaps are home swaps only (1, 2 or 4 a
-- month by plan, 3,000 IQD for an extra one), so a swap's method is always
-- 'home'. Booked counter swaps are cancelled (held copies go back, items
-- going back stay at home, an unpaid order is cancelled) and past ones are
-- recorded as home swaps. `book_swap()` keeps its signature (`method`
-- defaults to 'home') and refuses anything else.

update public.rentals r set status = 'cancelled'
from public.plus_swaps s
where s.method = 'counter' and s.status = 'booked'
  and r.swap_id = s.id and r.status = 'requested';
update public.rentals r set return_swap_id = null
from public.plus_swaps s
where s.method = 'counter' and s.status = 'booked' and r.return_swap_id = s.id;
update public.orders o set status = 'cancelled'
from public.plus_swaps s
where s.method = 'counter' and s.status = 'booked'
  and o.id = s.order_id and o.status in ('pending', 'confirmed');
update public.plus_swaps set status = 'cancelled'
where method = 'counter' and status = 'booked';
update public.plus_swaps set method = 'home' where method = 'counter';

alter table public.plus_swaps drop constraint plus_swaps_method_check;
alter table public.plus_swaps add constraint plus_swaps_method_check check (method = 'home');

comment on table public.plus_swaps is
  'A Plus member''s home swap: what goes back and what comes next, on the area''s delivery day.';
comment on column public.plans.home_swaps is
  'Home swaps included each month (The IDEA Plus); an extra one costs store_settings.extra_swap_fee.';

-- A Plus member books a home swap: rentals at home (ids) go back, products
-- (in order) come next, on the area's delivery day.
create or replace function private.book_swap(
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
  if method is distinct from 'home' or (giving = 0 and taking = 0) then
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
  select * into home from public.plus_homes where user_id = caller;
  if home.user_id is null then
    raise exception 'Add your Plus address first' using errcode = 'check_violation';
  end if;
  -- The first delivery to a member with nothing at home is free.
  counts := holding > 0;
  extra := counts and private.home_swaps_used(caller) >= coalesce(plan.home_swaps, 0);
  if extra and payment_method = 'cash_on_delivery' and not settings.cash_on_delivery_enabled then
    raise exception 'Cash payment is not available' using errcode = 'check_violation';
  end if;

  insert into public.plus_swaps (user_id, method, area_id, scheduled_for, counted, fee)
  values (
    caller, method, home.area_id,
    private.next_area_day(home.area_id),
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

comment on function public.check_in_rsvp(uuid, uuid) is
  'Checks a member in at an event they RSVP''d for (editors and support) and pays the 10-Bulb check-in bonus once.';
