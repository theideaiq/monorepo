-- Surveys, part 2 (owner's master brief, step 10): bias controls — phones of one's own,
-- trusted respondents' early window and its rotation, the daily limit, quotas and
-- "Who answered".
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
select plan(15);

truncate public.orders, public.bulb_entries cascade;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000009801', 'zc@example.iq', '{"full_name":"Creator C"}'),
  ('00000000-0000-0000-0000-000000009802', 'z2@example.iq', '{"full_name":"T"}'),
  ('00000000-0000-0000-0000-000000009803', 'z3@example.iq', '{"full_name":"T2"}'),
  ('00000000-0000-0000-0000-000000009804', 'z4@example.iq', '{"full_name":"T3"}'),
  ('00000000-0000-0000-0000-000000009805', 'z5@example.iq', '{"full_name":"U"}'),
  ('00000000-0000-0000-0000-000000009806', 'z6@example.iq', '{"full_name":"N"}'),
  ('00000000-0000-0000-0000-000000009807', 'z7@example.iq', '{"full_name":"D1"}'),
  ('00000000-0000-0000-0000-000000009808', 'z8@example.iq', '{"full_name":"D2"}'),
  ('00000000-0000-0000-0000-000000009809', 'z9@example.iq', '{"full_name":"Q1"}'),
  ('00000000-0000-0000-0000-000000009810', 'z10@example.iq', '{"full_name":"Q2"}'),
  ('00000000-0000-0000-0000-000000009820', 'za0@example.iq', '{"full_name":"Audience 0"}'),
  ('00000000-0000-0000-0000-000000009821', 'za1@example.iq', '{"full_name":"Audience 1"}'),
  ('00000000-0000-0000-0000-000000009822', 'za2@example.iq', '{"full_name":"Audience 2"}'),
  ('00000000-0000-0000-0000-000000009823', 'za3@example.iq', '{"full_name":"Audience 3"}'),
  ('00000000-0000-0000-0000-000000009824', 'za4@example.iq', '{"full_name":"Audience 4"}'),
  ('00000000-0000-0000-0000-000000009825', 'za5@example.iq', '{"full_name":"Audience 5"}');
update public.profiles set birthday = date '1995-01-01' where birthday is null;
insert into public.student_badges (user_id, university_id, valid_until, method, major, study_year, governorate) values
  ('00000000-0000-0000-0000-000000009801', 'auib', private.baghdad_today() + 100, 'email', 'Computer science', 3, 'baghdad'),
  ('00000000-0000-0000-0000-000000009809', 'auib', private.baghdad_today() + 100, 'email', 'Medicine', 2, 'baghdad'),
  ('00000000-0000-0000-0000-000000009810', 'auib', private.baghdad_today() + 100, 'email', 'Medicine', 2, 'baghdad');
-- Everyone has a phone of their own but N (none), and D1 and D2 share one.
insert into public.verified_phones (user_id, phone)
select x.id, '+9647711' || lpad((row_number() over (order by x.id))::text, 6, '0')
from auth.users x where x.id not in ('00000000-0000-0000-0000-000000009806', '00000000-0000-0000-0000-000000009807', '00000000-0000-0000-0000-000000009808');
insert into public.verified_phones (user_id, phone) values ('00000000-0000-0000-0000-000000009807', '+9647799999999'), ('00000000-0000-0000-0000-000000009808', '+9647799999999');
update public.store_settings set require_verified_phone = true, survey_early_hours = 24, survey_early_share = 50, survey_daily_boosted = 5,
  survey_trusted_answers = 20, survey_trusted_window = 10;
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- T, T2 and T3 have 20 careful answers to an old survey; T3 also answered
-- another survey early an hour ago.
insert into public.surveys (id, creator_id, title, consent, kind, status, wanted, opened_at, closed_at)
values ('98000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000009801', 'Old survey', 'Consent text long enough to pass.', 'free', 'closed', 100, now() - interval '30 days', now() - interval '20 days'),
       ('98000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000009801', 'Other early', 'Consent text long enough to pass.', 'boosted', 'closed', 10, now() - interval '2 hours', now());
insert into public.surveys (id, creator_id, title, consent, kind, status, wanted, opened_at, closed_at)
select ('98000000-0000-0000-0000-0000001' || lpad(g::text, 5, '0'))::uuid, '00000000-0000-0000-0000-000000009801', 'Old ' || g, 'Consent text long enough to pass.', 'free', 'closed', 100,
  now() - interval '30 days', now() - interval '20 days'
from generate_series(1, 20) g;
insert into public.survey_responses (survey_id, user_id, started_at, submitted_at, counted, seconds)
select ('98000000-0000-0000-0000-0000001' || lpad(g::text, 5, '0'))::uuid, who, now() - interval '20 days', now() - interval '20 days' + interval '5 minutes', true, 300
from unnest(array['00000000-0000-0000-0000-000000009802', '00000000-0000-0000-0000-000000009803', '00000000-0000-0000-0000-000000009804']::uuid[]) who, generate_series(1, 20) g;
insert into public.survey_responses (survey_id, user_id, started_at, early)
values ('98000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000009804', now() - interval '1 hour', true);
select ok(private.is_trusted_respondent('00000000-0000-0000-0000-000000009802') and not private.is_trusted_respondent('00000000-0000-0000-0000-000000009805'),
  '20 careful answers make a trusted respondent');

-- ── A new Boosted survey: the early window ──
select pg_temp.login_as('00000000-0000-0000-0000-000000009801');
insert into ids select 'b', (public.save_survey('{
  "title": "Campus food", "kind": "boosted", "wanted": 4,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "number", "prompt": "Meals a week on campus"}]}')).id;
