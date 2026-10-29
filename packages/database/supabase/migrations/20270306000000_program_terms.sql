-- The IDEA's paid programs: the refund terms are fixed when a place is
-- accepted (the programs policy, sections 7 and 8). Accepting copies the
-- program's refund schedule and visa share onto the application, and
-- withdrawing, a refused visa or a released place refund by those copies,
-- so editing a program later never changes what accepted applicants
-- agreed to. A place with any installment past its date (not only the
-- first) can be released as unpaid.

alter table public.program_applications
  add column refund_schedule jsonb check (refund_schedule is null or private.valid_refund_schedule(refund_schedule)),
  add column visa_refund_rate smallint check (visa_refund_rate between 0 and 100);

comment on column public.program_applications.refund_schedule is
  'The program''s refund schedule when the place was accepted; refunds follow it.';
comment on column public.program_applications.visa_refund_rate is
  'The share refunded on a refused visa when the place was accepted.';

-- Places accepted before this change keep the program's current terms.
update public.program_applications a set
  refund_schedule = p.refund_schedule,
  visa_refund_rate = p.visa_refund_rate
from public.programs p
where p.opportunity_id = a.program_id and a.price is not null;

-- The share refunded when withdrawing today: the application's terms
-- (the program's until it's accepted).
create function private.application_refund_rate(application uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max((s ->> 'percent')::integer), 0)
  from public.program_applications a
  join public.programs p on p.opportunity_id = a.program_id
  join public.opportunities o on o.id = a.program_id
  cross join lateral jsonb_array_elements(coalesce(a.refund_schedule, p.refund_schedule)) s
  where a.id = application
    and o.starts_on is not null
    and o.starts_on - (now() at time zone 'Asia/Baghdad')::date >= (s ->> 'days_before')::integer;
$$;

