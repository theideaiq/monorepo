-- Surveys, part 3 (owner's master brief, step 10): who runs it and why, the rules
-- for academic and deception studies, check answers kept from respondents, the
-- results summary, the contributor record and how long answers are kept.
begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy between the preamble
-- markers (pg_prove runs files in isolation); `bun run --cwd
-- packages/database db:test:sync` rewrites them, `db:test` fails when stale.
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

-- Act as a signed-in user. Customers sign in with SMS (aal1); staff with an
-- authenticator app, so pass 'aal2' to act as staff. `extra` adds claims
-- (for example '{"phone":"9647700000004"}').
create function pg_temp.login_as(user_id uuid, aal text default 'aal1', extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    (jsonb_build_object('sub', user_id, 'role', 'authenticated', 'aal', aal) || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Act as a visitor (publishable key, no session).
create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Back to the superuser, to arrange fixtures or read without RLS.
create function pg_temp.reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema pg_temp to public;
-- </preamble>
select plan(19);

truncate public.orders, public.bulb_entries cascade;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000aa01', 'tc@example.iq', '{"full_name":"Creator"}'),
  ('00000000-0000-0000-0000-00000000aa02', 'tr@example.iq', '{"full_name":"Respondent"}'),
  ('00000000-0000-0000-0000-00000000aa03', 'to@example.iq', '{"full_name":"Other"}');
update public.profiles set birthday = date '1995-01-01' where birthday is null;
insert into public.student_badges (user_id, university_id, valid_until, method) values
  ('00000000-0000-0000-0000-00000000aa01', 'auib', private.baghdad_today() + 100, 'email');
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- ── Who runs it and why ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa01');
insert into ids select 'plain', (public.save_survey('{
  "title": "Campus food", "share_summary": false, "keep_months": 60,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "single", "prompt": "Lunch?", "options": ["Yes", "No"]}]}')).id;
select throws_ok($$ select public.publish_survey((select id from ids where name = 'plain')) $$, '23514',
  'Say who runs the survey and why', 'a survey says who runs it and why before it opens');
select results_eq($$ select share_summary, keep_months from public.surveys where id = (select id from ids where name = 'plain') $$,
  $$ values (true, 24::smallint) $$, 'only academic surveys turn the summary off; longer keeping needs an ethics reference');

-- ── Academic surveys on sensitive topics ──
insert into ids select 'health', (public.save_survey('{
  "run_by": "Thesis research, AUIB", "purpose": "academic", "title": "Student health", "share_summary": false,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "single", "prompt": "Have you had depression?", "options": ["Yes", "No"]}]}')).id;
select is((select share_summary from public.surveys where id = (select id from ids where name = 'health')), false,
  'an academic survey may turn the summary off');
select throws_ok($$ select public.publish_survey((select id from ids where name = 'health')) $$, '23514',
  'Add the ethics reference', 'an academic survey on a sensitive topic needs the ethics reference');
select public.save_survey(jsonb_build_object('id', (select id from ids where name = 'health'),
  'run_by', 'Thesis research, AUIB', 'purpose', 'academic', 'title', 'Student health', 'share_summary', false,
  'ethics_reference', 'AUIB-IRB-2026-14', 'keep_months', 36,
  'consent', 'Your answers are anonymous and used for research only.',
  'questions', '[{"kind": "single", "prompt": "Have you had depression?", "options": ["Yes", "No"]}]'::jsonb));
select results_eq($$ select (s).status, (s).flags, (s).keep_months from (select public.publish_survey((select id from ids where name = 'health')) as s) x $$,
  $$ values ('review', '{health}'::text[], 36::smallint) $$, 'with it, the survey still goes to review and keeps answers longer');

-- ── Deception studies ──
insert into ids select 'trick', (public.save_survey('{
  "run_by": "AUIB", "purpose": "academic", "title": "Reading speed", "deception": true, "ethics_reference": "AUIB-IRB-2026-15",
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "number", "prompt": "Words a minute"}]}')).id;
select throws_ok($$ select public.publish_survey((select id from ids where name = 'trick')) $$, '23514',
  'Add the debrief', 'a deception study needs its debrief');
select public.save_survey(jsonb_build_object('id', (select id from ids where name = 'trick'),
  'run_by', 'AUIB', 'purpose', 'academic', 'title', 'Reading speed', 'deception', true, 'ethics_reference', 'AUIB-IRB-2026-15',
  'debrief', 'This study measured how a timer changes reading, not reading speed itself.',
  'consent', 'Your answers are anonymous and used for research only.',
  'questions', '[{"kind": "number", "prompt": "Words a minute"}]'::jsonb));
select results_eq($$ select (s).status, (s).flags from (select public.publish_survey((select id from ids where name = 'trick')) as s) x $$,
  $$ values ('review', '{deception}'::text[]) $$, 'a deception study always goes to review');
select is((select count(*)::integer from public.survey_debriefs), 1, 'the creator sees the debrief');
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa03');
select is((select count(*)::integer from public.survey_debriefs), 0, 'no one else sees it before submitting');
select pg_temp.reset_role();
insert into public.survey_responses (survey_id, user_id, submitted_at, counted)
values ((select id from ids where name = 'trick'), '00000000-0000-0000-0000-00000000aa03', now(), true);
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa03');
select is((select count(*)::integer from public.survey_debriefs), 1, 'a respondent sees it once they submit');

