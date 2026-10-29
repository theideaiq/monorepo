-- Surveys, part 2: bias controls (owner's master brief, step 10, section 20).
--
-- * Trusted respondents: after 20 counted answers, with no failed check
--   question in their last 10, a respondent sees Boosted surveys 24 hours
--   early. In that window they fill at most half the target. The numbers
--   are store settings.
-- * Rotation: in the early window, a trusted respondent who answered
--   another survey early in the last 24 hours waits, so the early places
--   go round the trusted respondents.
-- * Daily limit: at most 5 Boosted surveys a day each (a setting).
-- * Boosted surveys need a verified phone that no other Pass has verified:
--   one Pass per person. Phones can only be verified once Twilio is set
--   up, so this follows `store_settings.require_verified_phone` (on with
--   Twilio, see the launch checklist).
-- * Quotas: a creator caps the share of responses from any one value of a
--   targeting field (university, major, year, governorate); never on
--   sensitive attributes. Each response keeps the respondent's targeting
--   values as they were when they started.
-- * "Who answered" (`survey_audience`): the breakdown by targeting fields
--   against the target, how many started, finished and were excluded, and
--   the median time. Groups smaller than 5 people are never shown.

alter table public.store_settings
  add column survey_trusted_answers smallint not null default 20 check (survey_trusted_answers between 1 and 1000),
  add column survey_trusted_window smallint not null default 10 check (survey_trusted_window between 1 and 100),
  add column survey_early_hours smallint not null default 24 check (survey_early_hours between 0 and 168),
  add column survey_early_share smallint not null default 50 check (survey_early_share between 0 and 100),
  add column survey_daily_boosted smallint not null default 5 check (survey_daily_boosted between 1 and 100);

comment on column public.store_settings.survey_trusted_answers is 'Counted survey answers before a respondent is trusted (sees Boosted surveys early).';
comment on column public.store_settings.survey_trusted_window is 'A trusted respondent has failed no check question in this many latest answers.';
comment on column public.store_settings.survey_early_hours is 'How long trusted respondents have a new Boosted survey to themselves.';
comment on column public.store_settings.survey_early_share is 'The share of a Boosted survey''s target the early window may fill (%).';
comment on column public.store_settings.survey_daily_boosted is 'Boosted surveys one person may answer in a day (Baghdad time).';

grant update (survey_trusted_answers, survey_trusted_window, survey_early_hours, survey_early_share, survey_daily_boosted)
  on public.store_settings to authenticated;

alter table public.surveys
  add column quotas jsonb not null default '{}'::jsonb check (jsonb_typeof(quotas) = 'object');

comment on column public.surveys.quotas is
  'The largest share (%) of the target from any one value of a targeting field: {"university": 40, "governorate": 50}.';

alter table public.survey_responses
  add column respondent jsonb not null default '{}'::jsonb,
  add column early boolean not null default false;

comment on column public.survey_responses.respondent is
  'The respondent''s targeting values when they started (university, major, year, governorate), for quotas and "Who answered".';
comment on column public.survey_responses.early is 'Started in the trusted respondents'' early window.';

-- ── Who may answer ─────────────────────────────────────────────────────────

-- A quota body from the builder: only targeting fields, each 1 to 100 %.
create function private.survey_quotas(body jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(q.key, least(100, greatest(1, q.value::integer))), '{}'::jsonb)
  from jsonb_each_text(case when jsonb_typeof(body) = 'object' then body else '{}'::jsonb end) q
  where q.key in ('university', 'major', 'year', 'governorate') and q.value ~ '^[0-9]+$';
$$;

-- The member's targeting values, from their Student badge.
create function private.respondent_profile(member uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'university', b.university_id,
      'major', nullif(lower(trim(b.major)), ''),
      'year', b.study_year::text,
      'governorate', b.governorate
    ))
    from public.student_badges b
    where b.user_id = member and b.valid_until >= private.baghdad_today()
  ), '{}'::jsonb);
$$;

-- A verified phone that only this Pass has verified: one Pass per person.
create function private.has_own_phone(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select v.phone from public.verified_phones v where v.user_id = member
    union
    select '+' || u.phone from auth.users u
    where u.id = member and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> ''
  )
  select exists (
    select 1 from mine m
    where not exists (
      select 1 from public.verified_phones v where v.phone = m.phone and v.user_id <> member
    ) and not exists (
      select 1 from auth.users u
      where u.id <> member and u.phone_confirmed_at is not null and '+' || u.phone = m.phone
    )
  );
