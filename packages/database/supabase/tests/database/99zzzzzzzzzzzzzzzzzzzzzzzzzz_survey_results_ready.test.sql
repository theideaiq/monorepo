-- PR 7, A22: respondents hear when a survey's results are ready.
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

select plan(4);

insert into auth.users (id, email)
select ('00000000-0000-0000-0000-0000000fa0' || lpad(g::text, 2, '0'))::uuid, 'a22-' || g || '@example.iq'
from generate_series(1, 9) g;

-- Survey 1: 5 counted, 1 submitted but not counted, 1 withdrawn.
-- Survey 2: only 3 counted. Survey 3: academic, summary off.
insert into public.surveys (id, creator_id, title, consent, kind, status, wanted, opened_at, purpose, share_summary)
values
  ('9fa00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000fa001', 'Study habits', 'Consent text long enough to pass.', 'free', 'open', 100, now() - interval '3 days', 'community', true),
  ('9fa00000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000fa001', 'Few answers', 'Consent text long enough to pass.', 'free', 'open', 100, now() - interval '3 days', 'community', true),
  ('9fa00000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000fa001', 'Thesis', 'Consent text long enough to pass.', 'free', 'open', 100, now() - interval '3 days', 'academic', false);
insert into public.survey_responses (survey_id, user_id, submitted_at, counted, withdrawn_at)
select '9fa00000-0000-0000-0000-000000000001', ('00000000-0000-0000-0000-0000000fa0' || lpad(g::text, 2, '0'))::uuid,
  now() - interval '1 day', g <= 6, case when g = 8 then now() end
from generate_series(2, 8) g;
insert into public.survey_responses (survey_id, user_id, submitted_at, counted)
select s, ('00000000-0000-0000-0000-0000000fa0' || lpad(g::text, 2, '0'))::uuid, now() - interval '1 day', true
from unnest(array['9fa00000-0000-0000-0000-000000000002', '9fa00000-0000-0000-0000-000000000003']::uuid[]) s,
  generate_series(2, 4) g;
insert into public.survey_responses (survey_id, user_id, submitted_at, counted)
select '9fa00000-0000-0000-0000-000000000003', ('00000000-0000-0000-0000-0000000fa0' || lpad(g::text, 2, '0'))::uuid, now() - interval '1 day', true
from generate_series(5, 9) g;

update public.surveys set status = 'closed', closed_at = now()
where id in ('9fa00000-0000-0000-0000-000000000001', '9fa00000-0000-0000-0000-000000000002', '9fa00000-0000-0000-0000-000000000003');

select is(
  (select count(*)::integer from public.notifications where event = 'survey_results'
     and data ->> 'survey_id' = '9fa00000-0000-0000-0000-000000000001'),
  6, 'everyone who submitted and kept their answers hears, counted or not'
);
select is(
  (select link from public.notifications where event = 'survey_results' limit 1),
  '/club/surveys/9fa00000-0000-0000-0000-000000000001', 'linking to the survey''s page'
);
select is(
  (select count(*)::integer from public.notifications where event = 'survey_results'
     and data ->> 'survey_id' <> '9fa00000-0000-0000-0000-000000000001'),
  0, 'not when there are under 5 counted answers, nor when the summary is off'
);
update public.surveys set title = 'Study habits (closed)' where id = '9fa00000-0000-0000-0000-000000000001';
update public.surveys set status = 'closed' where id = '9fa00000-0000-0000-0000-000000000001';
select is(
  (select count(*)::integer from public.notifications where event = 'survey_results'),
  6, 'only once'
);

select * from finish();
rollback;
