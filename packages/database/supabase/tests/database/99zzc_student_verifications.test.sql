-- Student verification for partners: starting one, the university email and its
-- code, one tap with a badge, a document reviewed by Staff, one per partner per
-- person, deleting it, the webhook queue and the daily sweep.
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
select plan(25);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ab01', 'holder@example.iq', '{"full_name":"Badge Holder"}'),
  ('00000000-0000-0000-0000-00000000ab02', 'plain@example.iq', '{"full_name":"No Badge"}'),
  ('00000000-0000-0000-0000-00000000ab03', 'support-sv@example.iq', '{"full_name":"Support"}');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000ab03', 'support');
insert into public.student_badges (user_id, university_id, valid_until, method, university_email) values
  ('00000000-0000-0000-0000-00000000ab01', 'auib', private.academic_year_end(private.baghdad_today()), 'email', 'holder@auib.edu.iq');
insert into public.pass_partners (client_id, name, website, redirect_uris, secret_hash) values
  ('pass_00000000000000000000sv01', 'Book Shop', 'https://books.example.iq', '{https://books.example.iq/students}', repeat('a', 64)),
  ('pass_00000000000000000000sv02', 'Cafe', 'https://cafe.example.iq', '{https://cafe.example.iq/back}', repeat('b', 64));
create temporary table ids (name text primary key, id uuid);
create temporary table codes (name text primary key, value text);
grant all on ids, codes to anon, authenticated;

-- ── Starting ──
select throws_ok(
  $$ select public.create_student_verification('pass_00000000000000000000sv01', 'https://evil.example.com/x') $$,
  '23514', 'Invalid return address', 'the return address must be the partner''s'
);
insert into ids select 'email', public.create_student_verification('pass_00000000000000000000sv01', 'https://books.example.iq/students');
select is((select status from public.student_verifications where id = (select id from ids where name = 'email')), 'started',
  'a partner starts a verification');
select pg_temp.login_anon();
select throws_ok(
  $$ select public.create_student_verification('pass_00000000000000000000sv01', 'https://books.example.iq/students') $$,
  '42501', null, 'only apps/api starts one'
);
select results_eq(
  $$ select p ->> 'partner', p ->> 'status', p -> 'badge' from public.student_verification_page((select id from ids where name = 'email')) p $$,
  $$ values ('Book Shop', 'started', 'null'::jsonb) $$,
  'the page shows the partner and the status to anyone with the link'
);
select throws_ok($$ select count(*) from public.student_verifications $$, '42501', null, 'visitors can''t read verifications');
select is(public.student_verification_origins((select id from ids where name = 'email')), '{}'::text[],
  'a partner without verified domains can''t frame the page');

-- ── The university email ──
select pg_temp.reset_role();
update public.pass_partners set webhook_url = 'https://books.example.iq/hooks/idea' where client_id = 'pass_00000000000000000000sv01';
select throws_ok(
  $$ select public.start_student_verification_email((select id from ids where name = 'email'), 'auib', 'me@gmail.com') $$,
  '23514', 'Use your university email', 'the email must be the university''s'
);
insert into codes select 'email', public.start_student_verification_email((select id from ids where name = 'email'), 'auib', 'Sara@AUIB.edu.iq');
select matches((select value from codes where name = 'email'), '^[0-9]{8}$', 'an 8-digit code is emailed');
select results_eq(
  $$ select verified, email from public.confirm_student_verification_email((select id from ids where name = 'email'), '00000000x') $$,
  $$ values (false, null::text) $$, 'a wrong code doesn''t verify'
);
select results_eq(
  $$ select verified, email, char_length(delete_token)
     from public.confirm_student_verification_email((select id from ids where name = 'email'), (select value from codes where name = 'email')) $$,
  $$ values (true, 'sara@auib.edu.iq', 48) $$, 'the right code verifies at once, with a link to delete it'
);
select results_eq(
  $$ select status, method, university_id, valid_until from public.student_verifications where id = (select id from ids where name = 'email') $$,
  $$ values ('verified', 'email', 'auib', private.academic_year_end(private.baghdad_today())) $$,
  'verified at the university until 30 June'
);
select is(
  (select payload from public.partner_webhook_events where type = 'student_verification.updated'
     and payload ->> 'id' = (select id::text from ids where name = 'email')),
  jsonb_build_object('id', (select id from ids where name = 'email'), 'status', 'verified', 'university', 'auib',
    'valid_until', private.academic_year_end(private.baghdad_today())),
  'the partner''s webhook gets the status, the university and the expiry, nothing else'
);