-- ── The question checker and check questions ──
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa01');
insert into ids select 'ad', (public.save_survey('{
  "run_by": "Shop", "purpose": "market", "title": "Use promo code SAVE10 today",
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "single", "prompt": "Pick Blue", "options": ["Red", "Blue"], "attention_answer": "Blue"},
                {"kind": "single", "prompt": "Coffee or tea?", "options": ["Coffee", "Tea"]}]}')).id;
select pg_temp.reset_role();
select ok('advertising' = any (private.survey_flags((select id from ids where name = 'ad'))), 'advertising goes to review');
select is((select array_agg(is_attention order by position) from public.survey_questions where survey_id = (select id from ids where name = 'ad')),
  '{t,f}'::boolean[], 'check questions are marked');
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa01');
select results_eq($$ select answer from public.survey_attention_answers((select id from ids where name = 'ad')) $$,
  $$ values ('Blue') $$, 'the creator reads the expected answers');
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa02');
select throws_ok($$ select public.survey_attention_answers((select id from ids where name = 'ad')) $$, 'P0002', null,
  'respondents can''t');

-- ── The results summary ──
-- Six counted answers: five Coffee, one Tea.
select pg_temp.reset_role();
update public.surveys set status = 'closed', opened_at = now() - interval '2 days', closed_at = now() where id = (select id from ids where name = 'ad');
insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000ab0' || lpad(g::text, 2, '0'))::uuid, 'ts' || g || '@example.iq' from generate_series(1, 5) g;
insert into public.survey_responses (id, survey_id, user_id, submitted_at, counted)
select ('aa000000-0000-0000-0000-0000000ab0' || lpad(g::text, 2, '0'))::uuid, (select id from ids where name = 'ad'),
  case when g = 6 then '00000000-0000-0000-0000-00000000aa02'::uuid else ('00000000-0000-0000-0000-0000000ab0' || lpad(g::text, 2, '0'))::uuid end,
  now(), true
from generate_series(1, 6) g;
insert into public.survey_answers (response_id, question_id, value)
select r.id, q.id, case when r.user_id = '00000000-0000-0000-0000-00000000aa02' then '"Tea"'::jsonb else '"Coffee"'::jsonb end
from public.survey_responses r, public.survey_questions q
where r.survey_id = (select id from ids where name = 'ad') and q.survey_id = r.survey_id and not q.is_attention;
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa02');
select results_eq(
  $$ select (s ->> 'responses')::int, s #> '{questions,0,options}' from public.survey_summary((select id from ids where name = 'ad')) s $$,
  $$ values (6, '[{"count": 5, "label": "Coffee"}, {"count": null, "label": "Tea"}]'::jsonb) $$,
  'respondents see the summary, with no count under 5 and no check questions'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa03');
select throws_ok($$ select public.survey_summary((select id from ids where name = 'ad')) $$, 'P0002', null,
  'only people who answered see the summary');

-- ── The contributor record ──
select pg_temp.reset_role();
insert into public.surveys (id, creator_id, title, consent, kind, status, wanted, opened_at, closed_at)
select ('aa000000-0000-0000-0000-0000001' || lpad(g::text, 5, '0'))::uuid, '00000000-0000-0000-0000-00000000aa01', 'Old ' || g,
  'Consent text long enough to pass.', 'free', 'closed', 100, now() - interval '30 days', now() - interval '20 days'
from generate_series(1, 9) g;
insert into public.survey_responses (survey_id, user_id, submitted_at, counted)
select ('aa000000-0000-0000-0000-0000001' || lpad(g::text, 5, '0'))::uuid, '00000000-0000-0000-0000-00000000aa02', now() - interval '20 days', true
from generate_series(1, 9) g;
select pg_temp.login_as('00000000-0000-0000-0000-00000000aa02');
select results_eq(
  $$ select (r ->> 'counted')::int, (r ->> 'level')::int, (r ->> 'next')::int, jsonb_array_length(r -> 'surveys'), r #>> '{surveys,0,title}'
     from public.my_survey_record() r $$,
  $$ values (10, 10, 50, 10, 'Use promo code SAVE10 today') $$,
  'ten counted answers earn the first badge; the record lists the surveys, never the answers'
);

-- ── Retention ──
select pg_temp.reset_role();
update public.surveys set closed_at = now() - interval '24 months' + interval '10 days' where id = (select id from ids where name = 'ad');
update public.surveys set status = 'closed', closed_at = now() - interval '30 months' where id = (select id from ids where name = 'health');
select public.sweep_surveys();
select ok((select answers_warned_at is not null and answers_deleted_at is null from public.surveys where id = (select id from ids where name = 'ad'))
  and exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000aa01' and event = 'survey_answers_expiring'),
  'the creator is told 30 days before the answers go');
update public.surveys set closed_at = now() - interval '25 months' where id = (select id from ids where name = 'ad');
select public.sweep_surveys();
select results_eq(
  $$ select (select answers_deleted_at is not null from public.surveys where id = (select id from ids where name = 'ad')),
            (select count(*)::integer from public.survey_answers a join public.survey_responses r on r.id = a.response_id
             where r.survey_id = (select id from ids where name = 'ad')),
            (select answers_deleted_at is null from public.surveys where id = (select id from ids where name = 'health')) $$,
  $$ values (true, 0, true) $$,
  'raw answers go 24 months after closing, later when the ethics reference says so'
);

select * from finish();
rollback;
