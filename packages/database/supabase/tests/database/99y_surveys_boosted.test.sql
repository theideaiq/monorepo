-- Surveys, part 1 (owner's master brief, step 10): Boosted surveys, rewards by time,
-- counting rules, withdrawal, appeals, early close, refunds and the 60-day sweep.
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
select plan(26);

-- C creates (a verified student), S is support, 01–14 answer.
truncate public.orders, public.bulb_entries cascade;
delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000099c1', 'sc@example.iq', '{"full_name":"Creator C"}'),
  ('00000000-0000-0000-0000-0000000099c2', 'ss@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-000000009901', 'sr1@example.iq', '{"full_name":"Respondent 1"}'),
  ('00000000-0000-0000-0000-000000009902', 'sr2@example.iq', '{"full_name":"Respondent 2"}'),
  ('00000000-0000-0000-0000-000000009903', 'sr3@example.iq', '{"full_name":"Respondent 3"}'),
  ('00000000-0000-0000-0000-000000009904', 'sr4@example.iq', '{"full_name":"Respondent 4"}'),
  ('00000000-0000-0000-0000-000000009905', 'sr5@example.iq', '{"full_name":"Respondent 5"}'),
  ('00000000-0000-0000-0000-000000009906', 'sr6@example.iq', '{"full_name":"Respondent 6"}'),
  ('00000000-0000-0000-0000-000000009907', 'sr7@example.iq', '{"full_name":"Respondent 7"}'),
  ('00000000-0000-0000-0000-000000009908', 'sr8@example.iq', '{"full_name":"Respondent 8"}'),
  ('00000000-0000-0000-0000-000000009909', 'sr9@example.iq', '{"full_name":"Respondent 9"}'),
  ('00000000-0000-0000-0000-000000009910', 'sr10@example.iq', '{"full_name":"Respondent 10"}'),
  ('00000000-0000-0000-0000-000000009911', 'sr11@example.iq', '{"full_name":"Respondent 11"}'),
  ('00000000-0000-0000-0000-000000009912', 'sr12@example.iq', '{"full_name":"Respondent 12"}'),
  ('00000000-0000-0000-0000-000000009913', 'sr13@example.iq', '{"full_name":"Respondent 13"}'),
  ('00000000-0000-0000-0000-000000009914', 'sr14@example.iq', '{"full_name":"Respondent 14"}');
update public.profiles set birthday = date '1995-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000099c2', 'support');
insert into public.student_badges (user_id, university_id, valid_until, method, major, study_year)
values ('00000000-0000-0000-0000-0000000099c1', 'auib', private.baghdad_today() + 100, 'email', 'Computer science', 3);
create temporary table ids (name text primary key, id uuid);
grant all on ids to authenticated;