create or replace function private.review_program_application(
  application uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  program public.programs;
  listing public.opportunities;
  taken integer;
  cost bigint;
  plus boolean := false;
  first_due date;
  step jsonb;
  n integer := 0;
  share bigint;
  shared bigint := 0;
  steps integer;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if decision not in ('accepted', 'waitlisted', 'refused') then
    raise exception 'Accept, waitlist or refuse' using errcode = 'check_violation';
  end if;
  select * into found from public.program_applications a where a.id = application for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.status not in ('submitted', 'waitlisted') then
    raise exception 'Already decided' using errcode = 'check_violation';
  end if;
  -- Lock the program so two acceptances can't take the last seat.
  select * into program from public.programs p where p.opportunity_id = found.program_id for update;
  select * into listing from public.opportunities o where o.id = found.program_id;

  if decision = 'accepted' then
    if found.guardian_status is not null and found.guardian_status <> 'approved' then
      raise exception 'The guardian hasn''t approved yet' using errcode = 'check_violation';
    end if;
    select count(*) into taken from public.program_applications a
    where a.program_id = found.program_id and a.status in ('accepted', 'confirmed', 'completed');
    if program.seats is not null and taken >= program.seats then
      raise exception 'No seats left' using errcode = 'check_violation';
    end if;

    cost := program.price;
    if program.plus_price is not null and private.plus_tier(found.user_id) > 0 then
      cost := program.plus_price;
      plus := true;
    end if;
    first_due := (now() at time zone 'Asia/Baghdad')::date + program.pay_within_days;

    -- Each share rounded down to 250 IQD; the last takes what's left.
    steps := jsonb_array_length(program.installments);
    for step in select * from jsonb_array_elements(program.installments) loop
      n := n + 1;
      if n = steps then
        share := cost - shared;
      else
        share := floor(cost * (step ->> 'percent')::integer / 100 / 250)::bigint * 250;
      end if;
      if share > 0 then
        insert into public.program_payments (application_id, position, amount, due_on)
        values (
          application, n, share,
          greatest(coalesce((step ->> 'due_on')::date, first_due), first_due)
        );
      end if;
      shared := shared + share;
    end loop;
  end if;

  update public.program_applications set
    status = case
      when decision = 'accepted' and cost = 0 then 'confirmed'
      else decision
    end,
    price = case when decision = 'accepted' then cost else price end,
    plus_price = case when decision = 'accepted' then plus else plus_price end,
    pay_by = case when decision = 'accepted' and cost > 0 then first_due else pay_by end,
    refund_schedule = case when decision = 'accepted' then program.refund_schedule else refund_schedule end,
    visa_refund_rate = case when decision = 'accepted' then program.visa_refund_rate else visa_refund_rate end,
    review_note = left(nullif(trim(coalesce(note, '')), ''), 1000),
    reviewed_by = (select auth.uid()),
    reviewed_at = now(),
    ended_at = case when decision = 'refused' then now() else ended_at end
  where id = application;

  perform private.notify(
    found.user_id, 'system', 'program_' || decision,
    jsonb_build_object('title_ar', listing.title_ar, 'title_en', listing.title_en),
    '/club/yours?tab=applications'
  );
end;
$$;

create or replace function private.withdraw_program_application(application uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  starts date;
  refund bigint;
begin
  select * into found from public.program_applications a
  where a.id = application and a.user_id = (select auth.uid())
  for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  if found.status not in ('submitted', 'waitlisted', 'accepted', 'confirmed') then
    raise exception 'This application is closed' using errcode = 'check_violation';
  end if;
  select o.starts_on into starts from public.opportunities o where o.id = found.program_id;
  if starts is not null and starts <= (now() at time zone 'Asia/Baghdad')::date then
    raise exception 'The program has started; talk to us' using errcode = 'check_violation';
  end if;

  refund := floor(
    private.program_paid(application) * private.application_refund_rate(application) / 100.0
  )::bigint;
  perform private.close_program_application(application, 'withdrawn', null, refund);
  return refund;
end;
$$;

create or replace function private.end_program_application(application uuid, outcome text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.program_applications;
  program public.programs;
  listing public.opportunities;
  paid bigint;
  refund bigint := 0;
begin
  if not private.has_staff_role('{editor}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if outcome not in ('completed', 'visa_refused', 'unpaid', 'the_idea') then
    raise exception 'Unknown outcome' using errcode = 'check_violation';
  end if;
  select * into found from public.program_applications a where a.id = application for update;
  if found.id is null then
    raise exception 'Application not found' using errcode = 'no_data_found';
  end if;
  select * into program from public.programs p where p.opportunity_id = found.program_id;
  select * into listing from public.opportunities o where o.id = found.program_id;
  paid := private.program_paid(application);

  if outcome = 'completed' then
    if found.status <> 'confirmed' then
      raise exception 'Only confirmed places complete' using errcode = 'check_violation';
    end if;
    update public.program_applications set status = 'completed', ended_at = now()
    where id = application;
    return 0;
  end if;

  if outcome = 'unpaid' then
    -- Any installment past its date, the first or a later one.
    if found.status not in ('accepted', 'confirmed') or not exists (
      select 1 from public.program_payments p
      where p.application_id = application and p.paid_at is null
        and p.due_on < (now() at time zone 'Asia/Baghdad')::date
    ) then
      raise exception 'Not overdue' using errcode = 'check_violation';
    end if;
    refund := floor(paid * private.application_refund_rate(application) / 100.0)::bigint;
  elsif found.status not in ('submitted', 'waitlisted', 'accepted', 'confirmed') then
    raise exception 'This application is closed' using errcode = 'check_violation';
  elsif outcome = 'visa_refused' then
    refund := floor(paid * coalesce(found.visa_refund_rate, program.visa_refund_rate) / 100.0)::bigint;
  else
    refund := paid;
  end if;

  perform private.close_program_application(application, 'cancelled', outcome, refund);
  perform private.notify(
    found.user_id, 'system', 'program_cancelled',
    jsonb_build_object(
      'title_ar', listing.title_ar, 'title_en', listing.title_en,
      'reason', outcome, 'refund', refund
    ),
    '/club/yours?tab=applications'
  );
  return refund;
end;
$$;

drop function private.program_refund_rate(uuid);

revoke all on function private.application_refund_rate(uuid) from public, anon, authenticated;
