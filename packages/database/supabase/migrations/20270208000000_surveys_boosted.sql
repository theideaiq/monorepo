-- Surveys, part 1: Free and Boosted only, rewards by time, counting rules,
-- withdrawal and appeals (owner's master brief, step 10, section 20).
--
-- * Bulbs are never sold or transferred, so the `bulbs` kind (creators
--   paying from their own balance) and the `cash` kind go. The kinds are
--   `free` (unchanged) and `boosted`: the creator pays The IDEA in IQD
--   through an order (the reward × 1.1 per counted response, no Bulbs, no
--   coupons) and The IDEA rewards each counted response with Bulbs. Open
--   Bulbs surveys run to completion under the old rules; cash surveys
--   become Boosted.
-- * A Boosted survey opens when paid and stays open until it reaches its
--   target or 60 days pass. What isn't used is refunded through Wayl when
--   it is at least 1,000 IQD.
-- * Rewards by time: 100 Bulbs a minute of the median completion time,
--   from 200 to 2,000. Before opening the time is estimated from the
--   questions; after 10 counted responses the reward resets to the real
--   median. Lower: the rest is refunded at close. Higher: collection
--   pauses until the creator pays the difference.
-- * A response doesn't count when it fails 2 or more attention checks or
--   finishes in under a third of the median time (under `min_seconds`
--   before there is a median). The respondent sees why and can appeal
--   once; support decides. Creators can't reject responses.
-- * Anyone can quit before submitting; after submitting, a respondent can
--   delete their response until the survey closes (they keep the reward,
--   and it stops counting). A survey closed early still pays, in full and
--   at the creator's cost, everyone who started in the last 60 minutes.

-- ── Kinds ──────────────────────────────────────────────────────────────────

alter table public.surveys drop constraint surveys_kind_check;

update public.surveys set kind = 'boosted'
where kind = 'cash' or (kind = 'bulbs' and opened_at is null);

alter table public.surveys add constraint surveys_kind_check check (
  kind in ('free', 'boosted') or (kind = 'bulbs' and opened_at is not null)
);

comment on column public.surveys.kind is
  'free (credits: answer to get answers) or boosted (paid in IQD, rewarded in Bulbs by The IDEA). bulbs: the old kind, kept for surveys opened before it went.';
comment on column public.surveys.held is
  'boosted: the IQD paid for the rewards; bulbs: the Bulbs held from the creator.';

alter table public.surveys
  add column estimated_seconds integer check (estimated_seconds > 0),
  add column median_seconds integer check (median_seconds > 0),
  add column reward_pending integer check (reward_pending between 0 and 2000),
  add column paused_at timestamptz,
  add column topup_order_id uuid references public.orders (id) on delete set null,
  add column refund_amount bigint not null default 0 check (refund_amount >= 0),
  add column refunded_amount bigint not null default 0 check (refunded_amount >= 0),
  add column refund_claimed_at timestamptz,
  add column refunded_at timestamptz,
  add column refund_reference text check (char_length(refund_reference) <= 200);

comment on column public.surveys.estimated_seconds is 'The time to answer, estimated from the questions before opening.';
comment on column public.surveys.median_seconds is 'The median time of the first 10 counted responses, which resets the reward.';
comment on column public.surveys.reward_pending is 'A higher reward from the median, waiting for the creator to pay the difference (collection is paused).';
comment on column public.surveys.refund_amount is 'IQD due back to the creator of a Boosted survey when it closes (at least 1,000).';
comment on column public.surveys.refunded_amount is 'IQD refunded so far, through one or both of the survey''s orders.';
comment on column public.surveys.topup_order_id is 'The order of the difference when the median raised the reward.';

create index surveys_topup_order_idx on public.surveys (topup_order_id);
create index surveys_refund_idx on public.surveys (closed_at)
  where refund_amount > refunded_amount;

update public.surveys set closes_at = coalesce(closes_at, opened_at + interval '60 days')
where kind = 'boosted' and status = 'open';

-- ── Responses ──────────────────────────────────────────────────────────────

alter table public.survey_responses
  add column seconds integer check (seconds >= 0),
  add column failed_checks smallint not null default 0 check (failed_checks >= 0),
  add column excluded_reason text check (excluded_reason in ('attention', 'too_fast')),
  add column reward_paid integer not null default 0 check (reward_paid >= 0),
  add column withdrawn_at timestamptz,
  add column appealed_at timestamptz,
  add column appeal_note text check (char_length(appeal_note) <= 1000),
  add column appeal_decided_at timestamptz,
  add column appeal_decided_by uuid references auth.users (id) on delete set null,
  add column appeal_upheld boolean;

comment on column public.survey_responses.excluded_reason is 'Why a submitted response doesn''t count: attention (2+ failed checks) or too_fast.';
comment on column public.survey_responses.reward_paid is 'Bulbs paid for this response (Boosted and old Bulbs surveys).';
comment on column public.survey_responses.withdrawn_at is 'The respondent deleted their answers: it stops counting, the reward stays.';

create index survey_responses_appeals_idx on public.survey_responses (appealed_at)
  where appealed_at is not null and appeal_decided_at is null;
create index survey_responses_decided_by_idx on public.survey_responses (appeal_decided_by);

update public.survey_responses set
  seconds = greatest(0, extract(epoch from submitted_at - started_at))::integer
where submitted_at is not null;

-- ── Rewards by time ────────────────────────────────────────────────────────

drop function private.survey_reward(integer);

-- 100 Bulbs a minute, from 200 to 2,000.
create function private.survey_reward_for(seconds integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select least(2000, greatest(200, round(coalesce(seconds, 0) * 100 / 60.0)))::integer $$;

-- The time to answer, from the questions: a moment to read the consent,
-- then each question by its kind (written answers take longest).
create function private.survey_estimate(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select 30 + coalesce(sum(case q.kind
    when 'single' then 8
    when 'multiple' then 12
    when 'scale' then 6
    when 'number' then 10
    when 'text' then 45
  end), 0)::integer
  from public.survey_questions q where q.survey_id = target;
$$;

revoke all on function private.survey_reward_for(integer) from public;
revoke all on function private.survey_estimate(uuid) from public;
grant execute on function private.survey_reward_for(integer) to anon, authenticated;
grant execute on function private.survey_estimate(uuid) to authenticated;

-- Responses that count toward the target.
create function private.survey_counted(target uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.survey_responses r
  where r.survey_id = target and r.counted and r.withdrawn_at is null;
$$;

-- What a Boosted survey has spent: the Bulbs paid × 1.1, in IQD.
create function private.survey_spent(target uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select ceil(coalesce((
    select sum(r.reward_paid) from public.survey_responses r where r.survey_id = target
  ), 0) * (1 + s.survey_fee_rate / 100))::bigint
  from public.store_settings s
  limit 1;
$$;

revoke all on function private.survey_counted(uuid) from public, anon, authenticated;
revoke all on function private.survey_spent(uuid) from public, anon, authenticated;

-- ── Opening ────────────────────────────────────────────────────────────────

-- Free surveys open at once; Boosted ones wait for an order of the
-- estimated reward × 1.1 for each response wanted.
create or replace function private.open_survey(target public.surveys)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.surveys;
  estimate integer := private.survey_estimate(target.id);
  per_answer integer := private.survey_reward_for(estimate);
  cost integer;
  created public.orders;
begin
  if target.kind = 'free' then
    update public.surveys set status = 'open', opened_at = now(), reward = 0, estimated_seconds = estimate
    where id = target.id returning * into saved;
    return saved;
  end if;

  cost := private.survey_cost(per_answer, target.wanted);
  insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
  values (target.creator_id, 'pending', cost, 0, cost, 0, '{}', 'pickup', 'online')
  returning * into created;
  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values (created.id, 'مكافآت استبيان: ' || target.title, 'Survey rewards: ' || target.title, cost, 1, 'survey');
  update public.surveys set
    status = 'awaiting_payment', reward = per_answer, held = cost, order_id = created.id,
    estimated_seconds = estimate
  where id = target.id returning * into saved;
  return saved;
end;
$$;

-- A survey's order is paid: it opens for 60 days (or, for a top-up, the
-- higher reward applies and collection resumes). Nothing is handed over,
-- so the order is done at once.
create or replace function private.on_survey_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'paid' then
      update public.surveys set status = 'open', opened_at = now(), closes_at = now() + interval '60 days'
      where order_id = new.id and status = 'awaiting_payment';
      if not found then
        update public.surveys set
          reward = reward_pending, reward_pending = null, paused_at = null,
          held = held + new.total
        where topup_order_id = new.id and reward_pending is not null;
      end if;
      if found then
        update public.orders set status = 'delivered' where id = new.id;
      end if;
    elsif new.status in ('cancelled', 'refunded') then
      update public.surveys set status = 'draft', order_id = null, held = 0, reward = 0
      where order_id = new.id and status = 'awaiting_payment';
      update public.surveys set topup_order_id = null
      where topup_order_id = new.id and reward_pending is not null;
    end if;
  end if;
  return new;
end;
$$;

-- The creator accepts the higher reward from the median: an order of the
-- difference for the responses still wanted. Collection resumes once paid.
create function private.confirm_survey_reward(target uuid)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  remaining integer;
  cost integer;
  created public.orders;
  saved public.surveys;
begin
  select * into survey from public.surveys s
  where s.id = target and s.creator_id = (select auth.uid())
    and s.status = 'open' and s.reward_pending is not null
  for update;
  if survey.id is null then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.orders o where o.id = survey.topup_order_id and o.status = 'pending') then
    select * into saved from public.surveys where id = target;
    return saved;
  end if;
  remaining := greatest(0, survey.wanted - private.survey_counted(target));
  cost := private.survey_cost(survey.reward_pending - survey.reward, remaining);
  if cost <= 0 then
    update public.surveys set reward = reward_pending, reward_pending = null, paused_at = null
    where id = target returning * into saved;
    return saved;
  end if;
  insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
  values (survey.creator_id, 'pending', cost, 0, cost, 0, '{}', 'pickup', 'online')
  returning * into created;
  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values (created.id, 'زيادة مكافآت استبيان: ' || survey.title, 'Survey rewards top-up: ' || survey.title, cost, 1, 'survey');
  update public.surveys set topup_order_id = created.id where id = target returning * into saved;
  return saved;
end;
$$;

create function public.confirm_survey_reward(target uuid)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$ select private.confirm_survey_reward(target) $$;

revoke all on function private.confirm_survey_reward(uuid) from public, anon;
revoke all on function public.confirm_survey_reward(uuid) from public, anon;
grant execute on function private.confirm_survey_reward(uuid) to authenticated;
grant execute on function public.confirm_survey_reward(uuid) to authenticated;

-- ── Who may answer ─────────────────────────────────────────────────────────

create or replace function private.survey_open_to(target public.surveys, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.status = 'open'
    and target.paused_at is null
    and (target.closes_at is null or target.closes_at > now())
    and member is not null
    and member is distinct from target.creator_id
    and private.is_adult(member)
    and exists (select 1 from public.profiles p where p.id = member and p.banned_at is null)
    and (
      not (target.students_only or cardinality(target.universities) > 0 or cardinality(target.majors) > 0
        or cardinality(target.years) > 0 or cardinality(target.governorates) > 0)
      or exists (
        select 1 from public.student_badges b
        where b.user_id = member and b.valid_until >= private.baghdad_today()
          and (cardinality(target.universities) = 0 or b.university_id = any (target.universities))
          and (cardinality(target.majors) = 0 or lower(coalesce(b.major, '')) = any (
            select lower(m) from unnest(target.majors) m))
          and (cardinality(target.years) = 0 or b.study_year = any (target.years))
          and (cardinality(target.governorates) = 0 or b.governorate = any (target.governorates))
      )
    );
$$;

-- ── Rewarding ──────────────────────────────────────────────────────────────

-- Pays a counted response: a credit each way on a Free survey, the
-- survey's reward in Bulbs otherwise (never twice).
create function private.reward_survey_response(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  response public.survey_responses;
  survey public.surveys;
begin
  select * into response from public.survey_responses r where r.id = target for update;
  select * into survey from public.surveys s where s.id = response.survey_id;
  if response.id is null or response.user_id is null then
    return;
  end if;
  if survey.kind = 'free' then
    insert into public.survey_credits (user_id, amount, reason, survey_id, response_id)
    select x.user_id, x.amount, x.reason, survey.id, response.id
    from (values (response.user_id, 1, 'answered'), (survey.creator_id, -1, 'response')) as x (user_id, amount, reason)
    where x.user_id is not null
      and not exists (
        select 1 from public.survey_credits c
        where c.response_id = response.id and c.reason = x.reason
      );
  elsif survey.reward > 0 and response.reward_paid = 0 then
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (response.user_id, survey.reward, 'bonus', 'survey_answer');
    update public.survey_responses set reward_paid = survey.reward where id = response.id;
  end if;
end;
$$;

revoke all on function private.reward_survey_response(uuid) from public, anon, authenticated;

-- After the first 10 counted responses the reward follows the real median:
-- lower applies at once (the rest is refunded at close); higher pauses
-- collection until the creator pays the difference.
create function private.reset_survey_reward(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  median integer;
  fair integer;
begin
  select * into survey from public.surveys s where s.id = target for update;
  if survey.median_seconds is not null or private.survey_counted(target) < 10 then
    return;
  end if;
  select percentile_cont(0.5) within group (order by r.seconds)::integer into median
  from public.survey_responses r
  where r.survey_id = target and r.counted and r.seconds is not null;
  median := greatest(median, 1);
  update public.surveys set median_seconds = median where id = target;
  if survey.kind <> 'boosted' then
    return;
  end if;
  fair := private.survey_reward_for(median);
  if fair < survey.reward then
    update public.surveys set reward = fair where id = target;
  elsif fair > survey.reward then
    update public.surveys set reward_pending = fair, paused_at = now() where id = target;
    perform private.notify(survey.creator_id, 'system', 'survey_paused',
      jsonb_build_object('title', survey.title, 'reward', fair), '/club#yours');
  end if;
end;
$$;

revoke all on function private.reset_survey_reward(uuid) from public, anon, authenticated;

-- ── Answering ──────────────────────────────────────────────────────────────

create or replace function private.start_survey(target uuid)
returns public.survey_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  survey public.surveys;
  saved public.survey_responses;
begin
  select * into survey from public.surveys s where s.id = target;
  if survey.id is null or not private.survey_open_to(survey, caller) then
    raise exception 'This survey isn''t open to you' using errcode = 'insufficient_privilege';
  end if;
  insert into public.survey_responses (survey_id, user_id)
  values (target, caller)
  on conflict (survey_id, user_id) do update set started_at = excluded.started_at
    where survey_responses.submitted_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'You already answered this survey' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

create or replace function private.submit_survey(target uuid, answers jsonb)
returns public.survey_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  survey public.surveys;
  response public.survey_responses;
  question public.survey_questions;
  value jsonb;
  failed smallint := 0;
  took integer;
  too_fast boolean;
  reason text;
  saved public.survey_responses;
begin
  select * into survey from public.surveys s where s.id = target for update;
  select * into response from public.survey_responses r
  where r.survey_id = target and r.user_id = caller and r.submitted_at is null;
  if survey.id is null or response.id is null or not private.survey_open_to(survey, caller) then
    raise exception 'This survey isn''t open to you' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(answers) is distinct from 'object' then
    raise exception 'Invalid answers' using errcode = 'check_violation';
  end if;

  for question in select * from public.survey_questions q where q.survey_id = target order by q.position loop
    value := answers -> question.id::text;
    if value is null or value = 'null'::jsonb or value = '""'::jsonb or value = '[]'::jsonb then
      if question.required then
        raise exception 'Answer every required question' using errcode = 'check_violation';
      end if;
      continue;
    end if;
    if (question.kind = 'single' and (jsonb_typeof(value) <> 'string' or not (value #>> '{}') = any (question.options)))
      or (question.kind = 'multiple' and (jsonb_typeof(value) <> 'array' or exists (
        select 1 from jsonb_array_elements_text(value) v where not v = any (question.options))))
      or (question.kind = 'scale' and (jsonb_typeof(value) <> 'number' or (value #>> '{}')::numeric not between 1 and 5))
      or (question.kind = 'number' and jsonb_typeof(value) <> 'number')
      or (question.kind = 'text' and (jsonb_typeof(value) <> 'string' or char_length(value #>> '{}') > 2000))
    then
      raise exception 'Invalid answers' using errcode = 'check_violation';
    end if;
    if question.attention_answer is not null and (value #>> '{}') is distinct from question.attention_answer then
      failed := failed + 1;
    end if;
    insert into public.survey_answers (response_id, question_id, value) values (response.id, question.id, value);
  end loop;

  -- One failed check still counts; two don't. Too fast is under a third of
  -- the median time, or under min_seconds before there is a median.
  took := greatest(0, extract(epoch from now() - response.started_at))::integer;
  too_fast := case
    when survey.median_seconds is not null then took * 3 < survey.median_seconds
    else took < survey.min_seconds
  end;
  reason := case when failed >= 2 then 'attention' when too_fast then 'too_fast' end;

  update public.survey_responses set
    submitted_at = now(), seconds = took, failed_checks = failed,
    counted = reason is null, excluded_reason = reason
  where id = response.id returning * into saved;

  if reason is null then
    perform private.reward_survey_response(response.id);
    perform private.reset_survey_reward(target);
  end if;

  -- Full, out of money for another reward, or a free survey out of credits: it closes.
  select * into survey from public.surveys s where s.id = target;
  if private.survey_counted(target) >= survey.wanted
    or (survey.kind = 'free' and private.survey_credit_balance(survey.creator_id) <= 0)
    or (survey.kind = 'boosted' and survey.reward_pending is null
      and survey.held - private.survey_spent(target) < private.survey_cost(survey.reward, 1))
  then
    perform private.finish_survey(target);
  end if;
  select * into saved from public.survey_responses where id = response.id;
  return saved;
end;
$$;

-- Quit before submitting, or delete a submitted response while the survey
-- is open: the answers go and it stops counting; the reward stays.
create function private.withdraw_survey_response(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  response public.survey_responses;
begin
  select r.* into response from public.survey_responses r
  where r.survey_id = target and r.user_id = caller and r.withdrawn_at is null
  for update;
  if response.id is null then
    raise exception 'Response not found' using errcode = 'no_data_found';
  end if;
  if response.submitted_at is null then
    delete from public.survey_responses where id = response.id;
    return;
  end if;
  if not exists (select 1 from public.surveys s where s.id = target and s.status = 'open') then
    raise exception 'This survey has closed' using errcode = 'check_violation';
  end if;
  delete from public.survey_answers where response_id = response.id;
  update public.survey_responses set withdrawn_at = now() where id = response.id;
end;
$$;

create function public.withdraw_survey_response(target uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.withdraw_survey_response(target) $$;

revoke all on function private.withdraw_survey_response(uuid) from public, anon;
revoke all on function public.withdraw_survey_response(uuid) from public, anon;
grant execute on function private.withdraw_survey_response(uuid) to authenticated;
grant execute on function public.withdraw_survey_response(uuid) to authenticated;

-- ── Appeals ────────────────────────────────────────────────────────────────

-- A respondent whose response didn't count appeals once, with a note.
create function private.appeal_survey_response(target uuid, note text)
returns public.survey_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.survey_responses;
begin
  update public.survey_responses r set appealed_at = now(), appeal_note = left(nullif(trim(note), ''), 1000)
  where r.survey_id = target and r.user_id = (select auth.uid())
    and r.submitted_at is not null and not r.counted and r.withdrawn_at is null
    and r.appealed_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'Nothing to appeal' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

-- Support decides an appeal. Upheld, the response counts and is paid.
create function private.decide_survey_appeal(target uuid, upheld boolean)
returns public.survey_responses
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.survey_responses;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.survey_responses r set
    appeal_decided_at = now(), appeal_decided_by = (select auth.uid()), appeal_upheld = upheld,
    counted = case when upheld then true else r.counted end,
    excluded_reason = case when upheld then null else r.excluded_reason end
  where r.id = target and r.appealed_at is not null and r.appeal_decided_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'Appeal not found' using errcode = 'no_data_found';
  end if;
  if upheld and saved.withdrawn_at is null then
    perform private.reward_survey_response(saved.id);
  end if;
  perform private.notify(saved.user_id, 'system',
    case when upheld then 'survey_appeal_upheld' else 'survey_appeal_declined' end,
    jsonb_build_object('title', (select s.title from public.surveys s where s.id = saved.survey_id)),
    '/club#yours');
  return saved;
end;
$$;

-- Appeals waiting for support (Staff → Inbox).
create function private.survey_appeals()
returns table (
  response_id uuid, survey_id uuid, title text, excluded_reason text, failed_checks smallint,
  seconds integer, median_seconds integer, min_seconds integer, note text, appealed_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return query
  select r.id, s.id, s.title, r.excluded_reason, r.failed_checks, r.seconds, s.median_seconds,
    s.min_seconds, r.appeal_note, r.appealed_at
  from public.survey_responses r
  join public.surveys s on s.id = r.survey_id
  where r.appealed_at is not null and r.appeal_decided_at is null
  order by r.appealed_at;
end;
$$;

create function public.appeal_survey_response(target uuid, note text)
returns public.survey_responses
language sql
security invoker
set search_path = ''
as $$ select private.appeal_survey_response(target, note) $$;

create function public.decide_survey_appeal(target uuid, upheld boolean)
returns public.survey_responses
language sql
security invoker
set search_path = ''
as $$ select private.decide_survey_appeal(target, upheld) $$;

create function public.survey_appeals()
returns table (
  response_id uuid, survey_id uuid, title text, excluded_reason text, failed_checks smallint,
  seconds integer, median_seconds integer, min_seconds integer, note text, appealed_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.survey_appeals() $$;

revoke all on function private.appeal_survey_response(uuid, text) from public, anon;
revoke all on function public.appeal_survey_response(uuid, text) from public, anon;
grant execute on function private.appeal_survey_response(uuid, text) to authenticated;
grant execute on function public.appeal_survey_response(uuid, text) to authenticated;
revoke all on function private.decide_survey_appeal(uuid, boolean) from public, anon;
revoke all on function public.decide_survey_appeal(uuid, boolean) from public, anon;
grant execute on function private.decide_survey_appeal(uuid, boolean) to authenticated;
grant execute on function public.decide_survey_appeal(uuid, boolean) to authenticated;
revoke all on function private.survey_appeals() from public, anon;
revoke all on function public.survey_appeals() from public, anon;
grant execute on function private.survey_appeals() to authenticated;
grant execute on function public.survey_appeals() to authenticated;

-- ── Closing ────────────────────────────────────────────────────────────────

-- Closes a survey. Closed early (by its creator or support), everyone who
-- started in the last 60 minutes is still paid in full. A Bulbs survey
-- gives back the Bulbs it didn't use; a Boosted one owes back what it
-- didn't spend, when that is at least 1,000 IQD.
create function private.end_survey(target uuid, early boolean)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  starter record;
  used bigint;
  saved public.surveys;
begin
  select * into survey from public.surveys s where s.id = target and s.status = 'open' for update;
  if survey.id is null then
    return null;
  end if;

  if early and survey.kind <> 'free' and survey.reward > 0 then
    for starter in
      select r.id, r.user_id from public.survey_responses r
      where r.survey_id = target and r.submitted_at is null and r.user_id is not null
        and r.started_at > now() - interval '60 minutes' and r.reward_paid = 0
    loop
      insert into public.bulb_entries (user_id, amount, kind, reason)
      values (starter.user_id, survey.reward, 'bonus', 'survey_answer');
      update public.survey_responses set reward_paid = survey.reward where id = starter.id;
    end loop;
  end if;

  used := coalesce(private.survey_spent(target), 0);
  if survey.kind = 'bulbs' and survey.held - used > 0 then
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (survey.creator_id, survey.held - used, 'bonus', 'survey_refund');
  end if;

  update public.surveys set
    status = 'closed', closed_at = now(), paused_at = null, reward_pending = null,
    refund_amount = case
      when kind = 'boosted' and held - used >= 1000 then held - used
      else 0
    end
  where id = target returning * into saved;
  return saved;
end;
$$;

revoke all on function private.end_survey(uuid, boolean) from public, anon, authenticated;

create or replace function private.finish_survey(target uuid)
returns public.surveys
language sql
security definer
set search_path = ''
as $$ select private.end_survey(target, false) $$;

create or replace function private.close_survey(target uuid)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.surveys s
    where s.id = target and (s.creator_id = (select auth.uid()) or private.has_staff_role('{support}'))
  ) then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  return private.end_survey(target, true);
end;
$$;

create or replace function private.review_survey(target uuid, approve boolean, note text default null)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  saved public.surveys;
begin
  if not private.has_staff_role('{support}') then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into survey from public.surveys s where s.id = target and s.status = 'review' for update;
  if survey.id is null then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  update public.surveys set
    reviewed_by = (select auth.uid()), reviewed_at = now(),
    review_note = left(nullif(trim(note), ''), 1000)
  where id = target;

  if not approve then
    if survey.opened_at is not null then
      -- Reported after opening: it closes as if early, then is rejected.
      update public.surveys set status = 'open' where id = target;
      perform private.end_survey(target, true);
    end if;
    update public.surveys set status = 'rejected' where id = target returning * into saved;
    perform private.notify(survey.creator_id, 'system', 'survey_rejected',
      jsonb_build_object('title', survey.title), '/club#yours');
    return saved;
  end if;

  if survey.opened_at is not null then
    -- Reported but fine: back to open.
    update public.surveys set status = 'open' where id = target returning * into saved;
  else
    select * into survey from public.surveys where id = target;
    saved := private.open_survey(survey);
  end if;
  perform private.notify(survey.creator_id, 'system', 'survey_approved',
    jsonb_build_object('title', survey.title), '/club#yours');
  return saved;
end;
$$;

-- Daily: open surveys past their 60 days close (apps/api cron).
create function public.sweep_surveys()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid;
  closed integer := 0;
begin
  for due in
    select s.id from public.surveys s
    where s.status = 'open' and s.closes_at is not null and s.closes_at <= now()
  loop
    perform private.end_survey(due, false);
    closed := closed + 1;
  end loop;
  return closed;
end;
$$;

revoke all on function public.sweep_surveys() from public, anon, authenticated;
grant execute on function public.sweep_surveys() to service_role;

-- ── Refunds of Boosted surveys ─────────────────────────────────────────────

-- apps/api takes the refunds due (claimed, so none is sent twice) and sends
-- each through Wayl, from the survey's payment with the most left to
-- refund; a refund larger than one payment takes two runs.
create function public.claim_survey_refunds(max_rows integer default 20)
returns table (
  survey_id uuid, title text, amount bigint, payment_id uuid, payment_reference text,
  refundable bigint, order_number text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with due as (
    select s.id
    from public.surveys s
    where s.status = 'closed' and s.refund_amount > s.refunded_amount
      and (s.refund_claimed_at is null or s.refund_claimed_at < now() - interval '1 hour')
    order by s.closed_at
    limit greatest(max_rows, 0)
    for update of s skip locked
  ), claimed as (
    update public.surveys s set refund_claimed_at = now()
    from due where s.id = due.id
    returning s.*
  )
  select c.id, c.title, least(c.refund_amount - c.refunded_amount, p.amount - p.refunded_amount),
    p.id, p.reference_id, p.amount - p.refunded_amount, p.number
  from claimed c
  cross join lateral (
    select x.id, x.reference_id, x.amount, x.refunded_amount, o.number::text as number
    from public.payments x
    join public.orders o on o.id = x.order_id
    where x.order_id in (c.order_id, c.topup_order_id) and x.provider = 'wayl'
      and x.paid_at is not null and x.amount > x.refunded_amount
    order by x.amount - x.refunded_amount desc
    limit 1
  ) p;
end;
$$;

-- Wayl took a refund from one payment: the survey and the payment remember
-- it; the survey is refunded once all it owed has gone back.
create function public.record_survey_refund(target uuid, payment uuid, amount bigint, reference text)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.surveys;
  sent bigint;
begin
  select least(greatest(amount, 0), s.refund_amount - s.refunded_amount) into sent
  from public.surveys s where s.id = target;
  if coalesce(sent, 0) <= 0 then
    return null;
  end if;
  update public.payments p set refunded_amount = p.refunded_amount + sent
  where p.id = payment and p.order_id in (
    select x from public.surveys s, unnest(array[s.order_id, s.topup_order_id]) x where s.id = target
  );
  if not found then
    raise exception 'Payment not found' using errcode = 'no_data_found';
  end if;
  update public.surveys set
    refunded_amount = refunded_amount + sent,
    refunded_at = case when refunded_amount + sent >= refund_amount then now() end,
    refund_reference = left(reference, 200),
    refund_claimed_at = null
  where id = target
  returning * into saved;
  if saved.refunded_at is not null then
    perform private.notify(saved.creator_id, 'system', 'survey_refunded',
      jsonb_build_object('title', saved.title, 'amount', saved.refunded_amount), '/club#yours');
  end if;
  return saved;
end;
$$;

-- Wayl refused or couldn't be reached: the next run tries again.
create function public.release_survey_refund(target uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.surveys set refund_claimed_at = null
  where id = target and refund_amount > refunded_amount;
$$;

revoke all on function public.claim_survey_refunds(integer) from public, anon, authenticated;
revoke all on function public.record_survey_refund(uuid, uuid, bigint, text) from public, anon, authenticated;
revoke all on function public.release_survey_refund(uuid) from public, anon, authenticated;
grant execute on function public.claim_survey_refunds(integer) to service_role;
grant execute on function public.record_survey_refund(uuid, uuid, bigint, text) to service_role;
grant execute on function public.release_survey_refund(uuid) to service_role;

-- ── Saving ─────────────────────────────────────────────────────────────────

-- New surveys are Free or Boosted (the website before this change still
-- says bulbs or cash: both become Boosted).
create or replace function private.save_survey(body jsonb)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  saved public.surveys;
  question jsonb;
  place integer := 0;
  chosen text := case coalesce(body ->> 'kind', 'free') when 'free' then 'free' else 'boosted' end;
begin
  if not private.is_student(caller) and not private.has_staff_role('{support}') then
    raise exception 'Only verified students create surveys' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(body -> 'questions') is distinct from 'array'
    or jsonb_array_length(body -> 'questions') not between 1 and 60 then
    raise exception 'A survey needs 1 to 60 questions' using errcode = 'check_violation';
  end if;

  if body ? 'id' and body ->> 'id' is not null then
    update public.surveys s set
      title = trim(body ->> 'title'),
      description = trim(coalesce(body ->> 'description', '')),
      language = coalesce(body ->> 'language', 'ar'),
      consent = trim(coalesce(body ->> 'consent', '')),
      kind = chosen,
      wanted = coalesce((body ->> 'wanted')::integer, 50),
      students_only = coalesce((body ->> 'students_only')::boolean, false),
      universities = coalesce(array(select jsonb_array_elements_text(body -> 'universities')), '{}'),
      majors = coalesce(array(select trim(m) from jsonb_array_elements_text(body -> 'majors') m where trim(m) <> ''), '{}'),
      years = coalesce(array(select y::smallint from jsonb_array_elements_text(body -> 'years') y), '{}'),
      governorates = coalesce(array(select jsonb_array_elements_text(body -> 'governorates')), '{}'),
      min_seconds = coalesce((body ->> 'min_seconds')::integer, 60),
      ethics_reference = nullif(trim(coalesce(body ->> 'ethics_reference', '')), '')
    where s.id = (body ->> 'id')::uuid and s.creator_id = caller and s.status = 'draft'
    returning * into saved;
    if saved.id is null then
      raise exception 'Survey not found' using errcode = 'no_data_found';
    end if;
    delete from public.survey_questions where survey_id = saved.id;
  else
    insert into public.surveys (
      creator_id, title, description, language, consent, kind, wanted, students_only,
      universities, majors, years, governorates, min_seconds, ethics_reference
    )
    values (
      caller, trim(body ->> 'title'), trim(coalesce(body ->> 'description', '')),
      coalesce(body ->> 'language', 'ar'), trim(coalesce(body ->> 'consent', '')),
      chosen, coalesce((body ->> 'wanted')::integer, 50),
      coalesce((body ->> 'students_only')::boolean, false),
      coalesce(array(select jsonb_array_elements_text(body -> 'universities')), '{}'),
      coalesce(array(select trim(m) from jsonb_array_elements_text(body -> 'majors') m where trim(m) <> ''), '{}'),
      coalesce(array(select y::smallint from jsonb_array_elements_text(body -> 'years') y), '{}'),
      coalesce(array(select jsonb_array_elements_text(body -> 'governorates')), '{}'),
      coalesce((body ->> 'min_seconds')::integer, 60),
      nullif(trim(coalesce(body ->> 'ethics_reference', '')), '')
    )
    returning * into saved;
  end if;

  for question in select * from jsonb_array_elements(body -> 'questions') loop
    insert into public.survey_questions (survey_id, position, kind, prompt, options, required, attention_answer)
    values (
      saved.id, place, question ->> 'kind', trim(question ->> 'prompt'),
      coalesce(array(select trim(o) from jsonb_array_elements_text(question -> 'options') o where trim(o) <> ''), '{}'),
      coalesce((question ->> 'required')::boolean, true),
      nullif(trim(coalesce(question ->> 'attention_answer', '')), '')
    );
    place := place + 1;
  end loop;

  if exists (
    select 1 from public.survey_questions q
    where q.survey_id = saved.id and q.kind in ('single', 'multiple')
      and (cardinality(q.options) < 2 or (q.attention_answer is not null and not q.attention_answer = any (q.options)))
  ) then
    raise exception 'Choice questions need at least 2 options' using errcode = 'check_violation';
  end if;
  update public.surveys set estimated_seconds = private.survey_estimate(saved.id)
  where id = saved.id returning * into saved;
  return saved;
end;
$$;

-- Results leave out deleted responses.
create or replace function private.survey_results(target uuid)
returns table (response_id uuid, submitted_at timestamptz, counted boolean, answers jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.surveys s
    where s.id = target and (s.creator_id = (select auth.uid()) or private.has_staff_role('{support}'))
  ) then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  return query
  select r.id, r.submitted_at, r.counted,
    coalesce((select jsonb_object_agg(a.question_id, a.value) from public.survey_answers a where a.response_id = r.id), '{}')
  from public.survey_responses r
  where r.survey_id = target and r.submitted_at is not null and r.withdrawn_at is null
  order by r.submitted_at;
end;
$$;
