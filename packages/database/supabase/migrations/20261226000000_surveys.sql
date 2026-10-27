-- Program revision v1, step 5f: surveys (the pilot starts at AUIB).
--
-- Verified students create surveys (Club → Yours → Surveys); anyone 18+
-- with a Pass answers the ones they're targeted by (university, major,
-- year of study and governorate, from the student badge; student-only
-- surveys need a badge).
--
-- Three kinds, so nobody is paid twice:
--   free   give to get: each counted answer to someone else's free survey
--          earns one response credit; each response a free survey collects
--          uses one of its creator's credits (new creators start with 10).
--   bulbs  the creator pays respondents in Bulbs from their own balance:
--          the reward (2–10 Bulbs, by length) for every response wanted,
--          plus a 10% fee, is held when the survey opens and what's unused
--          comes back when it closes.
--   cash   the same reward, paid by the creator in IQD (100 IQD a Bulb,
--          plus the fee) through an order; the survey opens when it's paid.
--
-- A question checker flags sensitive questions (religion, sect, politics,
-- health, sex, income, identity numbers, contact details) and surveys
-- people report: those wait for, or go back to, support's review; the rest
-- open at once. Answers need a minimum time and pass the attention checks
-- to count (and be rewarded). Creators see answers without who gave them.

-- ── The student profile used for targeting ─────────────────────────────────

alter table public.student_badges
  add column major text check (char_length(major) between 1 and 80),
  add column study_year smallint check (study_year between 1 and 7),
  add column governorate text check (char_length(governorate) between 1 and 40);

comment on column public.student_badges.major is 'Optional, set by the student: survey targeting.';

-- The student sets (or clears) their major, year of study and governorate.
create function private.set_student_profile(major text, study_year smallint, governorate text)
returns public.student_badges
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.student_badges;
begin
  update public.student_badges b set
    major = nullif(trim(set_student_profile.major), ''),
    study_year = set_student_profile.study_year,
    governorate = nullif(lower(trim(set_student_profile.governorate)), '')
  where b.user_id = (select auth.uid())
  returning * into saved;
  if saved.user_id is null then
    raise exception 'Verify as a student first' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

create function public.set_student_profile(major text, study_year smallint, governorate text)
returns public.student_badges
language sql
security invoker
set search_path = ''
as $$ select private.set_student_profile(major, study_year, governorate) $$;

-- ── Surveys ────────────────────────────────────────────────────────────────

alter table public.store_settings
  add column survey_fee_rate numeric(5, 2) not null default 10 check (survey_fee_rate between 0 and 50),
  add column survey_welcome_credits integer not null default 10 check (survey_welcome_credits between 0 and 1000);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '' check (char_length(description) <= 2000),
  language text not null default 'ar' check (language in ('ar', 'en')),
  consent text not null default '' check (char_length(consent) <= 3000),
  kind text not null default 'free' check (kind in ('free', 'bulbs', 'cash')),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'awaiting_payment', 'open', 'closed', 'rejected')),
  wanted integer not null default 50 check (wanted between 1 and 2000),
  -- Bulbs each counted response earns (bulbs and cash surveys), set from
  -- the length when the survey opens.
  reward integer not null default 0 check (reward between 0 and 10),
  -- Bulbs held for rewards and the fee (bulbs surveys), or IQD paid (cash).
  held integer not null default 0 check (held >= 0),
  order_id uuid references public.orders (id) on delete set null,
  students_only boolean not null default false,
  universities text[] not null default '{}',
  majors text[] not null default '{}',
  years smallint[] not null default '{}',
  governorates text[] not null default '{}',
  min_seconds integer not null default 60 check (min_seconds between 0 and 3600),
  ethics_reference text check (char_length(ethics_reference) <= 200),
  flags text[] not null default '{}',
  review_note text check (char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  opened_at timestamptz,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.surveys is
  'Club surveys: free (give to get), Bulbs- or cash-rewarded; targeted by the student badge; flagged ones wait for review.';

create index surveys_creator_idx on public.surveys (creator_id, created_at desc);
create index surveys_open_idx on public.surveys (opened_at desc) where status = 'open';
create index surveys_review_idx on public.surveys (updated_at) where status = 'review';
create index surveys_order_idx on public.surveys (order_id);
create index surveys_reviewed_by_idx on public.surveys (reviewed_by);

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  position integer not null default 0,
  kind text not null check (kind in ('single', 'multiple', 'scale', 'text', 'number')),
  prompt text not null check (char_length(prompt) between 1 and 500),
  options text[] not null default '{}' check (cardinality(options) <= 20),
  required boolean not null default true,
  -- An attention check: the option a careful respondent picks.
  attention_answer text check (char_length(attention_answer) <= 200)
);

