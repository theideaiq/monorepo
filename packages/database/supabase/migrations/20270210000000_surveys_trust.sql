-- Surveys, part 3: perks for respondents, privacy and rules for creators
-- (owner's master brief, step 10, section 20).
--
-- * Who runs it and why: every survey names who runs it (`run_by`, "AUIB",
--   "Thesis research, AUIB") and its purpose (academic, market or
--   community research), shown on the survey; publishing needs both.
-- * Results summary: when a survey closes, its respondents see a summary
--   (`survey_summary`). The creator can turn it off for academic surveys
--   only (`share_summary`).
-- * Contributor record (`my_survey_record`): counted answers for the
--   badge on the Pass card (10, 50 and 200) and the surveys answered for
--   the participation certificate (titles, dates and counts, never
--   answers).
-- * Small groups stay hidden: the summary shows no count under 5.
-- * Retention: raw answers are deleted 24 months after the survey closes,
--   or up to 120 when the ethics reference states longer (`keep_months`,
--   only with an ethics reference). The creator is told 30 days before.
--   `sweep_surveys` (daily) does both.
-- * Rules for creators: the question checker also flags advertising;
--   academic surveys on sensitive topics need the ethics reference as
--   well as review; deception studies need the ethics reference and a
--   debrief, shown only to people who submitted, and always go to review.
-- * Check questions: `survey_questions.is_attention` says which questions
--   are checks; the creator and support read the expected answers with
--   `survey_attention_answers`. A later migration hides the column from
--   respondents once the apps stop reading it.

alter table public.surveys
  add column run_by text check (char_length(run_by) <= 120),
  add column purpose text check (purpose in ('academic', 'market', 'community')),
  add column share_summary boolean not null default true,
  add column deception boolean not null default false,
  add column keep_months smallint not null default 24 check (keep_months between 24 and 120),
  add column answers_warned_at timestamptz,
  add column answers_deleted_at timestamptz,
  add constraint surveys_summary_academic check (share_summary or purpose = 'academic'),
  add constraint surveys_keep_ethics check (keep_months = 24 or ethics_reference is not null),
  add constraint surveys_deception_ethics check (not deception or ethics_reference is not null);

comment on column public.surveys.run_by is 'Who runs the survey, shown on it: a university, an organization or a person.';
comment on column public.surveys.purpose is 'Why: academic, market or community research. Shown with run_by.';
comment on column public.surveys.share_summary is 'Respondents see a results summary when it closes; only academic surveys may turn it off.';
comment on column public.surveys.deception is 'A deception study: needs the ethics reference and a debrief shown after submitting.';
comment on column public.surveys.keep_months is 'Months after closing before the raw answers are deleted; over 24 only with an ethics reference.';

create index surveys_retention_idx on public.surveys (closed_at) where answers_deleted_at is null;

-- The debrief of a deception study, read only by people who submitted.
create table public.survey_debriefs (
  survey_id uuid primary key references public.surveys (id) on delete cascade,
  body text not null check (char_length(body) between 20 and 3000)
);

comment on table public.survey_debriefs is
  'The debrief of a deception study: shown to respondents after they submit, never before.';

alter table public.survey_debriefs enable row level security;

create policy "Debriefs: the creator, support and people who submitted" on public.survey_debriefs
  for select to authenticated
  using (
    exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and (s.creator_id = (select auth.uid()) or (select private.has_staff_role('{support}')))
    )
    or exists (
      select 1 from public.survey_responses r
      where r.survey_id = survey_debriefs.survey_id and r.user_id = (select auth.uid()) and r.submitted_at is not null
    )
  );

alter table public.survey_questions
  add column is_attention boolean generated always as (attention_answer is not null) stored;

comment on column public.survey_questions.is_attention is 'A check question; the expected answer is for the creator and support only.';

-- ── Check questions ────────────────────────────────────────────────────────

create function private.survey_attention_answers(target uuid)
returns table (question_id uuid, answer text)
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
  select q.id, q.attention_answer from public.survey_questions q
  where q.survey_id = target and q.attention_answer is not null
  order by q.position;
end;
$$;

create function public.survey_attention_answers(target uuid)
returns table (question_id uuid, answer text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.survey_attention_answers(target) $$;

revoke all on function private.survey_attention_answers(uuid) from public, anon;
revoke all on function public.survey_attention_answers(uuid) from public, anon;
grant execute on function private.survey_attention_answers(uuid) to authenticated;
grant execute on function public.survey_attention_answers(uuid) to authenticated;

-- ── The question checker ───────────────────────────────────────────────────

-- Sensitive topics, asking for contact details and advertising go to review.
create or replace function private.survey_flags(target uuid)
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
    ('contact', '(phone number|whatsapp number|your email|address|رقم الهاتف|رقم الموبايل|بريدك|عنوانك)'),
    ('advertising', '(discount|promo code|coupon|buy now|order now|special offer|free trial|خصم|كود الخصم|كوبون|اشتر[يى] الآن|اطلب الآن|عرض خاص)')
  )
  select coalesce(array_agg(distinct t.topic order by t.topic), '{}')
  from topics t
  where exists (select 1 from texts x where x.body ~ t.pattern);
