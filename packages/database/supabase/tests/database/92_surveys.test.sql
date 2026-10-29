-- Program revision v1, step 5f: surveys (creating, targeting, answering, credits, rewards, review).
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

select plan(33);

-- C creates (a verified AUIB student), R is a student respondent, P an
-- adult with a Pass but no badge, M is 16, S is support.
truncate public.orders cascade;
delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000921', 'c@example.iq', '{"full_name":"Creator C"}'),
  ('00000000-0000-0000-0000-000000000922', 'r@example.iq', '{"full_name":"Rana R"}'),
  ('00000000-0000-0000-0000-000000000923', 'p@example.iq', '{"full_name":"Pass P"}'),
  ('00000000-0000-0000-0000-000000000924', 'm@example.iq', '{"full_name":"Minor M"}'),
  ('00000000-0000-0000-0000-000000000925', 's@example.iq', '{"full_name":"Support S"}');
update public.profiles set birthday = date '1995-01-01' where birthday is null;
update public.profiles set birthday = (now() - interval '16 years')::date where id = '00000000-0000-0000-0000-000000000924';
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000925', 'support');
insert into public.student_badges (user_id, university_id, valid_until, method, major, study_year) values
  ('00000000-0000-0000-0000-000000000921', 'auib', private.baghdad_today() + 100, 'email', 'Computer science', 3),
  ('00000000-0000-0000-0000-000000000922', 'auib', private.baghdad_today() + 100, 'email', 'Computer science', 2);

create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- ── Lengths and who creates ──
select results_eq(
  $$ values (private.survey_reward(1), private.survey_reward(10), private.survey_reward(40)) $$,
  $$ values (200, 500, 1000) $$,
  'rewards go from 200 to 1,000 Bulbs by length'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000923');
select throws_ok(
  $$ select public.save_survey('{"title":"Mine","questions":[{"kind":"text","prompt":"Why?"}]}') $$,
  '42501', 'Only verified students create surveys', 'only verified students create surveys'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000921');
insert into ids select 'free', (public.save_survey('{
  "title": "Study habits",
  "min_seconds": 0,
  "questions": [
    {"kind": "single", "prompt": "How often do you study?", "options": ["Daily", "Weekly"]},
    {"kind": "single", "prompt": "Pick Blue to show you are reading", "options": ["Red", "Blue"], "attention_answer": "Blue"},
    {"kind": "text", "prompt": "Anything else?", "required": false}
  ]}')).id;
select is((select count(*)::integer from public.survey_questions where survey_id = (select id from ids where name = 'free')), 3,
  'a draft is saved with its questions');
select throws_ok(
  $$ select public.publish_survey((select id from ids where name = 'free')) $$,
  '23514', 'Add the consent text', 'a survey needs its consent text'
);
select lives_ok(
  $$ select public.save_survey(jsonb_build_object(
       'id', (select id from ids where name = 'free'), 'title', 'Study habits', 'min_seconds', 0,
       'consent', 'Your answers are anonymous and used for a graduation project only.',
       'questions', '[{"kind":"single","prompt":"How often do you study?","options":["Daily","Weekly"]},
                     {"kind":"single","prompt":"Pick Blue to show you are reading","options":["Red","Blue"],"attention_answer":"Blue"},
                     {"kind":"text","prompt":"Anything else?","required":false}]'::jsonb)) $$,
  'the draft is edited'
);
select is((public.publish_survey((select id from ids where name = 'free'))).status, 'open', 'a clean survey opens at once');
select is(public.my_survey_credits(), 10, 'a new creator starts with 10 credits');

-- ── Answering ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000923');
select is((select count(*)::integer from public.surveys_for_me()), 1, 'anyone 18+ sees an untargeted survey');
select pg_temp.login_as('00000000-0000-0000-0000-000000000924');
select throws_ok(
  $$ select public.start_survey((select id from ids where name = 'free')) $$,
  '42501', 'This survey isn''t open to you', 'under-18s don''t answer'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000922');
select lives_ok($$ select public.start_survey((select id from ids where name = 'free')) $$, 'R starts');
select throws_ok(
  $$ select public.submit_survey((select id from ids where name = 'free'), '{}') $$,
  '23514', 'Answer every required question', 'required questions are required'
);
select is(
  (public.submit_survey((select id from ids where name = 'free'), jsonb_build_object(
    (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'free') and position = 0), 'Daily',
    (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'free') and position = 1), 'Blue'
  ))).counted,
  true, 'a careful answer counts'
);
select is(public.my_survey_credits(), 1, 'answering a free survey earns a credit');
select throws_ok(
  $$ select public.start_survey((select id from ids where name = 'free')) $$,
  '23514', 'You already answered this survey', 'one answer per person'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000923');
select public.start_survey((select id from ids where name = 'free'));
select is(
  (public.submit_survey((select id from ids where name = 'free'), jsonb_build_object(
    (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'free') and position = 0), 'Weekly',
    (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'free') and position = 1), 'Red'
  ))).counted,
  false, 'a failed attention check doesn''t count'
);
select is(public.my_survey_credits(), 0, 'and earns nothing');

select pg_temp.login_as('00000000-0000-0000-0000-000000000921');
select is(public.my_survey_credits(), 9, 'each counted response uses one of the creator''s credits');
select is((select count(*)::integer from public.survey_results((select id from ids where name = 'free'))), 2,
  'the creator sees the answers');
select is((select count(*)::integer from public.survey_responses), 0, 'but not who gave them');

-- ── Targeting and Bulbs rewards ──
insert into ids select 'bulbs', (public.save_survey('{
  "title": "Medicine students", "kind": "bulbs", "wanted": 2, "majors": ["Medicine"], "min_seconds": 0,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "scale", "prompt": "How tired are you?"}]}')).id;
select throws_ok(
  $$ select public.publish_survey((select id from ids where name = 'bulbs')) $$,
  '23514', 'Not enough Bulbs for the rewards', 'rewards need the Bulbs to pay them'
);
select pg_temp.reset_role();
insert into public.bulb_entries (user_id, amount, kind, reason) values ('00000000-0000-0000-0000-000000000921', 10000, 'bonus', 'test');
select pg_temp.login_as('00000000-0000-0000-0000-000000000921');
select is((public.publish_survey((select id from ids where name = 'bulbs'))).held, 440,
  'the rewards (2 × 200) and the 10% fee are held');

select pg_temp.login_as('00000000-0000-0000-0000-000000000922');
select is((select count(*)::integer from public.surveys_for_me()), 0, 'targeted surveys skip other majors');
select public.set_student_profile('Medicine', 2::smallint, 'baghdad');
select public.start_survey((select id from ids where name = 'bulbs'));
select public.submit_survey((select id from ids where name = 'bulbs'), jsonb_build_object(
  (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'bulbs')), 4));
