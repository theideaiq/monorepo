-- Plus features, part 2 (owner's master brief, step 12, section 17): Bulbs
-- on renewals and monthly survey credits.
--
-- * "Use Bulbs on my next renewal": the member sets how many Bulbs their
--   next renewal takes (steps of 250, up to half of that month's price).
--   The renewal job asks plus_renewal_bulbs() for what it may take now (no
--   more than they have) and invoices the rest; once paid it spends them
--   (spend_renewal_bulbs) and the choice resets. Plus renews by invoice,
--   so Bulbs apply to every renewal; prepaid months bought as a gift take
--   Bulbs at checkout (up to half a month).
-- * Survey credits: on the 1st of each month every Plus member gets free
--   response credits for their tier (10 Glow, 25 Shine, 50 Blaze; a
--   setting). They don't carry over: what's left of last month's expires
--   first (Plus credits are used before earned ones).

-- ── Bulbs on renewals ──────────────────────────────────────────────────────

alter table public.subscriptions
  add column renewal_bulbs integer not null default 0
    check (renewal_bulbs >= 0 and renewal_bulbs % 250 = 0);

comment on column public.subscriptions.renewal_bulbs is
  'Bulbs the member chose to put towards the next renewal (steps of 250, up to half its price).';

-- The plan the next period is billed at.
create function private.next_plan(sub public.subscriptions)
returns public.plans
language sql
stable
security definer
set search_path = ''
as $$ select p.* from public.plans p where p.id = coalesce(sub.next_plan_id, sub.plan_id) $$;

-- The most Bulbs a renewal of this plan takes: half its price, in steps of 250.
create function private.renewal_bulbs_cap(amount bigint)
returns integer
language sql
immutable
set search_path = ''
as $$ select (amount / 2 / 250 * 250)::integer $$;

create function private.set_renewal_bulbs(amount integer)
returns public.subscriptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  sub public.subscriptions;
  plan public.plans;
  usable bigint;
begin
  if caller is null then
    raise exception 'Not authenticated' using errcode = 'insufficient_privilege';
  end if;
  select * into sub from public.subscriptions s
  where s.user_id = caller and s.status in ('active', 'past_due')
  for update;
  plan := private.next_plan(sub);
  if sub.id is null or plan.audience is distinct from 'plus' or sub.provider = 'company' then
    raise exception 'Bulbs pay for your own Plus' using errcode = 'check_violation';
  end if;
  if amount is null or amount < 0 or amount % 250 <> 0 then
    raise exception 'Bulbs go in steps of 250' using errcode = 'check_violation';
  end if;
  if amount > private.renewal_bulbs_cap(plan.amount) then
    raise exception 'Bulbs pay up to half of a month' using errcode = 'check_violation';
  end if;
  select b.available into usable from private.bulb_balance(caller) b;
  if amount > usable then
    raise exception 'Not enough Bulbs' using errcode = 'check_violation';
  end if;
  update public.subscriptions set renewal_bulbs = amount where id = sub.id returning * into sub;
  return sub;
end;
$$;

create function public.set_renewal_bulbs(amount integer)
returns public.subscriptions
language sql volatile
security invoker
set search_path = ''
as $$ select private.set_renewal_bulbs(amount) $$;

-- What the renewal invoice takes in Bulbs now: the member's choice, capped
-- at half the price and at what they have, in steps of 250.
create function public.plus_renewal_bulbs(subscription uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions;
  plan public.plans;
  usable bigint;
begin
  select * into sub from public.subscriptions s where s.id = subscription;
  if sub.id is null or sub.user_id is null or sub.renewal_bulbs = 0 or sub.provider = 'company' then
    return 0;
  end if;
  plan := private.next_plan(sub);
  if plan.audience is distinct from 'plus' then
    return 0;
  end if;
  select b.available into usable from private.bulb_balance(sub.user_id) b;
  return (least(sub.renewal_bulbs, private.renewal_bulbs_cap(plan.amount), greatest(usable, 0)) / 250 * 250)::integer;
end;
$$;

-- The renewal was paid with `bulbs` off: spend them (no more than the
-- member has left) and reset the choice. Returns what was spent.
create function public.spend_renewal_bulbs(subscription uuid, bulbs integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  sub public.subscriptions;
  usable bigint;
  spent integer;
begin
  select * into sub from public.subscriptions s where s.id = subscription for update;
  if sub.id is null or sub.user_id is null or coalesce(bulbs, 0) <= 0 then
    return 0;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('bulbs:' || sub.user_id::text, 0));
  select b.available into usable from private.bulb_balance(sub.user_id) b;
  spent := least(bulbs, greatest(usable, 0))::integer;
  if spent > 0 then
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (sub.user_id, -spent, 'redemption', 'plus_renewal');
  end if;
  update public.subscriptions set renewal_bulbs = 0 where id = sub.id;
  return spent;
end;
$$;

-- ── Monthly survey credits ─────────────────────────────────────────────────

alter table public.store_settings
  add column plus_survey_credits integer[] not null default '{10,25,50}'
    check (cardinality(plus_survey_credits) = 3 and 0 <= all (plus_survey_credits));

comment on column public.store_settings.plus_survey_credits is
  'Free survey response credits each Plus member gets on the 1st of the month: Glow, Shine, Blaze.';

alter table public.survey_credits drop constraint survey_credits_reason_check;
alter table public.survey_credits add constraint survey_credits_reason_check
  check (reason in ('welcome', 'answered', 'response', 'plus_monthly', 'plus_expired'));
alter table public.survey_credits add column period date;

comment on column public.survey_credits.period is
  'The month (its 1st) a Plus grant or its expiry belongs to.';

create unique index survey_credits_plus_monthly_idx
  on public.survey_credits (user_id, period) where reason = 'plus_monthly';
create unique index survey_credits_plus_expired_idx
  on public.survey_credits (user_id, period) where reason = 'plus_expired';

-- The 1st of each month (run daily; once a month per member): last
-- month's unused Plus credits expire and this month's are given. Plus
-- credits count as used first, so what expires is the grant less what the
-- member's surveys used since, never more than their balance.
create function public.grant_plus_survey_credits()
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
    select s.user_id, max(p.tier) as tier
    from public.subscriptions s
    join public.plans p on p.id = s.plan_id
    where s.user_id is not null and s.status in ('active', 'past_due')
      and p.audience = 'plus' and p.tier between 1 and 3
      and not exists (
        select 1 from public.survey_credits c
        where c.user_id = s.user_id and c.reason = 'plus_monthly' and c.period = month
      )
    group by s.user_id
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

-- ── Grants ──────────────────────────────────────────────────────────────────

revoke all on function private.next_plan(public.subscriptions) from public, anon, authenticated;
revoke all on function private.renewal_bulbs_cap(bigint) from public;
grant execute on function private.renewal_bulbs_cap(bigint) to authenticated, service_role;
revoke all on function private.set_renewal_bulbs(integer) from public, anon;
revoke all on function public.set_renewal_bulbs(integer) from public, anon;
grant execute on function private.set_renewal_bulbs(integer) to authenticated;
grant execute on function public.set_renewal_bulbs(integer) to authenticated;
revoke all on function public.plus_renewal_bulbs(uuid) from public, anon, authenticated;
grant execute on function public.plus_renewal_bulbs(uuid) to service_role;
revoke all on function public.spend_renewal_bulbs(uuid, integer) from public, anon, authenticated;
grant execute on function public.spend_renewal_bulbs(uuid, integer) to service_role;
revoke all on function public.grant_plus_survey_credits() from public, anon, authenticated;
grant execute on function public.grant_plus_survey_credits() to service_role;