$$;

-- ── Creating ───────────────────────────────────────────────────────────────

-- Saves a draft as before, with who runs it and why, the summary, the
-- deception study's debrief and how long answers are kept. A value that
-- needs the ethics reference falls back without one (a draft may be
-- incomplete; publishing checks the rest).
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
  ethics text := nullif(trim(coalesce(body ->> 'ethics_reference', '')), '');
  aim text := nullif(body ->> 'purpose', '');
  runner text := nullif(trim(coalesce(body ->> 'run_by', '')), '');
  summary boolean := coalesce((body ->> 'share_summary')::boolean, true) or aim is distinct from 'academic';
  deceives boolean := coalesce((body ->> 'deception')::boolean, false) and ethics is not null;
  months smallint := case when ethics is null then 24 else coalesce((body ->> 'keep_months')::smallint, 24) end;
  debrief text := nullif(trim(coalesce(body ->> 'debrief', '')), '');
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
      ethics_reference = ethics,
      quotas = private.survey_quotas(body -> 'quotas'),
      run_by = runner,
      purpose = aim,
      share_summary = summary,
      deception = deceives,
      keep_months = months
    where s.id = (body ->> 'id')::uuid and s.creator_id = caller and s.status = 'draft'
    returning * into saved;
    if saved.id is null then
      raise exception 'Survey not found' using errcode = 'no_data_found';
    end if;
    delete from public.survey_questions where survey_id = saved.id;
  else
    insert into public.surveys (
      creator_id, title, description, language, consent, kind, wanted, students_only,
      universities, majors, years, governorates, min_seconds, ethics_reference, quotas,
      run_by, purpose, share_summary, deception, keep_months
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
      ethics,
      private.survey_quotas(body -> 'quotas'),
      runner, aim, summary, deceives, months
    )
    returning * into saved;
  end if;

  if deceives and debrief is not null then
    insert into public.survey_debriefs (survey_id, body) values (saved.id, left(debrief, 3000))
    on conflict (survey_id) do update set body = excluded.body;
  else
    delete from public.survey_debriefs where survey_id = saved.id;
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

-- Publishing needs who runs it and why. Academic surveys on sensitive
-- topics need the ethics reference; deception studies need their debrief
-- and always go to review.
create or replace function private.publish_survey(target uuid)
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
  if survey.run_by is null or char_length(survey.run_by) < 2 or survey.purpose is null then
    raise exception 'Say who runs the survey and why' using errcode = 'check_violation';
  end if;
  if survey.deception and not exists (select 1 from public.survey_debriefs d where d.survey_id = survey.id) then
    raise exception 'Add the debrief' using errcode = 'check_violation';
  end if;

  found := private.survey_flags(survey.id);
  if survey.purpose = 'academic' and survey.ethics_reference is null
    and found && array['religion', 'politics', 'health', 'sex']
  then
    raise exception 'Add the ethics reference' using errcode = 'check_violation';
  end if;
  if survey.deception then
    found := array(select distinct unnest(found || '{deception}') order by 1);
  end if;

  if survey.kind = 'free' and not exists (
    select 1 from public.survey_credits c where c.user_id = survey.creator_id and c.reason = 'welcome'
  ) then
    insert into public.survey_credits (user_id, amount, reason)
    select survey.creator_id, s.survey_welcome_credits, 'welcome'
    from public.store_settings s where s.survey_welcome_credits > 0 limit 1;
  end if;

  if cardinality(found) > 0 then
    update public.surveys set status = 'review', flags = found where id = survey.id returning * into saved;
    return saved;
  end if;
  return private.open_survey(survey);
end;
$$;

-- ── Perks for respondents ──────────────────────────────────────────────────