-- ── One per partner per person; nothing shared ──
insert into ids select 'again', public.create_student_verification('pass_00000000000000000000sv01', 'https://books.example.iq/students');
insert into codes select 'again', public.start_student_verification_email((select id from ids where name = 'again'), 'auib', 'sara@auib.edu.iq');
select public.confirm_student_verification_email((select id from ids where name = 'again'), (select value from codes where name = 'again'));
select results_eq(
  $$ select (select count(*)::integer from public.student_verifications
             where client_id = 'pass_00000000000000000000sv01' and email_hash = private.hash_text('sara@auib.edu.iq')),
            (select payload ->> 'reason' from public.partner_webhook_events where type = 'student_verification.deleted'
             and payload ->> 'id' = (select id::text from ids where name = 'email')) $$,
  $$ values (1, 'replaced') $$,
  'a new verification for the same partner and person replaces the old one'
);
insert into ids select 'cafe', public.create_student_verification('pass_00000000000000000000sv02', 'https://cafe.example.iq/back');
select is((select status from public.student_verifications where id = (select id from ids where name = 'cafe')), 'started',
  'another partner needs its own verification');

-- ── One tap with a badge ──
select throws_ok(
  $$ select public.share_student_verification((select id from ids where name = 'cafe'), '00000000-0000-0000-0000-00000000ab02') $$,
  '23514', null, 'sharing needs a valid student badge'
);
select results_eq(
  $$ select email from public.share_student_verification((select id from ids where name = 'cafe'), '00000000-0000-0000-0000-00000000ab01') $$,
  $$ values ('holder@auib.edu.iq') $$, 'a badge holder shares it in one tap'
);
select results_eq(
  $$ select status, method, university_id, user_id from public.student_verifications where id = (select id from ids where name = 'cafe') $$,
  $$ values ('verified', 'pass', 'auib', '00000000-0000-0000-0000-00000000ab01'::uuid) $$,
  'the badge verifies them for that partner only'
);

-- ── A document ──
insert into ids select 'doc', public.create_student_verification('pass_00000000000000000000sv01', 'https://books.example.iq/students');
select public.submit_student_verification_document((select id from ids where name = 'doc'), 'uobaghdad', 'ali@gmail.com', 'card',
  (select id::text from ids where name = 'doc') || '/card.jpg');
select pg_temp.login_as('00000000-0000-0000-0000-00000000ab02', 'aal2');
select throws_ok(
  $$ select public.review_student_verification((select id from ids where name = 'doc'), true) $$,
  '42501', null, 'only Staff review documents'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000ab03', 'aal2');
select is((select count(*)::integer from public.student_verifications where status = 'pending'), 1, 'Staff see the document waiting');
select results_eq(
  $$ select email, document_path, char_length(delete_token)
     from public.review_student_verification((select id from ids where name = 'doc'), true) $$,
  $$ values ('ali@gmail.com', (select id::text from ids where name = 'doc') || '/card.jpg', 48) $$,
  'approving verifies them and hands back the document to delete'
);
select is((select document_path from public.student_verifications where id = (select id from ids where name = 'doc')), null,
  'the document is no longer kept');

-- ── Deleting it ──
select pg_temp.reset_role();
select is(public.delete_student_verification((select id from ids where name = 'again'), 'wrong'), false,
  'deleting needs the link''s token');
select is(
  (select count(*)::integer from public.claim_partner_webhooks(50) where url = 'https://books.example.iq/hooks/idea'),
  (select count(*)::integer from public.partner_webhook_events where client_id = 'pass_00000000000000000000sv01'),
  'apps/api takes the queued events with the partner''s webhook'
);
select public.finish_partner_webhook(e.id, false, 'HTTP 500') from public.partner_webhook_events e;
select ok((select bool_and(delivered_at is null and attempts = 1 and next_attempt_at > now()) from public.partner_webhook_events),
  'a failed delivery is tried again later');

-- ── The sweep ──
update public.student_verifications set created_at = now() - interval '2 days' where id = (select id from ids where name = 'doc');
insert into ids select 'old', public.create_student_verification('pass_00000000000000000000sv02', 'https://cafe.example.iq/back');
update public.student_verifications set created_at = now() - interval '2 days' where id = (select id from ids where name = 'old');
select is(public.sweep_student_verifications(), 1, 'unfinished verifications go after a day');

select * from finish();
rollback;
