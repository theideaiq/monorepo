-- The IDEA Plus for a company's team, paid by the company.
--
-- A company's owners and admins ask for a Plus membership (a plan) for a
-- member of the company. Finance approves it: the member gets a monthly
-- Plus subscription (provider `company`, so the usual rental and tier
-- rules apply) and the company an invoice for the first month. Each
-- month the renewals cron extends the memberships due in the next three
-- days and invoices each company once for them. Ending a seat lets the
-- month run out. A member who already has their own Plus can't get one.
--
-- Invoices no longer need a purchase order: seat invoices carry a
-- description instead.

alter table public.invoices
  alter column purchase_order_id drop not null,
  add column description text check (char_length(description) between 1 and 200),
  add constraint invoices_order_or_description
    check (purchase_order_id is not null or description is not null);

create type public.plus_seat_status as enum ('requested', 'active', 'ended', 'declined');

create table public.plus_seats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id text not null references public.plans (id),
  status public.plus_seat_status not null default 'requested',
  subscription_id uuid unique references public.subscriptions (id) on delete set null,
  requested_by uuid references auth.users (id) on delete set null default auth.uid(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.plus_seats is
  'The IDEA Plus memberships a company pays for, one open seat per member.';

create unique index plus_seats_one_open
  on public.plus_seats (organization_id, user_id) where status in ('requested', 'active');
create index plus_seats_organization_idx on public.plus_seats (organization_id, created_at desc);
create index plus_seats_user_idx on public.plus_seats (user_id);
create index plus_seats_plan_idx on public.plus_seats (plan_id);
create index plus_seats_requested_by_idx on public.plus_seats (requested_by);

create trigger set_updated_at before update on public.plus_seats
  for each row execute function private.set_updated_at();
create trigger audit_plus_seats after insert or update on public.plus_seats
  for each row execute function private.audit_change();

alter table public.plus_seats enable row level security;

create policy "Company admins, the member and finance see seats"
  on public.plus_seats for select to authenticated
  using (
    private.has_org_role(organization_id, '{owner,admin}')
    or user_id = (select auth.uid())
    or private.has_staff_role('{finance}')
  );

revoke all on public.plus_seats from anon, authenticated;
grant select on public.plus_seats to authenticated;

-- ── Requests ───────────────────────────────────────────────────────────────

create function private.request_plus_seat(org uuid, member uuid, plan text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  seat uuid;
begin
  if not private.has_org_role(org, '{owner,admin}') then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if not exists (
    select 1 from public.memberships m where m.organization_id = org and m.user_id = member
  ) then
    raise exception 'Not a member of this company' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.plans p where p.id = plan and p.audience = 'plus' and p.active
      and p.billing_interval = 'month'
  ) then
    raise exception 'Choose a monthly The IDEA Plus plan' using errcode = 'check_violation';
  end if;
  insert into public.plus_seats (organization_id, user_id, plan_id)
  values (org, member, plan)
  returning id into seat;
  return seat;
end;
$$;

-- Finance approves a request: the member's subscription and the first
-- month's invoice.
create function private.activate_plus_seat(seat uuid, days integer default 15)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.plus_seats;
  chosen public.plans;
  subscription uuid;
  invoice_number bigint;
  starts timestamptz := now();
  due date := (now() at time zone 'Asia/Baghdad')::date + greatest(least(days, 120), 0);
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  select * into target from public.plus_seats s where s.id = seat for update;
  if target.id is null or target.status <> 'requested' then
    raise exception 'Only a requested seat can be approved' using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from public.subscriptions s
    where s.user_id = target.user_id and s.status in ('active', 'past_due')
      and (s.current_period_end is null or s.current_period_end > now())
  ) then
    raise exception 'This member already has The IDEA Plus' using errcode = 'unique_violation';
  end if;
  select * into chosen from public.plans p where p.id = target.plan_id;

  -- A lapsed membership or an abandoned checkout would block the one-live index.
  update public.subscriptions s set status = 'expired'
  where s.user_id = target.user_id and s.status in ('incomplete', 'active', 'past_due');

  insert into public.subscriptions
    (user_id, plan_id, status, provider, current_period_start, current_period_end)
  values (target.user_id, target.plan_id, 'active', 'company', starts, starts + interval '1 month')
  returning id into subscription;

  update public.plus_seats set status = 'active', subscription_id = subscription where id = seat;

  insert into public.invoices (organization_id, amount, due_on, description)
  values (
    target.organization_id, chosen.amount, due,
    left('The IDEA Plus · ' || chosen.name || ' · '
      || to_char(starts at time zone 'Asia/Baghdad', 'YYYY-MM-DD'), 200)
  )
  returning number into invoice_number;

  perform private.notify_org_admins(
    target.organization_id, 'invoice_issued',
    jsonb_build_object('number', invoice_number, 'amount', chosen.amount, 'due_on', due),
    '/business/invoices'
  );
  insert into public.notifications (user_id, kind, event, data, link)
  values (target.user_id, 'plus', 'plus_seat_active',
    jsonb_build_object('plan', chosen.name), '/pass/plus');
  return subscription;
end;
$$;

