-- Brand update of 2026-10-28 (docs/brand/BRAND_GUIDELINES.md, section 2):
-- inside The IDEA's own surfaces and documents the products have short
-- names. These functions are redefined unchanged except for the words
-- people read: the Plus seat errors and invoice lines say "Plus", and the
-- age check says "Pass". A seat's first invoice line starts with its plan
-- ("Plus Glow · …"); a renewal line with "Plus" and the number of seats.

CREATE OR REPLACE FUNCTION private.request_plus_seat(org uuid, member uuid, plan text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    raise exception 'Choose a monthly Plus plan' using errcode = 'check_violation';
  end if;
  insert into public.plus_seats (organization_id, user_id, plan_id)
  values (org, member, plan)
  returning id into seat;
  return seat;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.activate_plus_seat(seat uuid, days integer DEFAULT 15)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    raise exception 'This member already has Plus' using errcode = 'unique_violation';
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
    left(chosen.name || ' · '
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
$function$
;

CREATE OR REPLACE FUNCTION private.run_plus_seat_renewals(OUT renewed integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      left('Plus · ' || company.seats || ' · '
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
$function$
;

CREATE OR REPLACE FUNCTION private.check_birthday_age()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.birthday is not null
    and new.birthday > ((now() at time zone 'Asia/Baghdad')::date - interval '13 years')
  then
    raise exception 'The Pass is for people aged 13 and over' using errcode = 'check_violation';
  end if;
  return new;
end;
$function$
;

