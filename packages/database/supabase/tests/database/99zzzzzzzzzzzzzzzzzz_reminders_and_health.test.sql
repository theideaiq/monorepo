-- Programs, part 3: Travel Kit reminders, reminder emails and job health.
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

select plan(14);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f3001', 'admin-health@example.iq'),
  ('00000000-0000-0000-0000-0000000f3002', 'member-remind@example.iq'),
  ('00000000-0000-0000-0000-0000000f3003', 'editor-health@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f3001', 'admin'),
  ('00000000-0000-0000-0000-0000000f3003', 'editor');
insert into public.travel_routes (id, slug, country, visa_ar, visa_en, status, checked_on) values
  ('9f500000-0000-0000-0000-0000000000a1', 'test-remind', 'CZ', 'تأشيرة', 'Visa', 'published', '2026-11-04');
-- Due dates relative to today (Baghdad): the appointment is in 10 days.
insert into public.travel_requirements (id, route_id, kind, doc_key, title_ar, title_en, confidence, source_url, checked_on, anchor, lead_days, minors_only) values
  -- due in 2 days, a document not ready
  ('9f500000-0000-0000-0000-0000000000b1', '9f500000-0000-0000-0000-0000000000a1', 'document', 'passport', 'جواز', 'Passport', 'official', 'https://example.iq', '2026-11-04', 'appointment', 8, false),
  -- due in 2 days, a document marked ready (not announced)
  ('9f500000-0000-0000-0000-0000000000b2', '9f500000-0000-0000-0000-0000000000a1', 'document', 'photo', 'صورة', 'Photo', 'official', 'https://example.iq', '2026-11-04', 'appointment', 8, false),
  -- due today, a task already ticked (not announced)
  ('9f500000-0000-0000-0000-0000000000b3', '9f500000-0000-0000-0000-0000000000a1', 'task', null, 'احجز', 'Book', 'official', 'https://example.iq', '2026-11-04', 'appointment', 10, false),
  -- due in 2 days, guardian step on an adult's kit (not announced)
  ('9f500000-0000-0000-0000-0000000000b4', '9f500000-0000-0000-0000-0000000000a1', 'task', null, 'موافقة', 'Consent', 'official', 'https://example.iq', '2026-11-04', 'appointment', 8, true),
  -- due in 5 days (too early)
  ('9f500000-0000-0000-0000-0000000000b5', '9f500000-0000-0000-0000-0000000000a1', 'task', null, 'تأمين', 'Insurance', 'official', 'https://example.iq', '2026-11-04', 'appointment', 5, false),
  -- due in 1 day, a task not ticked
  ('9f500000-0000-0000-0000-0000000000b6', '9f500000-0000-0000-0000-0000000000a1', 'task', null, 'ادفع', 'Pay the fee', 'official', 'https://example.iq', '2026-11-04', 'appointment', 9, false);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f3002');
insert into public.travel_kits (id, route_id, appointment_on)
values ('9f500000-0000-0000-0000-0000000000c1', '9f500000-0000-0000-0000-0000000000a1',
  (now() at time zone 'Asia/Baghdad')::date + 10);
insert into public.travel_documents (doc_key, status) values ('photo', 'ready'), ('passport', 'in_progress');
insert into public.travel_kit_ticks (kit_id, requirement_id)
values ('9f500000-0000-0000-0000-0000000000c1', '9f500000-0000-0000-0000-0000000000b3');

select throws_ok(
  $$ select public.notify_travel_kits() $$,
  '42501', null, 'members cannot run the reminders'
);
select is_empty(
  $$ select * from public.travel_reminders $$,
  'members never see which reminders went out'
);
select pg_temp.reset_role();

select is(public.notify_travel_kits(), 1, 'one notification for the kit');
select results_eq(
  $$ select requirement_id from public.travel_reminders order by requirement_id $$,
  $$ values ('9f500000-0000-0000-0000-0000000000b1'::uuid), ('9f500000-0000-0000-0000-0000000000b6'::uuid) $$,
  'only lines due in the next three days and not done are announced'
);
select results_eq(
  $$ select event, link, (data ->> 'count')::integer, data ->> 'title_en', data ->> 'country'
     from public.notifications where user_id = '00000000-0000-0000-0000-0000000f3002' $$,
  $$ values ('travel_due'::text, '/pass/travel/9f500000-0000-0000-0000-0000000000c1'::text, 2, 'Pay the fee'::text, 'CZ'::text) $$,
  'the notification links to the kit and names the first line due'
);
select is(public.notify_travel_kits(), 0, 'each line is announced once');

update public.travel_kits set appointment_on = appointment_on + 1
where id = '9f500000-0000-0000-0000-0000000000c1';
select is(public.notify_travel_kits(), 1, 'a moved date announces the lines again');

update public.travel_kits set minor = true
where id = '9f500000-0000-0000-0000-0000000000c1';
select ok(
  exists (
    select 1 from private.travel_kit_due((now() at time zone 'Asia/Baghdad')::date + 1)
    where requirement_id = '9f500000-0000-0000-0000-0000000000b4'
  ),
  'guardian steps count on a minor''s kit'
);

-- Email
select is(
  (select count(*)::integer from public.claim_email_notifications(array['travel_due'])),
  2, 'reminders not emailed yet are handed out'
);
select is(
  (select count(*)::integer from public.claim_email_notifications(array['travel_due'])),
  0, 'and only once'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3002');
select throws_ok(
  $$ select * from public.claim_email_notifications(array['travel_due']) $$,
  '42501', null, 'members cannot claim emails'
);
select pg_temp.reset_role();

-- Job health
insert into public.job_runs (job, last_started_at, last_ok_at) values ('reminders', now(), now());
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3001', 'aal2');
select is((select count(*)::integer from public.job_runs), 1, 'admins see job runs');
select pg_temp.login_as('00000000-0000-0000-0000-0000000f3003', 'aal2');
select is((select count(*)::integer from public.job_runs), 0, 'editors do not');
select throws_ok(
  $$ insert into public.job_runs (job) values ('fake') $$,
  '42501', null, 'only the API writes job runs'
);
select pg_temp.reset_role();

select * from finish();
rollback;