$$;

-- Trusted: enough counted answers, and no failed check question lately.
create function private.is_trusted_respondent(member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.survey_responses r where r.user_id = member and r.counted)
      >= st.survey_trusted_answers
    and not exists (
      select 1 from (
        select r.failed_checks, row_number() over (order by r.submitted_at desc) as place
        from public.survey_responses r
        where r.user_id = member and r.submitted_at is not null
      ) latest
      where latest.place <= st.survey_trusted_window and latest.failed_checks > 0
    )
  from public.store_settings st
  limit 1;
$$;

-- In a Boosted survey's early window only trusted respondents answer, up
-- to the early share of the target, and one who answered another survey
-- early in the last 24 hours waits their turn. After it, everyone may.
create function private.survey_early_ok(target public.surveys, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target.opened_at is null
    or now() >= target.opened_at + make_interval(hours => st.survey_early_hours)
    or exists (select 1 from public.survey_responses r where r.survey_id = target.id and r.user_id = member)
    or (
      private.is_trusted_respondent(member)
      and (select count(*) from public.survey_responses r
           where r.survey_id = target.id and r.early and r.withdrawn_at is null)
        < ceil(target.wanted * st.survey_early_share / 100.0)
      and not exists (
        select 1 from public.survey_responses r
        where r.user_id = member and r.early and r.survey_id <> target.id
          and r.started_at > now() - interval '24 hours'
      )
    )
  from public.store_settings st
  limit 1;
$$;

-- Boosted surveys the member started today (Baghdad time).
create function private.boosted_today(member uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.survey_responses r
  join public.surveys s on s.id = r.survey_id
  where r.user_id = member and s.kind = 'boosted'
    and (r.started_at at time zone 'Asia/Baghdad')::date = private.baghdad_today();
$$;

-- Whether the member's value of a quota field already has its share:
-- counted responses, plus answers started in the last hour.
create function private.survey_quota_full(target public.surveys, member uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select private.respondent_profile(member) as profile)
  select exists (
    select 1
    from jsonb_each_text(target.quotas) q, me
    where me.profile ? q.key
      and (
        select count(*) from public.survey_responses r
        where r.survey_id = target.id and r.withdrawn_at is null
          and r.respondent ->> q.key = me.profile ->> q.key
          and (r.counted or (r.submitted_at is null and r.started_at > now() - interval '1 hour'))
      ) >= ceil(target.wanted * q.value::integer / 100.0)
  );
$$;

revoke all on function private.survey_quotas(jsonb) from public, anon, authenticated;
revoke all on function private.respondent_profile(uuid) from public, anon, authenticated;
revoke all on function private.has_own_phone(uuid) from public, anon, authenticated;
revoke all on function private.is_trusted_respondent(uuid) from public, anon, authenticated;
revoke all on function private.survey_early_ok(public.surveys, uuid) from public, anon, authenticated;
revoke all on function private.boosted_today(uuid) from public, anon, authenticated;
revoke all on function private.survey_quota_full(public.surveys, uuid) from public, anon, authenticated;

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
    and (target.kind <> 'boosted' or (
      (private.has_own_phone(member)
        or not (select st.require_verified_phone from public.store_settings st))
      and private.survey_early_ok(target, member)
    ))
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
  if survey.kind = 'boosted' and not exists (
    select 1 from public.survey_responses r where r.survey_id = target and r.user_id = caller
  ) then
    if private.boosted_today(caller) >= (select st.survey_daily_boosted from public.store_settings st) then
      raise exception 'You''ve answered enough Boosted surveys today' using errcode = 'check_violation';
    end if;
    if private.survey_quota_full(survey, caller) then
      raise exception 'This survey has enough answers from people like you' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.survey_responses (survey_id, user_id, respondent, early)
  values (target, caller, private.respondent_profile(caller),
    survey.kind = 'boosted' and now() < survey.opened_at + make_interval(hours => (select st.survey_early_hours from public.store_settings st)))
  on conflict (survey_id, user_id) do update set started_at = excluded.started_at
    where survey_responses.submitted_at is null
  returning * into saved;
  if saved.id is null then
    raise exception 'You already answered this survey' using errcode = 'check_violation';
  end if;
  return saved;
end;
$$;

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
      ethics_reference = nullif(trim(coalesce(body ->> 'ethics_reference', '')), ''),
      quotas = private.survey_quotas(body -> 'quotas')
    where s.id = (body ->> 'id')::uuid and s.creator_id = caller and s.status = 'draft'
    returning * into saved;
    if saved.id is null then
      raise exception 'Survey not found' using errcode = 'no_data_found';
    end if;
    delete from public.survey_questions where survey_id = saved.id;
  else
    insert into public.surveys (
      creator_id, title, description, language, consent, kind, wanted, students_only,
      universities, majors, years, governorates, min_seconds, ethics_reference, quotas
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
      nullif(trim(coalesce(body ->> 'ethics_reference', '')), ''),
      private.survey_quotas(body -> 'quotas')
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

-- Whether the caller can answer Boosted surveys, and what they lack: a
-- phone of their own, or today's limit (for the Club's Join list).
create function private.my_survey_access()
returns table (own_phone boolean, phone_required boolean, trusted boolean, boosted_today integer, daily_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_own_phone((select auth.uid())), st.require_verified_phone,
    private.is_trusted_respondent((select auth.uid())),
    private.boosted_today((select auth.uid())), st.survey_daily_boosted::integer
  from public.store_settings st
  limit 1;
$$;

create function public.my_survey_access()
returns table (own_phone boolean, phone_required boolean, trusted boolean, boosted_today integer, daily_limit integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_survey_access() $$;

revoke all on function private.my_survey_access() from public, anon;
revoke all on function public.my_survey_access() from public, anon;
grant execute on function private.my_survey_access() to authenticated;
grant execute on function public.my_survey_access() to authenticated;

-- ── Who answered ───────────────────────────────────────────────────────────

-- For the creator and support: how many started, finished and were
-- excluded, the median time, and the respondents by targeting field
-- against the target. Groups smaller than 5 are folded into "other".
create function private.survey_audience(target uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  survey public.surveys;
  result jsonb;
begin
  select * into survey from public.surveys s
  where s.id = target and (s.creator_id = (select auth.uid()) or private.has_staff_role('{support}'));
  if survey.id is null then
    raise exception 'Survey not found' using errcode = 'no_data_found';
  end if;

  with responses as (
    select r.* from public.survey_responses r where r.survey_id = target and r.withdrawn_at is null
  ), counted as (
    select * from responses where counted
  ), fields (field) as (values ('university'), ('major'), ('year'), ('governorate')
  ), groups as (
    select f.field, coalesce(c.respondent ->> f.field, '') as value, count(*) as n
    from fields f cross join counted c
    group by f.field, coalesce(c.respondent ->> f.field, '')
  ), shown as (
    select g.field,
      case when g.value = '' then 'unknown' when g.n < 5 then 'other' else g.value end as value,
      sum(g.n)::integer as n
    from groups g
    group by 1, 2
  )
  select jsonb_build_object(
    'wanted', survey.wanted,
    'started', (select count(*) from responses),
    'finished', (select count(*) from responses where submitted_at is not null),
    'counted', (select count(*) from counted),
    'excluded', (select count(*) from responses where submitted_at is not null and not counted),
    'median_seconds', coalesce(survey.median_seconds,
      (select percentile_cont(0.5) within group (order by seconds)::integer from counted where seconds is not null)),
    'breakdown', coalesce((
      select jsonb_object_agg(x.field, x.rows) from (
        select s.field, jsonb_agg(jsonb_build_object('value', s.value, 'count', s.n) order by s.n desc) as rows
        from shown s
        -- an "other" smaller than 5 would still single people out
        where not (s.value = 'other' and s.n < 5)
        group by s.field
      ) x
    ), '{}'::jsonb),
    'targets', jsonb_build_object(
      'universities', to_jsonb(survey.universities), 'majors', to_jsonb(survey.majors),
      'years', to_jsonb(survey.years), 'governorates', to_jsonb(survey.governorates)
    ),
    'quotas', survey.quotas
  ) into result;
  return result;
end;
$$;

create function public.survey_audience(target uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.survey_audience(target) $$;

revoke all on function private.survey_audience(uuid) from public, anon;
revoke all on function public.survey_audience(uuid) from public, anon;
grant execute on function private.survey_audience(uuid) to authenticated;
grant execute on function public.survey_audience(uuid) to authenticated;