-- Finance declines a request.
create function private.decline_plus_seat(seat uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{finance}') then
    raise exception 'Finance only' using errcode = 'insufficient_privilege';
  end if;
  update public.plus_seats set status = 'declined', ended_at = now()
  where id = seat and status = 'requested';
  if not found then
    raise exception 'Only a requested seat can be declined' using errcode = 'check_violation';
  end if;
end;
$$;

-- The company (or finance) ends a seat: a request is withdrawn, an active
-- membership runs to the end of its month and isn't renewed.
create function private.end_plus_seat(seat uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.plus_seats;
begin
  select * into target from public.plus_seats s where s.id = seat for update;
  if target.id is null then
    raise exception 'No such seat' using errcode = 'no_data_found';
  end if;
  if not (private.has_org_role(target.organization_id, '{owner,admin}')
    or private.has_staff_role('{finance}')) then
    raise exception 'Company owners and admins only' using errcode = 'insufficient_privilege';
  end if;
  if target.status not in ('requested', 'active') then
    raise exception 'This seat has already ended' using errcode = 'check_violation';
  end if;
  update public.plus_seats set status = 'ended', ended_at = now() where id = seat;
  update public.subscriptions set cancel_at_period_end = true where id = target.subscription_id;
end;
$$;

-- A member leaving the company ends their seat.
create function private.end_seats_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.subscriptions s set cancel_at_period_end = true
  from public.plus_seats p
  where p.organization_id = old.organization_id and p.user_id = old.user_id
    and p.status = 'active' and s.id = p.subscription_id;
  update public.plus_seats set status = 'ended', ended_at = now()
  where organization_id = old.organization_id and user_id = old.user_id
    and status in ('requested', 'active');
  return null;
end;
$$;

create trigger end_seats_on_leave after delete on public.memberships
  for each row execute function private.end_seats_on_leave();

-- ── Renewals (daily cron) ──────────────────────────────────────────────────

-- Extends the active seats due within three days by a month and invoices
-- each company once for them, due in 15 days.
create function private.run_plus_seat_renewals(out renewed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  company record;
  due date := (now() at time zone 'Asia/Baghdad')::date + 15;
  invoice_number bigint;
begin
  renewed := 0;
  for company in
    with due_seats as (
      select p.organization_id, s.id as subscription_id, s.current_period_end, pl.amount
      from public.plus_seats p
      join public.subscriptions s on s.id = p.subscription_id
      join public.plans pl on pl.id = p.plan_id
      where p.status = 'active' and not s.cancel_at_period_end
        and s.status = 'active' and s.current_period_end < now() + interval '3 days'
      for update of s
    ),
    extended as (
      update public.subscriptions s
      set current_period_start = d.current_period_end,
        current_period_end = d.current_period_end + interval '1 month'
      from due_seats d
      where s.id = d.subscription_id
      returning d.organization_id, d.amount, s.current_period_end
    )
    select organization_id, count(*)::integer as seats, sum(amount)::bigint as total,
      max(current_period_end) as until
    from extended
    group by organization_id
  loop
    insert into public.invoices (organization_id, amount, due_on, description)
    values (
      company.organization_id, company.total, due,
      left('The IDEA Plus · ' || company.seats || ' · '
        || to_char(company.until at time zone 'Asia/Baghdad', 'YYYY-MM-DD'), 200)
    )
    returning number into invoice_number;
    perform private.notify_org_admins(
      company.organization_id, 'invoice_issued',
      jsonb_build_object('number', invoice_number, 'amount', company.total, 'due_on', due),
      '/business/invoices'
    );
    renewed := renewed + company.seats;
  end loop;
end;
$$;

-- ── Public wrappers ────────────────────────────────────────────────────────

create function public.request_plus_seat(org uuid, member uuid, plan text)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select private.request_plus_seat(org, member, plan) $$;

create function public.activate_plus_seat(seat uuid, days integer default 15)
returns uuid language sql volatile security invoker set search_path = ''
as $$ select private.activate_plus_seat(seat, days) $$;

create function public.decline_plus_seat(seat uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.decline_plus_seat(seat) $$;

create function public.end_plus_seat(seat uuid)
returns void language sql volatile security invoker set search_path = ''
as $$ select private.end_plus_seat(seat) $$;

create function public.run_plus_seat_renewals(out renewed integer)
language sql volatile security invoker set search_path = ''
as $$ select * from private.run_plus_seat_renewals() $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.end_seats_on_leave() from public, anon, authenticated;
revoke all on function private.run_plus_seat_renewals() from public, anon, authenticated;
revoke all on function public.run_plus_seat_renewals() from public, anon, authenticated;
grant execute on function public.run_plus_seat_renewals() to service_role;

revoke all on function private.request_plus_seat(uuid, uuid, text) from public, anon;
grant execute on function private.request_plus_seat(uuid, uuid, text) to authenticated, service_role;
revoke all on function public.request_plus_seat(uuid, uuid, text) from public, anon;
grant execute on function public.request_plus_seat(uuid, uuid, text) to authenticated, service_role;

revoke all on function private.activate_plus_seat(uuid, integer) from public, anon;
grant execute on function private.activate_plus_seat(uuid, integer) to authenticated, service_role;
revoke all on function public.activate_plus_seat(uuid, integer) from public, anon;
grant execute on function public.activate_plus_seat(uuid, integer) to authenticated, service_role;

revoke all on function private.decline_plus_seat(uuid) from public, anon;
grant execute on function private.decline_plus_seat(uuid) to authenticated, service_role;
revoke all on function public.decline_plus_seat(uuid) from public, anon;
grant execute on function public.decline_plus_seat(uuid) to authenticated, service_role;

revoke all on function private.end_plus_seat(uuid) from public, anon;
grant execute on function private.end_plus_seat(uuid) to authenticated, service_role;
revoke all on function public.end_plus_seat(uuid) from public, anon;
grant execute on function public.end_plus_seat(uuid) to authenticated, service_role;