select public.publish_survey((select id from ids where name = 'b'));
select pg_temp.reset_role();
update public.orders set status = 'paid', paid_at = now() where id = (select order_id from public.surveys where id = (select id from ids where name = 'b'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009806');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'Boosted surveys need a verified phone');
select pg_temp.login_as('00000000-0000-0000-0000-000000009807');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'one that no other Pass has verified');
select pg_temp.login_as('00000000-0000-0000-0000-000000009805');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'for the first 24 hours only trusted respondents answer');
select pg_temp.login_as('00000000-0000-0000-0000-000000009802');
select is((public.start_survey((select id from ids where name = 'b'))).early, true, 'a trusted respondent answers early');
select pg_temp.login_as('00000000-0000-0000-0000-000000009804');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'one who answered another survey early today waits their turn');
select pg_temp.login_as('00000000-0000-0000-0000-000000009803');
select lives_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, 'the next trusted respondent answers early');
select pg_temp.reset_role();
delete from public.survey_responses where user_id = '00000000-0000-0000-0000-000000009804' and survey_id = '98000000-0000-0000-0000-0000000000a2';
select pg_temp.login_as('00000000-0000-0000-0000-000000009804');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'the early window fills at most half the target');
select pg_temp.reset_role();
update public.surveys set opened_at = now() - interval '25 hours' where id = (select id from ids where name = 'b');
select pg_temp.login_as('00000000-0000-0000-0000-000000009805');
select is((public.start_survey((select id from ids where name = 'b'))).early, false, 'after 24 hours everyone may answer');

-- ── The daily limit ──
select pg_temp.reset_role();
update public.store_settings set survey_daily_boosted = 1;
select pg_temp.login_as('00000000-0000-0000-0000-000000009801');
insert into ids select 'b2', (public.save_survey('{
  "title": "Campus buses", "kind": "boosted", "wanted": 4,
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "number", "prompt": "Buses a week"}]}')).id;
select public.publish_survey((select id from ids where name = 'b2'));
select pg_temp.reset_role();
update public.orders set status = 'paid', paid_at = now() where id = (select order_id from public.surveys where id = (select id from ids where name = 'b2'));
update public.surveys set opened_at = now() - interval '25 hours' where id = (select id from ids where name = 'b2');
select pg_temp.login_as('00000000-0000-0000-0000-000000009805');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b2')) $$, '23514',
  'You''ve answered enough Boosted surveys today', 'each person answers a few Boosted surveys a day');
select results_eq($$ select own_phone, phone_required, trusted, boosted_today, daily_limit from public.my_survey_access() $$,
  $$ values (true, true, false, 1, 1) $$, 'members see their access and today''s count');
select pg_temp.reset_role();
update public.store_settings set survey_daily_boosted = 5;

-- ── Quotas ──
select pg_temp.login_as('00000000-0000-0000-0000-000000009801');
insert into ids select 'q', (public.save_survey('{
  "title": "Medicine study", "kind": "boosted", "wanted": 2, "quotas": {"governorate": 50, "religion": 10},
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "scale", "prompt": "How tired are you?"}]}')).id;
select is((select quotas from public.surveys where id = (select id from ids where name = 'q')), '{"governorate": 50}'::jsonb,
  'quotas keep only targeting fields');
select public.publish_survey((select id from ids where name = 'q'));
select pg_temp.reset_role();
update public.orders set status = 'paid', paid_at = now() where id = (select order_id from public.surveys where id = (select id from ids where name = 'q'));
update public.surveys set opened_at = now() - interval '25 hours' where id = (select id from ids where name = 'q');
select pg_temp.login_as('00000000-0000-0000-0000-000000009809');
select public.start_survey((select id from ids where name = 'q'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009810');
select throws_ok($$ select public.start_survey((select id from ids where name = 'q')) $$, '23514',
  'This survey has enough answers from people like you', 'a quota caps the share from one governorate');

-- ── Who answered ──
-- Five counted from Baghdad and one from Basra: Basra alone is a group under 5.
select pg_temp.reset_role();
insert into public.survey_responses (survey_id, user_id, started_at, submitted_at, counted, seconds, respondent) values
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009820', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "baghdad"}'),
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009821', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "baghdad"}'),
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009822', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "baghdad"}'),
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009823', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "baghdad"}'),
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009824', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "baghdad"}'),
  ((select id from ids where name = 'b2'), '00000000-0000-0000-0000-000000009825', now() - interval '1 hour', now() - interval '55 minutes', true, 300, '{"governorate": "basra"}');
select pg_temp.login_as('00000000-0000-0000-0000-000000009801');
select results_eq(
  $$ select (a ->> 'started')::int, (a ->> 'counted')::int, a #> '{breakdown,governorate}'
     from public.survey_audience((select id from ids where name = 'b2')) a $$,
  $$ values (6, 6, '[{"count": 5, "value": "baghdad"}]'::jsonb) $$,
  'who answered: counts and groups of 5 or more only'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000009805');
select throws_ok($$ select public.survey_audience((select id from ids where name = 'b2')) $$, 'P0002', null, 'only the creator sees who answered');

select * from finish();
rollback;
