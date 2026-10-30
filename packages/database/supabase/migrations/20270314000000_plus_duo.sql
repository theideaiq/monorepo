-- Plus Duo (owner's master brief, step 14.6, section 17): a plan holder
-- invites one more Pass.
--
-- * Plans: Glow Duo 20,750 · Shine Duo 31,750 · Blaze Duo 55,750 IQD a
--   month, yearly at 10 months for 12, and 20% off when the plan holder is
--   a verified student (`student_of`, as for the other plans). `plans.duo`
--   marks them; tiers, slots and home swaps are the tier's own. They start
--   switched off; the code that invites the second person turns them on.
-- * `plus_members`: the people on a Duo subscription, the holder and the
--   partner (the second person), with the invite, invited and joined
--   dates, the guardian's approval for a 13–17-year-old partner, the end
--   of a removed partner's place and how swaps share the two queues.
-- * The partner has no subscription of their own: `plus_tier`,
--   `member_plan` and `plus_rental_slots` also count a live Duo the person
--   is the partner on, so the Bulbs rate, survey credits, early access,
--   Plus prices, partner perks and the Pass card badge are theirs too.
--   The partner doesn't take a Plus place.
-- * Shared: the plan's rental slots and home swaps are counted across the
--   household (holder and partner), and home swaps go to the holder's
--   Plus address. Each keeps their own queue; `household_queue` lists both,
--   alternating by default, or the holder's or the partner's first.
-- * Ending: the partner can leave at any time; the holder can remove them
--   from the next renewal once their rentals are back. Whatever the partner
--   still has at the shared address stays with the holder.
--   `end_duo_partners` (the API's cron) ends places that are over.

-- ── Plans ──────────────────────────────────────────────────────────────────

alter table public.plans add column duo boolean not null default false;

comment on column public.plans.duo is
  'Plus Duo: the holder invites one more Pass, who shares the rental slots and home swaps.';

insert into public.plans (
  id, name, name_ar, description, amount, currency, billing_interval, active, audience, rental_slots,
  features_ar, features_en, position, tier, bulb_rate, free_delivery, home_swaps, duo
)
select
  p.id || '-duo', p.name || ' Duo', 'ايديا پلص ' || initcap(split_part(p.id, '-', 2)) || ' Duo',
  p.description, d.amount, p.currency, p.billing_interval, false, p.audience, p.rental_slots,
  'الپلص لپاس ثانٍ، يتشارك الأغراض والتبديلات'::text || p.features_ar,
  'Plus for a second Pass, sharing items and swaps'::text || p.features_en,
  p.position + 3, p.tier, p.bulb_rate, p.free_delivery, p.home_swaps, true
from public.plans p
join (values ('plus-glow', 20750), ('plus-shine', 31750), ('plus-blaze', 55750)) d (id, amount)
  on d.id = p.id
on conflict (id) do nothing;

-- Yearly: 10 months for 12.
insert into public.plans (
  id, name, name_ar, description, amount, currency, billing_interval, active, audience, rental_slots,
  features_ar, features_en, position, tier, bulb_rate, free_delivery, home_swaps, duo
)
select
  replace(y.id, '-year', '-duo-year'), m.name, m.name_ar, m.description, m.amount * 10, m.currency,
  y.billing_interval, m.active, m.audience, m.rental_slots,
  m.features_ar || 'ادفع 10 أشهر واحصل على 12'::text, m.features_en || 'Pay 10 months, get 12'::text,
  y.position + 3, m.tier, m.bulb_rate, m.free_delivery, m.home_swaps, true
from public.plans y
join public.plans m on m.id = replace(y.id, '-year', '-duo')
where y.id in ('plus-glow-year', 'plus-shine-year', 'plus-blaze-year')
on conflict (id) do nothing;

-- Students: 20% off, kept on a …750 ending, for a verified student holder.
insert into public.plans (
  id, name, name_ar, description, amount, currency, billing_interval, active, audience, rental_slots,
  features_ar, features_en, position, tier, bulb_rate, free_delivery, home_swaps, student_of, duo
)
select
  p.id || '-student', p.name || ' (students)', p.name_ar || ' (للطلاب)', p.description,
  (floor((p.amount * 0.8 - 750) / 1000) * 1000 + 750)::bigint,
  p.currency, p.billing_interval, p.active, p.audience, p.rental_slots,
  p.features_ar, p.features_en, p.position + 20, p.tier, p.bulb_rate, p.free_delivery, p.home_swaps,
  p.id, true
from public.plans p
where p.id in ('plus-glow-duo', 'plus-shine-duo', 'plus-blaze-duo')
on conflict (id) do nothing;

-- ── The people on a Duo ────────────────────────────────────────────────────

create table public.plus_members (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  -- Empty while a partner's invite is open.
  user_id uuid references auth.users (id) on delete cascade,
  role text not null check (role in ('holder', 'partner')),
  invite_token text unique,
  invite_expires_at timestamptz,
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  -- A removed partner's place ends at the next renewal.
  ends_at timestamptz,
  left_at timestamptz,
  end_reason text check (end_reason in ('left', 'removed', 'plan_ended', 'guardian_declined')),
  -- A 13–17-year-old partner's guardian approves the place.
  guardian_id uuid references auth.users (id) on delete set null,
  guardian_status text check (guardian_status in ('pending', 'approved', 'declined')),
  -- On the holder's row: how swaps share the two queues.
  swap_order text not null default 'alternate' check (swap_order in ('alternate', 'holder', 'partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role = 'partner' or (invite_token is null and guardian_status is null)),
  check (role = 'holder' or user_id is not null or invite_token is not null),
  check (joined_at is null or user_id is not null)
);

comment on table public.plus_members is
  'The holder and the partner of a Plus Duo subscription. Written only by functions.';

create unique index plus_members_holder_idx on public.plus_members (subscription_id)
  where role = 'holder';
-- One partner (invited or joined) per Duo, and one Duo place per person.
create unique index plus_members_partner_idx on public.plus_members (subscription_id)
  where role = 'partner' and left_at is null;
create unique index plus_members_user_partner_idx on public.plus_members (user_id)
  where role = 'partner' and left_at is null;
create index plus_members_user_idx on public.plus_members (user_id);
create index plus_members_guardian_idx on public.plus_members (guardian_id);

create trigger set_updated_at before update on public.plus_members
  for each row execute function private.set_updated_at();

alter table public.plus_members enable row level security;

-- The subscriptions a person is on: their own and the Duo they're the
-- partner on (invited or joined, until they leave).
create function private.duo_subscription_ids(member uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.subscriptions s where s.user_id = member
  union
  select m.subscription_id from public.plus_members m
  where m.user_id = member and m.role = 'partner' and m.left_at is null;
$$;

revoke all on function private.duo_subscription_ids(uuid) from public, anon;
grant execute on function private.duo_subscription_ids(uuid) to authenticated;

create policy "Duo members, their guardians and staff see the rows" on public.plus_members
  for select to authenticated using (
    user_id = (select auth.uid())
    or guardian_id = (select auth.uid())
    or subscription_id in (select private.duo_subscription_ids((select auth.uid())))
    or (select private.is_staff())
  );

revoke all on public.plus_members from anon, authenticated;
grant select on public.plus_members to authenticated;
grant all on public.plus_members to service_role;

-- ── Who has Plus ───────────────────────────────────────────────────────────

-- The live Duo subscription a person is the partner on: joined, approved
-- by their guardian when they're 13–17, and not past the end of a removal.
create function private.duo_partner_subscription(member uuid)
returns public.subscriptions
language sql
stable
security definer
set search_path = ''
as $$
  select s.*
  from public.plus_members m
  join public.subscriptions s on s.id = m.subscription_id
  join public.plans p on p.id = s.plan_id
  where m.user_id = member and m.role = 'partner'
    and m.joined_at is not null and m.left_at is null
    and (m.ends_at is null or m.ends_at > now())
    and coalesce(m.guardian_status, 'approved') = 'approved'
    and s.status in ('active', 'past_due') and p.audience = 'plus' and p.duo
    and (s.current_period_end is null or s.current_period_end > now())
  limit 1;
$$;

revoke all on function private.duo_partner_subscription(uuid) from public, anon, authenticated;
grant execute on function private.duo_partner_subscription(uuid) to service_role;

-- The Plus plans a person has: their own live subscriptions' and the Duo
-- they share.
create function private.plus_plans_of(member uuid)
returns setof public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.user_id = member
    and s.status in ('active', 'past_due')
    and p.audience = 'plus'
    and (s.current_period_end is null or s.current_period_end > now())
  union all
  select p.* from public.plans p
  where p.id = (private.duo_partner_subscription(member)).plan_id;
$$;

revoke all on function private.plus_plans_of(uuid) from public, anon, authenticated;
grant execute on function private.plus_plans_of(uuid) to service_role;

create or replace function private.plus_tier(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(p.tier), 0) from private.plus_plans_of(member) p;
$$;

create or replace function private.member_plan(member uuid)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from private.plus_plans_of(member) p
  order by p.tier desc nulls last, p.amount desc
  limit 1;
$$;

create or replace function private.plus_rental_slots(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(p.rental_slots), 0) from private.plus_plans_of(member) p;
$$;

-- ── The household ──────────────────────────────────────────────────────────

-- Whose Plus address and subscription a person's swaps use: the holder of
-- the Duo they're the partner on, or themselves.
create function private.plus_holder(member uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select s.user_id
      from public.plus_members m
      join public.subscriptions s on s.id = m.subscription_id
      where m.user_id = member and m.role = 'partner'
        and m.joined_at is not null and m.left_at is null
      limit 1
    ),
    member
  );
$$;

-- The holder and the partner (until they leave): they share the rental
-- slots and home swaps.
create function private.plus_household(member uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array[h.id] || coalesce(array(
    select m.user_id
    from public.plus_members m
    join public.subscriptions s on s.id = m.subscription_id
    where s.user_id = h.id and m.role = 'partner'
      and m.joined_at is not null and m.left_at is null
  ), '{}')
  from (select private.plus_holder(member) as id) h;
$$;

revoke all on function private.plus_holder(uuid) from public, anon, authenticated;
revoke all on function private.plus_household(uuid) from public, anon, authenticated;
grant execute on function private.plus_holder(uuid) to service_role;
grant execute on function private.plus_household(uuid) to service_role;

create or replace function private.home_swaps_used(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.plus_swaps s
  where s.user_id = any (private.plus_household(member)) and s.counted and s.status <> 'cancelled'
    and date_trunc('month', s.created_at at time zone 'Asia/Baghdad')
      = date_trunc('month', now() at time zone 'Asia/Baghdad');
$$;

create or replace function private.my_rental_allowance()
returns table (slots integer, in_use integer, tier integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.plus_rental_slots((select auth.uid())),
    (
      select count(*)::integer from public.rentals
      where user_id = any (private.plus_household((select auth.uid())))
        and status in ('requested', 'active', 'overdue')
    ),
    private.plus_tier((select auth.uid()));
$$;

create or replace function private.my_swap_terms()
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
  left join public.plus_homes h on h.user_id = private.plus_holder((select auth.uid()));
$$;

create or replace function private.request_rental(rental_product uuid, rental_variant uuid)
returns public.rentals
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  item public.products;
  open_rentals integer;
  copy public.stock_items;
  created public.rentals;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;

  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;

  select * into item from public.products
  where id = rental_product and status = 'active'
    and (
      kind = 'rental'
      or exists (
        select 1 from public.stock_items s
        where s.product_id = rental_product and s.purpose = 'rental'
          and s.status in ('available', 'rented')
      )
    )
  for update;

  if not found then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  if rental_variant is not null and not exists (
    select 1 from public.product_variants v
    where v.id = rental_variant and v.product_id = item.id and v.active
  ) then
    raise exception 'Item not available' using errcode = 'no_data_found';
  end if;

  -- A Duo's holder and partner share the slots.
  select count(*) into open_rentals from public.rentals
  where user_id = any (private.plus_household(caller)) and status in ('requested', 'active', 'overdue');

  if open_rentals >= private.plus_rental_slots(caller) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  if item.rental_tier is not null and private.plus_tier(caller) < item.rental_tier then
    raise exception 'This item needs a higher plan' using errcode = 'check_violation';
  end if;

  select s.* into copy from public.stock_items s
  join public.product_variants v on v.id = s.variant_id
  where s.product_id = item.id
    and (rental_variant is null or s.variant_id = rental_variant)
    and v.active
    and s.purpose = 'rental'
    and s.status = 'available'
  order by s.created_at
  limit 1
  for update of s skip locked;

  if copy.id is null then
    raise exception 'All copies are rented out' using errcode = 'check_violation';
  end if;

  insert into public.rentals (user_id, product_id, variant_id, name_ar, name_en)
  values (caller, item.id, copy.variant_id, item.name_ar, item.name_en)
  returning * into created;

  update public.stock_items set status = 'rented', rental_id = created.id
  where id = copy.id;

  return created;
end;
$$;

-- Swaps: the household's subscription (pause, cancel), one booked swap at
-- a time for the household, its slots and home swaps, and the holder's
-- address. Each wanted item goes to whoever has it in their queue.
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
  holder uuid;
  household uuid[];
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
  owner uuid;
  person uuid;
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
  holder := private.plus_holder(caller);
  household := private.plus_household(caller);
  select s.* into sub from public.subscriptions s
  where s.user_id = holder and s.plan_id = plan.id and s.status in ('active', 'past_due')
  order by s.current_period_end desc nulls last limit 1;
  if sub.paused_until > now() then
    raise exception 'Plus is paused' using errcode = 'check_violation';
  end if;
  if method is distinct from 'home' or (giving = 0 and taking = 0) then
    raise exception 'Invalid swap' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.plus_swaps s where s.user_id = any (household) and s.status = 'booked') then
    raise exception 'A swap is already booked' using errcode = 'check_violation';
  end if;
  -- Cancelling: keep what's at home, but nothing new comes.
  if sub.cancel_at_period_end and taking > 0 then
    raise exception 'Plus ends at the end of this period' using errcode = 'check_violation';
  end if;
  -- A removed partner's place ends at the renewal: nothing new for them.
  if taking > 0 and exists (
    select 1 from public.plus_members m
    where m.user_id = caller and m.role = 'partner' and m.left_at is null and m.ends_at is not null
  ) then
    raise exception 'Your Duo place ends at the renewal' using errcode = 'check_violation';
  end if;

  if giving > 0 and (
    select count(*) from public.rentals r
    where r.id = any (returns) and r.user_id = any (household) and r.kind = 'plus'
      and r.status in ('active', 'overdue') and r.return_swap_id is null
  ) <> giving then
    raise exception 'Rental not found' using errcode = 'no_data_found';
  end if;

  select count(*)::integer into holding from public.rentals r
  where r.user_id = any (household) and r.kind = 'plus' and r.status in ('requested', 'active', 'overdue');
  if holding - giving + taking > coalesce(plan.rental_slots, 0) then
    raise exception 'No free rental slots' using errcode = 'check_violation';
  end if;

  select * into settings from public.store_settings limit 1;
  select * into home from public.plus_homes where user_id = holder;
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
    owner := caller;
    if not exists (
      select 1 from public.rental_queue_items q where q.user_id = caller and q.product_id = product
    ) then
      select q.user_id into owner from public.rental_queue_items q
      where q.user_id = any (household) and q.user_id <> caller and q.product_id = product
        and not exists (
          select 1 from public.plus_members m
          where m.user_id = q.user_id and m.role = 'partner' and m.left_at is null
            and m.ends_at is not null
        )
      limit 1;
      owner := coalesce(owner, caller);
    end if;
    perform private.hold_plus_copy(owner, product, swap.id);
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

  foreach person in array household loop
    perform private.notify(
      person, 'plus', 'plus_swap_booked',
      jsonb_build_object('method', method, 'date', swap.scheduled_for), '/plus#yours'
    );
  end loop;
  return swap;
end;
$$;

-- Both queues, in the order the next swap picks from: alternating (whoever
-- has fewer items at home first, the holder on a tie), or one person's
-- items first, as the holder set.
create function private.household_queue()
returns table (
  user_id uuid, first_name text, product_id uuid, name_ar text, name_en text, queue_position integer, turn integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select u.id, u.n,
      (select count(*) from public.rentals r
       where r.user_id = u.id and r.kind = 'plus' and r.status in ('requested', 'active', 'overdue')) as holding
    from unnest(private.plus_household((select auth.uid()))) with ordinality as u (id, n)
  ),
  setting as (
    select coalesce((
      select m.swap_order from public.plus_members m
      join public.subscriptions s on s.id = m.subscription_id
      where s.user_id = private.plus_holder((select auth.uid())) and m.role = 'holder'
      order by m.created_at desc limit 1
    ), 'alternate') as swap_order
  ),
  ranked as (
    select q.user_id, q.product_id, q.position, p.n, p.holding,
      row_number() over (partition by q.user_id order by q.position) as rank
    from public.rental_queue_items q
    join people p on p.id = q.user_id
  )
  select r.user_id, private.first_name(r.user_id), r.product_id, pr.name_ar, pr.name_en, r.position,
    (row_number() over (order by
      case s.swap_order
        when 'holder' then r.n
        when 'partner' then -r.n
        else 0
      end,
      r.rank,
      r.holding,
      r.n
    ))::integer
  from ranked r
  join public.products pr on pr.id = r.product_id
  cross join setting s
  where (select auth.uid()) is not null
  order by 7;
$$;

-- ── Inviting and joining ───────────────────────────────────────────────────

-- The caller's own live Duo subscription, which they hold.
create function private.my_duo_subscription()
returns public.subscriptions
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.id = (private.my_plus_subscription()).id and p.duo;
$$;

revoke all on function private.my_duo_subscription() from public, anon, authenticated;
grant execute on function private.my_duo_subscription() to service_role;

-- The holder invites a partner: a link with a code, open for 7 days. A new
-- invite replaces one not yet accepted.
create function private.invite_duo_partner()
returns public.plus_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_duo_subscription();
  invite public.plus_members;
begin
  if sub.id is null then
    raise exception 'Not a Duo plan' using errcode = 'insufficient_privilege';
  end if;
  if sub.cancel_at_period_end then
    raise exception 'Plus ends at the end of this period' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.plus_members m
    where m.subscription_id = sub.id and m.role = 'partner' and m.left_at is null and m.joined_at is not null
  ) then
    raise exception 'Your Duo already has a second person' using errcode = 'check_violation';
  end if;

  insert into public.plus_members (subscription_id, user_id, role)
  values (sub.id, sub.user_id, 'holder')
  on conflict (subscription_id) where role = 'holder' do nothing;

  delete from public.plus_members m
  where m.subscription_id = sub.id and m.role = 'partner' and m.joined_at is null;
  insert into public.plus_members (subscription_id, role, invite_token, invite_expires_at)
  values (
    sub.id, 'partner',
    replace(replace(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+', '-'), '/', '_'),
    now() + interval '7 days'
  )
  returning * into invite;
  return invite;
end;
$$;

-- What an invite shows before it's accepted: who invited you, to which plan.
create function private.duo_invite(token text)
returns table (holder_name text, plan_id text, plan_name text, plan_name_ar text, tier integer, expires_at timestamptz, open boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select private.first_name(s.user_id), p.id, p.name, p.name_ar, p.tier::integer, m.invite_expires_at,
    m.joined_at is null and m.left_at is null and m.invite_expires_at > now()
      and s.status in ('active', 'past_due') and not s.cancel_at_period_end
  from public.plus_members m
  join public.subscriptions s on s.id = m.subscription_id
  join public.plans p on p.id = s.plan_id
  where (select auth.uid()) is not null
    and m.role = 'partner' and m.invite_token = token and p.duo;
$$;

-- Accepting: someone without Plus of their own, 13 or over. A 13–17-year-
-- old needs their guardian's approval (given already if the guardian
-- allows Plus).
create function private.accept_duo_invite(token text)
returns public.plus_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  invite public.plus_members;
  sub public.subscriptions;
  guardian uuid;
  allowed boolean;
  saved public.plus_members;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.profiles where id = caller and banned_at is not null) then
    raise exception 'Account suspended' using errcode = 'insufficient_privilege';
  end if;
  select m.* into invite from public.plus_members m
  where m.role = 'partner' and m.invite_token = token and m.joined_at is null and m.left_at is null
  for update;
  select s.* into sub from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.id = invite.subscription_id and p.duo and s.status in ('active', 'past_due')
    and not s.cancel_at_period_end
    and (s.current_period_end is null or s.current_period_end > now());
  if invite.id is null or sub.id is null or invite.invite_expires_at <= now() then
    raise exception 'This invite has expired' using errcode = 'no_data_found';
  end if;
  if sub.user_id = caller then
    raise exception 'Send the invite to the second person' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id = caller and p.audience = 'plus' and s.status in ('incomplete', 'active', 'past_due')
  ) then
    raise exception 'You already have Plus' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.plus_members m
    where m.user_id = caller and m.role = 'partner' and m.left_at is null
  ) then
    raise exception 'You''re already on a Duo' using errcode = 'check_violation';
  end if;
  if private.age_of(caller) < 13 then
    raise exception 'Plus Duo is for 13 and over' using errcode = 'check_violation';
  end if;
  if private.is_minor(caller) then
    select g.guardian_id, g.allows_plus into guardian, allowed from public.guardian_links g
    where g.teen_id = caller and g.status = 'active';
    if guardian is null then
      raise exception 'Link your guardian''s Pass first' using errcode = 'check_violation';
    end if;
  end if;

  update public.plus_members set
    user_id = caller, joined_at = now(), invite_token = null, invite_expires_at = null,
    guardian_id = guardian,
    guardian_status = case when guardian is null then null when allowed then 'approved' else 'pending' end
  where id = invite.id
  returning * into saved;
  update public.profiles set student_only = false where id = caller and student_only;

  perform private.notify(
    sub.user_id, 'plus', 'plus_duo_joined',
    jsonb_build_object('name', private.first_name(caller), 'pending', saved.guardian_status = 'pending'),
    '/plus#yours'
  );
  if saved.guardian_status = 'pending' then
    perform private.notify(
      guardian, 'plus', 'plus_duo_guardian',
      jsonb_build_object('name', private.first_name(caller), 'holder', private.first_name(sub.user_id)),
      '/pass/settings#guardian'
    );
  end if;
  return saved;
end;
$$;

-- The guardian approves or declines a teen's place.
create function private.decide_duo_guardian(place uuid, approve boolean)
returns public.plus_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.plus_members;
  holder uuid;
  saved public.plus_members;
begin
  select m.* into found from public.plus_members m
  where m.id = place and m.guardian_id = (select auth.uid()) and m.role = 'partner'
  for update;
  if found.id is null then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;
  if found.guardian_status is distinct from 'pending' or found.left_at is not null then
    raise exception 'Already decided' using errcode = 'check_violation';
  end if;
  update public.plus_members set
    guardian_status = case when approve then 'approved' else 'declined' end,
    left_at = case when approve then null else now() end,
    end_reason = case when approve then null else 'guardian_declined' end
  where id = place
  returning * into saved;

  select s.user_id into holder from public.subscriptions s where s.id = found.subscription_id;
  perform private.notify(
    found.user_id, 'plus',
    case when approve then 'plus_duo_approved' else 'plus_duo_declined' end,
    jsonb_build_object('holder', private.first_name(holder)), '/plus#yours'
  );
  perform private.notify(
    holder, 'plus',
    case when approve then 'plus_duo_approved' else 'plus_duo_declined' end,
    jsonb_build_object('name', private.first_name(found.user_id)), '/plus#yours'
  );
  return saved;
end;
$$;

-- The places waiting for the caller's approval as a guardian, with the
-- teen's and the holder's first names and the plan.
create function private.duo_approvals()
returns table (place uuid, teen_name text, holder_name text, plan_id text, joined_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, private.first_name(m.user_id), private.first_name(s.user_id), s.plan_id, m.joined_at
  from public.plus_members m
  join public.subscriptions s on s.id = m.subscription_id
  where m.guardian_id = (select auth.uid()) and m.guardian_status = 'pending' and m.left_at is null
  order by m.joined_at;
$$;

-- ── Ending a place ─────────────────────────────────────────────────────────

-- Ends a partner's place now: what they have at the shared address and any
-- swap they booked stay with the holder.
create function private.end_duo_place(place uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.plus_members;
  holder uuid;
begin
  select m.* into found from public.plus_members m where m.id = place for update;
  select s.user_id into holder from public.subscriptions s where s.id = found.subscription_id;
  update public.plus_members set
    left_at = now(),
    end_reason = coalesce(found.end_reason, reason),
    invite_token = null
  where id = place;
  if found.user_id is not null and found.joined_at is not null then
    update public.rentals set user_id = holder
    where user_id = found.user_id and kind = 'plus' and status in ('requested', 'active', 'overdue');
    update public.plus_swaps set user_id = holder
    where user_id = found.user_id and status = 'booked';
  end if;
end;
$$;

revoke all on function private.end_duo_place(uuid, text) from public, anon, authenticated;
grant execute on function private.end_duo_place(uuid, text) to service_role;

-- The partner leaves, at any time.
create function private.leave_duo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.plus_members;
  holder uuid;
begin
  select m.* into found from public.plus_members m
  where m.user_id = (select auth.uid()) and m.role = 'partner' and m.left_at is null;
  if found.id is null then
    raise exception 'Not on a Duo' using errcode = 'no_data_found';
  end if;
  select s.user_id into holder from public.subscriptions s where s.id = found.subscription_id;
  perform private.end_duo_place(found.id, 'left');
  perform private.notify(
    holder, 'plus', 'plus_duo_left',
    jsonb_build_object('name', private.first_name(found.user_id)), '/plus#yours'
  );
end;
$$;

-- The holder removes the partner from the next renewal, once their rentals
-- are back (an invite not yet accepted, or a place still waiting for a
-- guardian, ends now). `keep` takes the removal back.
create function private.remove_duo_partner(keep boolean default false)
returns public.plus_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_duo_subscription();
  found public.plus_members;
  saved public.plus_members;
begin
  if sub.id is null then
    raise exception 'Not a Duo plan' using errcode = 'insufficient_privilege';
  end if;
  select m.* into found from public.plus_members m
  where m.subscription_id = sub.id and m.role = 'partner' and m.left_at is null
  for update;
  if found.id is null then
    raise exception 'Not found' using errcode = 'no_data_found';
  end if;

  if keep then
    update public.plus_members set ends_at = null, end_reason = null
    where id = found.id returning * into saved;
    return saved;
  end if;

  if found.joined_at is null or found.guardian_status = 'pending' then
    perform private.end_duo_place(found.id, 'removed');
    select m.* into saved from public.plus_members m where m.id = found.id;
    return saved;
  end if;
  if exists (
    select 1 from public.rentals r
    where r.user_id = found.user_id and r.kind = 'plus' and r.status in ('requested', 'active', 'overdue')
  ) then
    raise exception 'Their rentals must be returned first' using errcode = 'check_violation';
  end if;
  update public.plus_members set
    ends_at = coalesce(sub.current_period_end, now()), end_reason = 'removed'
  where id = found.id
  returning * into saved;
  perform private.notify(
    found.user_id, 'plus', 'plus_duo_removed',
    jsonb_build_object('holder', private.first_name(sub.user_id), 'date', saved.ends_at), '/plus#yours'
  );
  return saved;
end;
$$;

-- How swaps share the two queues; the holder sets it.
create function private.set_duo_swap_order(swap_order text)
returns public.plus_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions := private.my_duo_subscription();
  saved public.plus_members;
begin
  if sub.id is null then
    raise exception 'Not a Duo plan' using errcode = 'insufficient_privilege';
  end if;
  if swap_order is null or swap_order not in ('alternate', 'holder', 'partner') then
    raise exception 'Invalid swap order' using errcode = 'check_violation';
  end if;
  insert into public.plus_members as m (subscription_id, user_id, role, swap_order)
  values (sub.id, sub.user_id, 'holder', set_duo_swap_order.swap_order)
  on conflict (subscription_id) where role = 'holder'
  do update set swap_order = excluded.swap_order
  returning * into saved;
  return saved;
end;
$$;

-- The caller's Duo, as holder or partner, with the other person's first
-- name; null when they're on none.
create function private.my_duo()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select s.id as subscription_id, s.user_id as holder_id, s.plan_id, s.current_period_end,
      case when s.user_id = (select auth.uid()) then 'holder' else 'partner' end as role
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where p.duo and s.status in ('active', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
      and (
        s.id = (private.my_plus_subscription()).id
        or s.id in (
          select m.subscription_id from public.plus_members m
          where m.user_id = (select auth.uid()) and m.role = 'partner' and m.left_at is null
        )
      )
    limit 1
  )
  select jsonb_build_object(
    'role', mine.role,
    'subscription_id', mine.subscription_id,
    'plan_id', mine.plan_id,
    'holder_name', private.first_name(mine.holder_id),
    'partner_name', private.first_name(partner.user_id),
    'partner_status', case
      when partner.id is null then null
      when partner.joined_at is null and partner.invite_expires_at <= now() then 'expired'
      when partner.joined_at is null then 'invited'
      when partner.guardian_status = 'pending' then 'guardian'
      when partner.ends_at is not null then 'ending'
      else 'joined'
    end,
    'invite_token', case when mine.role = 'holder' then partner.invite_token end,
    'invite_expires_at', case when mine.role = 'holder' then partner.invite_expires_at end,
    'joined_at', partner.joined_at,
    'ends_at', partner.ends_at,
    'swap_order', coalesce(holder.swap_order, 'alternate'),
    -- The household's booked swap and the holder's address, which the
    -- partner can't read themselves.
    'swap_date', (
      select min(sw.scheduled_for) from public.plus_swaps sw
      where sw.user_id = any (private.plus_household((select auth.uid()))) and sw.status = 'booked'
    ),
    'has_home', exists (select 1 from public.plus_homes h where h.user_id = mine.holder_id)
  )
  from mine
  left join public.plus_members partner
    on partner.subscription_id = mine.subscription_id and partner.role = 'partner' and partner.left_at is null
  left join public.plus_members holder
    on holder.subscription_id = mine.subscription_id and holder.role = 'holder';
$$;

-- The API's cron: places past a removal's renewal, on a Duo that ended or
-- changed to another plan, and invites past their 7 days. Returns how many
-- places ended.
create function public.end_duo_partners()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  place record;
  ended integer := 0;
begin
  delete from public.plus_members m
  where m.role = 'partner' and m.joined_at is null and m.invite_expires_at <= now();

  for place in
    select m.id, m.user_id, m.end_reason, s.user_id as holder
    from public.plus_members m
    join public.subscriptions s on s.id = m.subscription_id
    join public.plans p on p.id = s.plan_id
    where m.role = 'partner' and m.left_at is null
      and (
        m.ends_at <= now()
        or not p.duo
        or s.status not in ('active', 'past_due')
        or s.current_period_end <= now()
      )
  loop
    perform private.end_duo_place(place.id, 'plan_ended');
    if place.user_id is not null then
      perform private.notify(
        place.user_id, 'plus', 'plus_duo_ended',
        jsonb_build_object('holder', private.first_name(place.holder)), '/plus'
      );
    end if;
    ended := ended + 1;
  end loop;
  return ended;
end;
$$;

-- ── Survey credits for partners ────────────────────────────────────────────

create or replace function public.grant_plus_survey_credits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  month date := date_trunc('month', now() at time zone 'Asia/Baghdad')::date;
  amounts integer[] := (select s.plus_survey_credits from public.store_settings s limit 1);
  member record;
  last public.survey_credits;
  used integer;
  leftover integer;
  given integer := 0;
begin
  for member in
    select x.user_id, max(x.tier) as tier
    from (
      select s.user_id, p.tier
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.user_id is not null and s.status in ('active', 'past_due')
        and p.audience = 'plus' and p.tier between 1 and 3
      union all
      -- A Duo's partner gets the plan's credits on their own.
      select m.user_id, p.tier
      from public.plus_members m
      join public.plans p on p.id = (private.duo_partner_subscription(m.user_id)).plan_id
      where m.role = 'partner' and m.joined_at is not null and m.left_at is null
        and p.tier between 1 and 3
    ) x
    where not exists (
      select 1 from public.survey_credits c
      where c.user_id = x.user_id and c.reason = 'plus_monthly' and c.period = month
    )
    group by x.user_id
  loop
    select * into last from public.survey_credits c
    where c.user_id = member.user_id and c.reason = 'plus_monthly'
    order by c.period desc
    limit 1;
    if last.id is not null and not exists (
      select 1 from public.survey_credits c
      where c.user_id = member.user_id and c.reason = 'plus_expired' and c.period = last.period
    ) then
      select coalesce(-sum(c.amount), 0)::integer into used from public.survey_credits c
      where c.user_id = member.user_id and c.reason = 'response' and c.created_at >= last.created_at;
      leftover := least(
        greatest(last.amount - used, 0),
        greatest(private.survey_credit_balance(member.user_id), 0)
      );
      if leftover > 0 then
        insert into public.survey_credits (user_id, amount, reason, period)
        values (member.user_id, -leftover, 'plus_expired', last.period);
      end if;
    end if;

    if coalesce(amounts[member.tier], 0) > 0 then
      insert into public.survey_credits (user_id, amount, reason, period)
      values (member.user_id, amounts[member.tier], 'plus_monthly', month);
      given := given + 1;
    end if;
  end loop;
  return given;
end;
$$;

-- ── Wrappers ───────────────────────────────────────────────────────────────

create function public.household_queue()
returns table (
  user_id uuid, first_name text, product_id uuid, name_ar text, name_en text, queue_position integer, turn integer
)
language sql security invoker set search_path = ''
as $$ select * from private.household_queue() $$;

create function public.invite_duo_partner()
returns public.plus_members
language sql security invoker set search_path = ''
as $$ select private.invite_duo_partner() $$;

create function public.duo_invite(token text)
returns table (holder_name text, plan_id text, plan_name text, plan_name_ar text, tier integer, expires_at timestamptz, open boolean)
language sql security invoker set search_path = ''
as $$ select * from private.duo_invite(token) $$;

create function public.accept_duo_invite(token text)
returns public.plus_members
language sql security invoker set search_path = ''
as $$ select private.accept_duo_invite(token) $$;

create function public.decide_duo_guardian(place uuid, approve boolean)
returns public.plus_members
language sql security invoker set search_path = ''
as $$ select private.decide_duo_guardian(place, approve) $$;

create function public.duo_approvals()
returns table (place uuid, teen_name text, holder_name text, plan_id text, joined_at timestamptz)
language sql security invoker set search_path = ''
as $$ select * from private.duo_approvals() $$;

create function public.leave_duo()
returns void
language sql security invoker set search_path = ''
as $$ select private.leave_duo() $$;

create function public.remove_duo_partner(keep boolean default false)
returns public.plus_members
language sql security invoker set search_path = ''
as $$ select private.remove_duo_partner(keep) $$;

create function public.set_duo_swap_order(swap_order text)
returns public.plus_members
language sql security invoker set search_path = ''
as $$ select private.set_duo_swap_order(swap_order) $$;

create function public.my_duo()
returns jsonb
language sql security invoker set search_path = ''
as $$ select private.my_duo() $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.household_queue() from public, anon;
revoke all on function public.household_queue() from public, anon;
grant execute on function private.household_queue() to authenticated;
grant execute on function public.household_queue() to authenticated;

revoke all on function private.invite_duo_partner() from public, anon;
revoke all on function public.invite_duo_partner() from public, anon;
grant execute on function private.invite_duo_partner() to authenticated;
grant execute on function public.invite_duo_partner() to authenticated;

revoke all on function private.duo_invite(text) from public, anon;
revoke all on function public.duo_invite(text) from public, anon;
grant execute on function private.duo_invite(text) to authenticated;
grant execute on function public.duo_invite(text) to authenticated;

revoke all on function private.accept_duo_invite(text) from public, anon;
revoke all on function public.accept_duo_invite(text) from public, anon;
grant execute on function private.accept_duo_invite(text) to authenticated;
grant execute on function public.accept_duo_invite(text) to authenticated;

revoke all on function private.decide_duo_guardian(uuid, boolean) from public, anon;
revoke all on function public.decide_duo_guardian(uuid, boolean) from public, anon;
grant execute on function private.decide_duo_guardian(uuid, boolean) to authenticated;
grant execute on function public.decide_duo_guardian(uuid, boolean) to authenticated;

revoke all on function private.duo_approvals() from public, anon;
revoke all on function public.duo_approvals() from public, anon;
grant execute on function private.duo_approvals() to authenticated;
grant execute on function public.duo_approvals() to authenticated;

revoke all on function private.leave_duo() from public, anon;
revoke all on function public.leave_duo() from public, anon;
grant execute on function private.leave_duo() to authenticated;
grant execute on function public.leave_duo() to authenticated;

revoke all on function private.remove_duo_partner(boolean) from public, anon;
revoke all on function public.remove_duo_partner(boolean) from public, anon;
grant execute on function private.remove_duo_partner(boolean) to authenticated;
grant execute on function public.remove_duo_partner(boolean) to authenticated;

revoke all on function private.set_duo_swap_order(text) from public, anon;
revoke all on function public.set_duo_swap_order(text) from public, anon;
grant execute on function private.set_duo_swap_order(text) to authenticated;
grant execute on function public.set_duo_swap_order(text) to authenticated;

revoke all on function private.my_duo() from public, anon;
revoke all on function public.my_duo() from public, anon;
grant execute on function private.my_duo() to authenticated;
grant execute on function public.my_duo() to authenticated;

revoke all on function public.end_duo_partners() from public, anon, authenticated;
grant execute on function public.end_duo_partners() to service_role;