select is((select available from public.my_bulbs()), 200::bigint, 'the respondent earns the reward');

select pg_temp.login_as('00000000-0000-0000-0000-000000000921');
select is((public.close_survey((select id from ids where name = 'bulbs'))).status, 'closed', 'the creator closes it');
select is((select available from public.my_bulbs()), 9780::bigint, 'and gets the unused Bulbs back');

-- ── Cash ──
insert into ids select 'cash', (public.save_survey('{
  "title": "Campus food", "kind": "cash", "wanted": 10, "min_seconds": 60,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "number", "prompt": "Meals a week on campus"}]}')).id;
select is((public.publish_survey((select id from ids where name = 'cash'))).status, 'awaiting_payment',
  'a cash survey waits for its payment');
select pg_temp.reset_role();
update public.orders set status = 'paid', paid_at = now()
where id = (select order_id from public.surveys where id = (select id from ids where name = 'cash'));
select is((select status from public.surveys where id = (select id from ids where name = 'cash')), 'open', 'and opens when paid');
select is((select total from public.orders where id = (select order_id from public.surveys where id = (select id from ids where name = 'cash'))),
  2200::bigint, '1 IQD a Bulb for the rewards and the fee');
select is((select status::text from public.orders where id = (select order_id from public.surveys where id = (select id from ids where name = 'cash'))),
  'delivered', 'the paid order is done (nothing to hand over)');
select is((select count(*) from public.notifications n
  where n.kind = 'order' and n.user_id = (select creator_id from public.surveys where id = (select id from ids where name = 'cash'))),
  0::bigint, 'and sends no order notifications');

-- ── Review ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000921');
insert into ids select 'flagged', (public.save_survey('{
  "title": "Beliefs", "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "text", "prompt": "What is your religion?"}]}')).id;
select results_eq(
  $$ select status, flags from public.publish_survey((select id from ids where name = 'flagged')) $$,
  $$ values ('review'::text, '{religion}'::text[]) $$,
  'sensitive questions wait for review'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000925', 'aal2');
select is((public.review_survey((select id from ids where name = 'flagged'), true, 'Ethics approval checked')).status, 'open',
  'support opens it after review');
select pg_temp.login_as('00000000-0000-0000-0000-000000000922');
select public.report_survey((select id from ids where name = 'flagged'), 'Too personal');
select pg_temp.reset_role();
select results_eq(
  $$ select status, 'reported' = any (flags) from public.surveys where id = (select id from ids where name = 'flagged') $$,
  $$ values ('review'::text, true) $$,
  'a report sends it back to review'
);

select * from finish();
rollback;