-- When a survey closes (with its summary on), its respondents see how
-- people answered the choice and scale questions, over the counted
-- responses. No count under 5 is shown, and no summary at all under 5
-- responses. Free-text and number answers and check questions are left out.
create function private.survey_summary(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  survey public.surveys;
  total integer;
begin
  select * into survey from public.surveys s where s.id = target;
  if survey.id is null or not (
    survey.creator_id = caller
    or private.has_staff_role('{support}')
    or (
      survey.status = 'closed' and survey.share_summary
      and exists (
        select 1 from public.survey_responses r
        where r.survey_id = target and r.user_id = caller and r.submitted_at is not null and r.withdrawn_at is null
      )
    )
  ) then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;

  select count(*) into total from public.survey_responses r
  where r.survey_id = target and r.counted and r.withdrawn_at is null;

  return jsonb_build_object(
    'title', survey.title,
    'run_by', survey.run_by,
    'purpose', survey.purpose,
    'closed_at', survey.closed_at,
    'responses', total,
    'questions', case when total < 5 or survey.answers_deleted_at is not null then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'kind', q.kind, 'prompt', q.prompt,
        'answered', (select case when count(*) < 5 then null else count(*) end from public.survey_answers a
          join public.survey_responses r on r.id = a.response_id and r.counted and r.withdrawn_at is null
          where a.question_id = q.id),
        'options', (
          select jsonb_agg(jsonb_build_object('label', o.label, 'count', case when o.n < 5 then null else o.n end) order by o.place)
          from (
            select opt.label, opt.place, (
              select count(*) from public.survey_answers a
              join public.survey_responses r on r.id = a.response_id and r.counted and r.withdrawn_at is null
              where a.question_id = q.id and (
                (jsonb_typeof(a.value) = 'array' and a.value ? opt.label)
                or (jsonb_typeof(a.value) <> 'array' and a.value #>> '{}' = opt.label)
              )
            ) as n
            from unnest(case when q.kind = 'scale' then array['1', '2', '3', '4', '5'] else q.options end)
              with ordinality as opt (label, place)
          ) o
        )
      ) order by q.position)
      from public.survey_questions q
      where q.survey_id = target and q.kind in ('single', 'multiple', 'scale') and q.attention_answer is null
    ), '[]'::jsonb) end
  );
end;
$$;

create function public.survey_summary(target uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.survey_summary(target) $$;

revoke all on function private.survey_summary(uuid) from public, anon;
revoke all on function public.survey_summary(uuid) from public, anon;
grant execute on function private.survey_summary(uuid) to authenticated;
grant execute on function public.survey_summary(uuid) to authenticated;

-- The caller's answers: how many counted (for the contributor badge at 10,
-- 50 and 200) and each survey they submitted (title, who runs it, when,
-- whether it counted, whether its summary is ready), for Club → Yours and
-- the participation certificate. Never the answers themselves.
create function private.my_survey_record()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select r.survey_id, r.submitted_at, coalesce(r.counted, false) as counted,
      s.title, s.run_by, s.purpose, s.status = 'closed' and s.share_summary as summary
    from public.survey_responses r
    join public.surveys s on s.id = r.survey_id
    where r.user_id = (select auth.uid()) and r.submitted_at is not null and r.withdrawn_at is null
  ), total as (
    select count(*) filter (where counted)::integer as n from mine
  )
  select jsonb_build_object(
    'counted', t.n,
    'level', case when t.n >= 200 then 200 when t.n >= 50 then 50 when t.n >= 10 then 10 else 0 end,
    'next', case when t.n >= 200 then null when t.n >= 50 then 200 when t.n >= 10 then 50 else 10 end,
    'surveys', coalesce((
      select jsonb_agg(jsonb_build_object(
        'survey_id', m.survey_id, 'title', m.title, 'run_by', m.run_by, 'purpose', m.purpose,
        'submitted_at', m.submitted_at, 'counted', m.counted, 'summary', m.summary
      ) order by m.submitted_at desc)
      from mine m
    ), '[]'::jsonb)
  )
  from total t;
$$;

create function public.my_survey_record()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.my_survey_record() $$;

revoke all on function private.my_survey_record() from public, anon;
revoke all on function public.my_survey_record() from public, anon;
grant execute on function private.my_survey_record() to authenticated;
grant execute on function public.my_survey_record() to authenticated;

-- ── Retention ──────────────────────────────────────────────────────────────

-- Daily: open surveys past their 60 days close; the creator is told 30
-- days before a closed survey's raw answers are deleted, and on the day
-- they are (the counts, the "who answered" box and the summary's totals stay).
create or replace function public.sweep_surveys()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  due uuid;
  closed integer := 0;
  survey public.surveys;
begin
  for due in
    select s.id from public.surveys s
    where s.status = 'open' and s.closes_at is not null and s.closes_at <= now()
  loop
    perform private.end_survey(due, false);
    closed := closed + 1;
  end loop;

  for survey in
    select * from public.surveys s
    where s.closed_at is not null and s.answers_deleted_at is null and s.answers_warned_at is null
      and s.closed_at + make_interval(months => s.keep_months) - interval '30 days' <= now()
    for update skip locked
  loop
    update public.surveys set answers_warned_at = now() where id = survey.id;
    perform private.notify(survey.creator_id, 'system', 'survey_answers_expiring',
      jsonb_build_object('title', survey.title,
        'date', (survey.closed_at + make_interval(months => survey.keep_months))::date),
      '/club#yours');
  end loop;

  for survey in
    select * from public.surveys s
    where s.closed_at is not null and s.answers_deleted_at is null
      and s.closed_at + make_interval(months => s.keep_months) <= now()
    for update skip locked
  loop
    delete from public.survey_answers a
    using public.survey_responses r
    where r.id = a.response_id and r.survey_id = survey.id;
    update public.surveys set answers_deleted_at = now() where id = survey.id;
    perform private.notify(survey.creator_id, 'system', 'survey_answers_deleted',
      jsonb_build_object('title', survey.title), '/club#yours');
  end loop;
  return closed;
end;
$$;