-- ── Opening ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c1');
insert into ids select 'b', (public.save_survey('{
  "title": "Study habits", "kind": "boosted", "wanted": 20,
  "consent": "Your answers are anonymous and used for a graduation project only.",
  "questions": [
    {"kind": "single", "prompt": "How often do you study?", "options": ["Daily", "Weekly"]},
    {"kind": "single", "prompt": "Pick Blue to show you are reading", "options": ["Red", "Blue"], "attention_answer": "Blue"},
    {"kind": "single", "prompt": "Pick Green to show you are reading", "options": ["Red", "Green"], "attention_answer": "Green"}
  ]}')).id;
select is((select estimated_seconds from public.surveys where id = (select id from ids where name = 'b')), 54,
  'the time is estimated from the questions (30 s, then 8 s a choice)');
select results_eq(
  $$ select (s).status, (s).reward, (s).held from (select public.publish_survey((select id from ids where name = 'b')) as s) x $$,
  $$ values ('awaiting_payment'::text, 200, 4400) $$,
  'a Boosted survey waits for its order: 200 Bulbs (the least) × 20 × 1.1, in IQD'
);
select pg_temp.reset_role();
update public.orders set status = 'paid', paid_at = now() where id = (select order_id from public.surveys where id = (select id from ids where name = 'b'));
select ok(
  (select status = 'open' and closes_at between now() + interval '59 days' and now() + interval '61 days' from public.surveys where id = (select id from ids where name = 'b')),
  'it opens once paid, for 60 days'
);

-- ── Counting ──
select pg_temp.login_as('00000000-0000-0000-0000-000000009901');
select public.start_survey((select id from ids where name = 'b'));
select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '5 minutes' where user_id = '00000000-0000-0000-0000-000000009901';
select pg_temp.login_as('00000000-0000-0000-0000-000000009901');
select results_eq(
  $$ select (r).counted, (r).reward_paid from (select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green')) as r) x $$,
  $$ values (true, 200) $$,
  'a careful answer counts and earns the reward'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000009902');
select public.start_survey((select id from ids where name = 'b'));
select results_eq(
  $$ select (r).counted, (r).excluded_reason, (r).failed_checks from (select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Red', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Red')) as r) x $$,
  $$ values (false, 'attention'::text, 2::smallint) $$,
  'two failed attention checks don''t count'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000009903');
select public.start_survey((select id from ids where name = 'b'));
select results_eq(
  $$ select (r).counted, (r).excluded_reason from (select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green')) as r) x $$,
  $$ values (false, 'too_fast'::text) $$,
  'under min_seconds before there is a median is too fast'
);

-- ── Appeals ──
select lives_ok($$ select public.appeal_survey_response((select id from ids where name = 'b'), 'I read fast') $$, 'a respondent appeals once');
select throws_ok(
  $$ select public.appeal_survey_response((select id from ids where name = 'b'), 'Again') $$,
  '23514', 'Nothing to appeal', 'but only once'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c2', 'aal2');
select is((select count(*)::integer from public.survey_appeals()), 1, 'support sees the appeal');
select pg_temp.login_as('00000000-0000-0000-0000-000000009901');
select throws_ok($$ select public.decide_survey_appeal((select response_id from private.survey_appeals() limit 1), true) $$, '42501', null, 'members can''t decide appeals');
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c2', 'aal2');
select public.decide_survey_appeal((select response_id from public.survey_appeals() limit 1), true);
select pg_temp.reset_role();
select results_eq(
  $$ select counted, reward_paid from public.survey_responses where user_id = '00000000-0000-0000-0000-000000009903' $$,
  $$ values (true, 200) $$,
  'an upheld appeal counts and is paid'
);

-- ── Withdrawing ──
select pg_temp.login_as('00000000-0000-0000-0000-000000009901');
select public.withdraw_survey_response((select id from ids where name = 'b'));
select pg_temp.reset_role();
select results_eq(
  $$ select r.withdrawn_at is not null, (select count(*) from public.survey_answers a where a.response_id = r.id)::integer,
            (select sum(amount) from public.bulb_entries e where e.user_id = r.user_id)::integer
     from public.survey_responses r where r.user_id = '00000000-0000-0000-0000-000000009901' $$,
  $$ values (true, 0, 200) $$,
  'a submitted response can be deleted: its answers go, the reward stays'
);
select is(private.survey_counted((select id from ids where name = 'b')), 1, 'and it stops counting toward the target');
select pg_temp.login_as('00000000-0000-0000-0000-000000009904');
select public.start_survey((select id from ids where name = 'b'));
select public.withdraw_survey_response((select id from ids where name = 'b'));
select is((select count(*)::integer from public.survey_responses where user_id = '00000000-0000-0000-0000-000000009904'), 0, 'quitting before submitting leaves nothing');

-- ── The median ──
-- 05–13 take 10 minutes each; the 10th counted response sets the median
-- (600 s → 1,000 Bulbs), above 200, so collection pauses.
select pg_temp.login_as('00000000-0000-0000-0000-000000009905'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009905';
select pg_temp.login_as('00000000-0000-0000-0000-000000009905'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009906'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009906';
select pg_temp.login_as('00000000-0000-0000-0000-000000009906'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009907'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009907';
select pg_temp.login_as('00000000-0000-0000-0000-000000009907'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009908'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009908';
select pg_temp.login_as('00000000-0000-0000-0000-000000009908'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009909'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009909';
select pg_temp.login_as('00000000-0000-0000-0000-000000009909'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009910'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009910';
select pg_temp.login_as('00000000-0000-0000-0000-000000009910'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009911'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009911';
select pg_temp.login_as('00000000-0000-0000-0000-000000009911'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009912'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009912';
select pg_temp.login_as('00000000-0000-0000-0000-000000009912'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.login_as('00000000-0000-0000-0000-000000009913'); select public.start_survey((select id from ids where name = 'b')); select pg_temp.reset_role();
update public.survey_responses set started_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-000000009913';
select pg_temp.login_as('00000000-0000-0000-0000-000000009913'); select public.submit_survey((select id from ids where name = 'b'), jsonb_build_object((select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 0), 'Daily', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 1), 'Blue', (select id::text from public.survey_questions where survey_id = (select id from ids where name = 'b') and position = 2), 'Green'));
select pg_temp.reset_role();
select results_eq(
  $$ select median_seconds, reward, reward_pending, paused_at is not null from public.surveys where id = (select id from ids where name = 'b') $$,
  $$ values (600, 200, 1000, true) $$,
  'after 10 counted responses a higher median pauses collection'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000009914');
select throws_ok($$ select public.start_survey((select id from ids where name = 'b')) $$, '42501', null, 'nobody starts while it is paused');
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c1');
select public.confirm_survey_reward((select id from ids where name = 'b'));
select pg_temp.reset_role();
select is(
  (select o.total from public.orders o join public.surveys s on s.topup_order_id = o.id where s.id = (select id from ids where name = 'b')),
  8800::bigint, 'the creator pays the difference for the 10 still wanted (800 × 10 × 1.1)'
);
update public.orders set status = 'paid', paid_at = now() where id = (select topup_order_id from public.surveys where id = (select id from ids where name = 'b'));
select results_eq(
  $$ select reward, reward_pending, paused_at, held from public.surveys where id = (select id from ids where name = 'b') $$,
  $$ values (1000, null::integer, null::timestamptz, 13200) $$,
  'once paid the higher reward applies and collection resumes'
);

-- ── Closing early and refunds ──
select pg_temp.login_as('00000000-0000-0000-0000-000000009914');
select public.start_survey((select id from ids where name = 'b'));
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c1');
select is((public.close_survey((select id from ids where name = 'b'))).status, 'closed', 'the creator closes it early');
select pg_temp.reset_role();
select is((select reward_paid from public.survey_responses where user_id = '00000000-0000-0000-0000-000000009914'), 1000,
  'someone who started in the last hour is still paid in full');
-- Paid: 11 × 200 + 1,000 = 3,200 Bulbs, so 3,520 IQD of 13,200 spent.
select is((select refund_amount from public.surveys where id = (select id from ids where name = 'b')), 9680::bigint, 'the rest is due back');
insert into public.payments (order_id, user_id, provider, reference_id, amount, status, paid_at)
select o.id, o.user_id, 'wayl', 'survey-' || o.number, o.total, 'paid', now()
from public.orders o where o.id in (select order_id from public.surveys where id = (select id from ids where name = 'b') union select topup_order_id from public.surveys where id = (select id from ids where name = 'b'));
create temporary table claims as select * from public.claim_survey_refunds();
select results_eq(
  $$ select amount, refundable from claims $$,
  $$ values (8800::bigint, 8800::bigint) $$,
  'the refund starts with the payment with the most left'
);
select public.record_survey_refund((select id from ids where name = 'b'), (select payment_id from claims), 8800, 'wayl-r1');
truncate claims;
insert into claims select * from public.claim_survey_refunds();
select is((select amount from claims), 880::bigint, 'and takes the rest from the other');
select public.record_survey_refund((select id from ids where name = 'b'), (select payment_id from claims), 880, 'wayl-r2');
select results_eq(
  $$ select refunded_amount, refunded_at is not null from public.surveys where id = (select id from ids where name = 'b') $$,
  $$ values (9680::bigint, true) $$,
  'then the survey is refunded'
);
select is((select count(*)::integer from public.claim_survey_refunds()), 0, 'and nothing more is claimed');

-- ── 60 days ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000099c1');
insert into ids select 'old', (public.save_survey('{
  "title": "Campus food", "kind": "free",
  "consent": "Your answers are anonymous and used for research only.",
  "questions": [{"kind": "number", "prompt": "Meals a week on campus"}]}')).id;
select public.publish_survey((select id from ids where name = 'old'));
select pg_temp.reset_role();
update public.surveys set closes_at = now() - interval '1 minute' where id = (select id from ids where name = 'old');
select is(public.sweep_surveys(), 1, 'the daily sweep closes surveys past their end');

select * from finish();
rollback;