create index survey_questions_survey_idx on public.survey_questions (survey_id, position);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  -- Counted: in time and through the attention checks (and rewarded).
  counted boolean,
  unique (survey_id, user_id)
);

create index survey_responses_user_idx on public.survey_responses (user_id);

create table public.survey_answers (
  response_id uuid not null references public.survey_responses (id) on delete cascade,
  question_id uuid not null references public.survey_questions (id) on delete cascade,
  value jsonb not null,
  primary key (response_id, question_id)
);

create index survey_answers_question_idx on public.survey_answers (question_id);

-- Free surveys: credits earned by answering and used by responses.
create table public.survey_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null check (reason in ('welcome', 'answered', 'response')),
  survey_id uuid references public.surveys (id) on delete set null,
  response_id uuid references public.survey_responses (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index survey_credits_welcome_idx on public.survey_credits (user_id) where reason = 'welcome';
create index survey_credits_user_idx on public.survey_credits (user_id);
create index survey_credits_survey_idx on public.survey_credits (survey_id);
create index survey_credits_response_idx on public.survey_credits (response_id);

create table public.survey_reports (
  survey_id uuid not null references public.surveys (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now(),
  primary key (survey_id, user_id)
);

create index survey_reports_user_idx on public.survey_reports (user_id);

alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;
alter table public.survey_credits enable row level security;
alter table public.survey_reports enable row level security;

-- Open surveys are public (to read the title and who it's for); creators
-- and support see theirs and the rest. Writes go through the functions.
create policy "Open surveys are public" on public.surveys
  for select to anon using (status = 'open');
create policy "Open surveys, your own and support's" on public.surveys
  for select to authenticated
  using (
    status = 'open'
    or creator_id = (select auth.uid())
    or (select private.has_staff_role('{support}'))
  );

create policy "Questions of surveys you can see" on public.survey_questions
  for select to anon, authenticated
  using (exists (select 1 from public.surveys s where s.id = survey_id));

create policy "Your responses; support sees all" on public.survey_responses
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

create policy "Your answers; support sees all" on public.survey_answers
  for select to authenticated
  using (
    exists (select 1 from public.survey_responses r where r.id = response_id and r.user_id = (select auth.uid()))
    or (select private.has_staff_role('{support}'))
  );

create policy "Your credits; support sees all" on public.survey_credits
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_staff_role('{support}')));

create policy "Support sees reports" on public.survey_reports
  for select to authenticated using ((select private.has_staff_role('{support}')));

grant select on public.surveys, public.survey_questions to anon, authenticated;
grant select on public.survey_responses, public.survey_answers, public.survey_credits, public.survey_reports to authenticated;

create trigger set_updated_at before update on public.surveys
  for each row execute function private.set_updated_at();

alter table public.order_items drop constraint order_items_kind_check;
alter table public.order_items add constraint order_items_kind_check
  check (kind in ('sale', 'rental', 'deposit', 'keep', 'swap', 'kit', 'survey'));

-- ── Helpers ────────────────────────────────────────────────────────────────

-- The reward a survey of this length earns: 2 Bulbs, one more for every
-- 3 questions after the first 3, at most 10.
create function private.survey_reward(questions integer)
returns integer
language sql
immutable
set search_path = ''
as $$ select least(10, greatest(2, 2 + (greatest(questions, 0) - 1) / 3)) $$;

create function private.survey_credit_balance(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(sum(c.amount), 0)::integer from public.survey_credits c where c.user_id = member $$;

-- What a creator pays for a rewarded survey: the rewards and the fee
-- (in Bulbs; ×100 for IQD).
create function private.survey_cost(reward integer, wanted integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select ceil(reward * wanted * (1 + s.survey_fee_rate / 100))::integer
  from public.store_settings s limit 1;
$$;

-- Words the question checker sends to review (Arabic and English).
create function private.survey_flags(target uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with texts as (
    select lower(s.title || ' ' || s.description) as body from public.surveys s where s.id = target
    union all
    select lower(q.prompt || ' ' || array_to_string(q.options, ' ')) from public.survey_questions q where q.survey_id = target
  ),
  topics (topic, pattern) as (values
    ('religion', '(religio|sect|sunni|shia|shiite|christian|yazidi|دين|مذهب|طائف|سني|شيع|مسيح|ايزيد|إيزيد)'),
    ('politics', '(politic|party|election|vote|militia|سياس|حزب|انتخاب|ميليشي|فصائل)'),
    ('health', '(disease|illness|diagnos|mental|depress|pregnan|hiv|مرض|تشخيص|نفسي|اكتئاب|حمل|علاج)'),
    ('sex', '(sexual|sex life|virgin|جنس|عذري)'),
    ('money', '(salary|income|debt|راتب|دخل|ديون)'),
    ('identity', '(national id|passport|card number|رقم الهوية|البطاقة الوطنية|جواز)'),
    ('contact', '(phone number|whatsapp number|your email|address|رقم الهاتف|رقم الموبايل|بريدك|عنوانك)')
  )
  select coalesce(array_agg(distinct t.topic order by t.topic), '{}')
  from topics t
  where exists (select 1 from texts x where x.body ~ t.pattern);
$$;

-- Whether the member may answer the survey (18+, targeted, not yet).
create function private.survey_open_to(target public.surveys, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.status = 'open'
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

-- ── Creating ───────────────────────────────────────────────────────────────

-- Saves a draft (new, or one of the creator's drafts) with its questions:
-- `body` is { id?, title, description, language, consent, kind, wanted,
-- students_only, universities, majors, years, governorates, min_seconds,
-- ethics_reference, questions: [{ kind, prompt, options, required,
-- attention_answer }] }.
create function private.save_survey(body jsonb)
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
      kind = coalesce(body ->> 'kind', 'free'),
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
      coalesce(body ->> 'kind', 'free'), coalesce((body ->> 'wanted')::integer, 50),
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
  return saved;
end;
$$;

create function public.save_survey(body jsonb)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$ select private.save_survey(body) $$;

-- Puts a survey live: the checker sends sensitive ones to review; free
-- ones need the creator's credits, Bulbs ones hold the rewards, cash ones
-- wait for the order to be paid.
create function private.open_survey(target public.surveys)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.surveys;
  questions integer := (select count(*) from public.survey_questions q where q.survey_id = target.id);
  per_answer integer := private.survey_reward(questions);
  cost integer;
  balance bigint;
  created public.orders;
begin
  if target.kind = 'free' then
    update public.surveys set status = 'open', opened_at = now(), reward = 0
    where id = target.id returning * into saved;
    return saved;
  end if;

  cost := private.survey_cost(per_answer, target.wanted);
  if target.kind = 'bulbs' then
    select b.available into balance from private.bulb_balance(target.creator_id) b;
    if balance < cost then
      raise exception 'Not enough Bulbs for the rewards' using errcode = 'check_violation';
    end if;
    insert into public.bulb_entries (user_id, amount, kind, reason)
    values (target.creator_id, -cost, 'redemption', 'survey_hold');
    update public.surveys set status = 'open', opened_at = now(), reward = per_answer, held = cost
    where id = target.id returning * into saved;
    return saved;
  end if;

  -- Cash: an order of the rewards (100 IQD a Bulb) and the fee.
  insert into public.orders (user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
  values (target.creator_id, 'pending', cost * 100, 0, cost * 100, 0, '{}', 'pickup', 'online')
  returning * into created;
  insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind)
  values (created.id, 'مكافآت استبيان: ' || target.title, 'Survey rewards: ' || target.title, cost * 100, 1, 'survey');
  update public.surveys set status = 'awaiting_payment', reward = per_answer, held = cost * 100, order_id = created.id
  where id = target.id returning * into saved;
  return saved;
end;
$$;

create function private.publish_survey(target uuid)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  found text[];
  saved public.surveys;
begin
  select * into survey from public.surveys s
  where s.id = target and s.creator_id = (select auth.uid()) and s.status = 'draft'
  for update;
  if survey.id is null then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  if char_length(trim(survey.consent)) < 20 then
    raise exception 'Add the consent text' using errcode = 'check_violation';
  end if;

  if survey.kind = 'free' and not exists (
    select 1 from public.survey_credits c where c.user_id = survey.creator_id and c.reason = 'welcome'
  ) then
    insert into public.survey_credits (user_id, amount, reason)
    select survey.creator_id, s.survey_welcome_credits, 'welcome'
    from public.store_settings s where s.survey_welcome_credits > 0 limit 1;
  end if;

  found := private.survey_flags(survey.id);
  if cardinality(found) > 0 then
    update public.surveys set status = 'review', flags = found where id = survey.id returning * into saved;
    return saved;
  end if;
  return private.open_survey(survey);
end;
$$;

create function public.publish_survey(target uuid)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$ select private.publish_survey(target) $$;

-- A cash survey opens when its order is paid (and is cancelled with it).
create function private.on_survey_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'paid' then
      update public.surveys set status = 'open', opened_at = now()
      where order_id = new.id and status = 'awaiting_payment';
      -- Nothing to hand over: the order is done once the survey opens, so
      -- it never waits in the store's fulfilment queue.
      if found then
        update public.orders set status = 'delivered' where id = new.id;
      end if;
    elsif new.status in ('cancelled', 'refunded') then
      update public.surveys set status = 'draft', order_id = null, held = 0, reward = 0
      where order_id = new.id and status = 'awaiting_payment';
    end if;
  end if;
  return new;
end;
$$;

create trigger on_survey_order_status
  after update of status on public.orders
  for each row execute function private.on_survey_order_status();

-- Survey reward orders send no order notifications (the survey page shows
-- where it stands); everything else as before.
create or replace function private.notify_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status <> 'pending'
    and not exists (
      select 1 from public.order_items i where i.order_id = new.id and i.kind = 'survey'
    )
  then
    perform private.notify(
      new.user_id,
      'order',
      case
        when new.fulfilment = 'pickup' and new.status = 'shipped' then 'order_ready_for_pickup'
        else 'order_' || new.status::text
      end,
      jsonb_build_object('number', new.number, 'tracking', new.tracking_number),
      '/orders/view?id=' || new.id
    );
  end if;
  return null;
end;
$$;

-- Closes a survey (the creator, support, or once it has its responses):
-- unused Bulbs come back to the creator.
create function private.finish_survey(target uuid)
returns public.surveys
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  counted integer;
  used integer;
  saved public.surveys;
begin
  select * into survey from public.surveys s where s.id = target and s.status = 'open' for update;
  if survey.id is null then
    return null;
  end if;
  select count(*) into counted from public.survey_responses r where r.survey_id = target and r.counted;
  if survey.kind = 'bulbs' then
    used := least(survey.held, private.survey_cost(survey.reward, counted));
    if survey.held - used > 0 then
      insert into public.bulb_entries (user_id, amount, kind, reason)
      values (survey.creator_id, survey.held - used, 'bonus', 'survey_refund');
    end if;
  end if;
  update public.surveys set status = 'closed', closed_at = now() where id = target returning * into saved;
  return saved;
end;
$$;

create function private.close_survey(target uuid)
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
  return private.finish_survey(target);
end;
$$;

create function public.close_survey(target uuid)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$ select private.close_survey(target) $$;

-- ── Answering ──────────────────────────────────────────────────────────────

-- Starts answering (the clock for the minimum time starts here).
create function private.start_survey(target uuid)
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

create function public.start_survey(target uuid)
returns public.survey_responses
language sql
security invoker
set search_path = ''
as $$ select private.start_survey(target) $$;

-- Sends the answers ({ question id: value }). The response counts when it
-- took the minimum time and passed the attention checks: then the
-- respondent gets a credit (free) or the reward (Bulbs, cash), and a free
-- survey uses one of its creator's credits. Full surveys close.
create function private.submit_survey(target uuid, answers jsonb)
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
  passed boolean := true;
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
      passed := false;
    end if;
    insert into public.survey_answers (response_id, question_id, value) values (response.id, question.id, value);
  end loop;

  passed := passed and now() - response.started_at >= make_interval(secs => survey.min_seconds);
  update public.survey_responses set submitted_at = now(), counted = passed
  where id = response.id returning * into saved;

  if passed then
    if survey.kind = 'free' then
      insert into public.survey_credits (user_id, amount, reason, survey_id, response_id) values
        (caller, 1, 'answered', survey.id, response.id),
        (survey.creator_id, -1, 'response', survey.id, response.id);
    elsif survey.reward > 0 then
      insert into public.bulb_entries (user_id, amount, kind, reason)
      values (caller, survey.reward, 'bonus', 'survey_answer');
    end if;
  end if;

  -- Full (or a free survey out of credits): it closes.
  if (select count(*) from public.survey_responses r where r.survey_id = target and r.counted) >= survey.wanted
    or (survey.kind = 'free' and private.survey_credit_balance(survey.creator_id) <= 0)
  then
    perform private.finish_survey(target);
  end if;
  return saved;
end;
$$;

create function public.submit_survey(target uuid, answers jsonb)
returns public.survey_responses
language sql
security invoker
set search_path = ''
as $$ select private.submit_survey(target, answers) $$;

-- Open surveys the caller can answer, newest first.
create function private.surveys_for_me()
returns setof public.surveys
language sql
stable
security definer
set search_path = ''
as $$
  select s.* from public.surveys s
  where s.status = 'open'
    and private.survey_open_to(s, (select auth.uid()))
    and not exists (
      select 1 from public.survey_responses r
      where r.survey_id = s.id and r.user_id = (select auth.uid()) and r.submitted_at is not null
    )
  order by s.opened_at desc
  limit 50;
$$;

create function public.surveys_for_me()
returns setof public.surveys
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.surveys_for_me() $$;

-- The caller's response credits.
create function private.my_survey_credits()
returns integer
language sql
stable
security definer
set search_path = ''
as $$ select private.survey_credit_balance((select auth.uid())) $$;

create function public.my_survey_credits()
returns integer
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_survey_credits() $$;

-- Someone reports a survey: it goes back to support's review.
create function private.report_survey(target uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
begin
  select * into survey from public.surveys s where s.id = target and s.status = 'open';
  if survey.id is null or (select auth.uid()) is null then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;
  insert into public.survey_reports (survey_id, user_id, reason)
  values (target, (select auth.uid()), left(trim(coalesce(reason, '')), 500))
  on conflict do nothing;
  update public.surveys set status = 'review', flags = array(select distinct unnest(flags || '{reported}'))
  where id = target;
end;
$$;

create function public.report_survey(target uuid, reason text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.report_survey(target, reason) $$;

-- The answers of the creator's survey, without who gave them: one row per
-- submitted response ({ question id: value }) and whether it counted.
create function private.survey_results(target uuid)
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
  where r.survey_id = target and r.submitted_at is not null
  order by r.submitted_at;
end;
$$;

create function public.survey_results(target uuid)
returns table (response_id uuid, submitted_at timestamptz, counted boolean, answers jsonb)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.survey_results(target) $$;

-- ── Review ─────────────────────────────────────────────────────────────────

-- Support opens a flagged (or reported) survey, or rejects it with a note.
create function private.review_survey(target uuid, approve boolean, note text default null)
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
      perform private.finish_survey(target);
      update public.surveys set status = 'rejected' where id = target;
    else
      update public.surveys set status = 'rejected' where id = target;
    end if;
    select * into saved from public.surveys where id = target;
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

create function public.review_survey(target uuid, approve boolean, note text default null)
returns public.surveys
language sql
security invoker
set search_path = ''
as $$ select private.review_survey(target, approve, note) $$;

-- ── Grants ─────────────────────────────────────────────────────────────────

revoke all on function private.set_student_profile(text, smallint, text) from public, anon;
revoke all on function public.set_student_profile(text, smallint, text) from public, anon;
revoke all on function private.survey_reward(integer) from public;
revoke all on function private.survey_credit_balance(uuid) from public, anon, authenticated;
revoke all on function private.survey_cost(integer, integer) from public;
revoke all on function private.survey_flags(uuid) from public, anon, authenticated;
revoke all on function private.survey_open_to(public.surveys, uuid) from public, anon, authenticated;
revoke all on function private.save_survey(jsonb) from public, anon;
revoke all on function public.save_survey(jsonb) from public, anon;
revoke all on function private.open_survey(public.surveys) from public, anon, authenticated;
revoke all on function private.publish_survey(uuid) from public, anon;
revoke all on function public.publish_survey(uuid) from public, anon;
revoke all on function private.on_survey_order_status() from public, anon, authenticated;
revoke all on function private.finish_survey(uuid) from public, anon, authenticated;
revoke all on function private.close_survey(uuid) from public, anon;
revoke all on function public.close_survey(uuid) from public, anon;
revoke all on function private.start_survey(uuid) from public, anon;
revoke all on function public.start_survey(uuid) from public, anon;
revoke all on function private.submit_survey(uuid, jsonb) from public, anon;
revoke all on function public.submit_survey(uuid, jsonb) from public, anon;
revoke all on function private.surveys_for_me() from public, anon;
revoke all on function public.surveys_for_me() from public, anon;
revoke all on function private.my_survey_credits() from public, anon;
revoke all on function public.my_survey_credits() from public, anon;
revoke all on function private.report_survey(uuid, text) from public, anon;
revoke all on function public.report_survey(uuid, text) from public, anon;
revoke all on function private.survey_results(uuid) from public, anon;
revoke all on function public.survey_results(uuid) from public, anon;
revoke all on function private.review_survey(uuid, boolean, text) from public, anon;
revoke all on function public.review_survey(uuid, boolean, text) from public, anon;

grant execute on function private.set_student_profile(text, smallint, text) to authenticated;
grant execute on function public.set_student_profile(text, smallint, text) to authenticated;
grant execute on function private.survey_reward(integer) to anon, authenticated;
grant execute on function private.survey_cost(integer, integer) to anon, authenticated;
grant execute on function private.save_survey(jsonb) to authenticated;
grant execute on function public.save_survey(jsonb) to authenticated;
grant execute on function private.publish_survey(uuid) to authenticated;
grant execute on function public.publish_survey(uuid) to authenticated;
grant execute on function private.close_survey(uuid) to authenticated;
grant execute on function public.close_survey(uuid) to authenticated;
grant execute on function private.start_survey(uuid) to authenticated;
grant execute on function public.start_survey(uuid) to authenticated;
grant execute on function private.submit_survey(uuid, jsonb) to authenticated;
grant execute on function public.submit_survey(uuid, jsonb) to authenticated;
grant execute on function private.surveys_for_me() to authenticated;
grant execute on function public.surveys_for_me() to authenticated;
grant execute on function private.my_survey_credits() to authenticated;
grant execute on function public.my_survey_credits() to authenticated;
grant execute on function private.report_survey(uuid, text) to authenticated;
grant execute on function public.report_survey(uuid, text) to authenticated;
grant execute on function private.survey_results(uuid) to authenticated;
grant execute on function public.survey_results(uuid) to authenticated;
grant execute on function private.review_survey(uuid, boolean, text) to authenticated;
grant execute on function public.review_survey(uuid, boolean, text) to authenticated;
