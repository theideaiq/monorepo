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

-- I asks for an identity check, E is an educator by staff email, D by
-- letter, S is support.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a271', 'i9zzo@example.iq'),
  ('00000000-0000-0000-0000-00000000a272', 'e9zzo@example.iq'),
  ('00000000-0000-0000-0000-00000000a273', 'd9zzo@example.iq'),
  ('00000000-0000-0000-0000-00000000a274', 's9zzo@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-00000000a274', 'support');
create temporary table made (request uuid, code text);
grant all on made to authenticated, anon;

-- ── Identity ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a271');
select throws_ok(
  $$ select public.request_identity_check(array['00000000-0000-0000-0000-00000000a271/front.jpg']) $$,
  '23514', 'Add both sides of your National Card and a selfie', 'all three photos are needed'
);
select throws_ok(
  $$ select public.request_identity_check(array[
       '00000000-0000-0000-0000-00000000a271/front.jpg',
       '00000000-0000-0000-0000-00000000a271/back.jpg',
       '00000000-0000-0000-0000-00000000a272/selfie.jpg']) $$,
  '23514', 'Add both sides of your National Card and a selfie', 'only from the member''s own folder'
);
insert into made (request) select public.request_identity_check(array[
  '00000000-0000-0000-0000-00000000a271/front.jpg',
  '00000000-0000-0000-0000-00000000a271/back.jpg',
  '00000000-0000-0000-0000-00000000a271/selfie.jpg']);
select is(
  (public.my_verifications() -> 'identity' ->> 'pending')::boolean, true, 'the check waits for review'
);
select throws_ok(
  $$ select public.review_identity_check((select request from made limit 1), true, 'Ibrahim') $$,
  '42501', 'Not allowed', 'members can''t approve themselves'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a274', 'aal2');
select is(
  (select count(*)::integer from public.verification_requests where status = 'pending' and kind = 'identity'
     and user_id = '00000000-0000-0000-0000-00000000a271'),
  1, 'support sees it in the inbox'
);
select throws_ok(
  $$ select public.review_identity_check((select request from made limit 1), true) $$,
  '23514', 'Enter the name on the card', 'approving needs the name on the card'
);
select is(
  public.review_identity_check((select request from made limit 1), true, 'Ibrahim Ahmed'),
  array['00000000-0000-0000-0000-00000000a271/front.jpg',
        '00000000-0000-0000-0000-00000000a271/back.jpg',
        '00000000-0000-0000-0000-00000000a271/selfie.jpg'],
  'approving returns the photos to delete'
);
select is(
  (select cardinality(files) from public.verification_requests where id = (select request from made limit 1)),
  0, 'and keeps no paths'
);
select pg_temp.reset_role();
select ok(private.identity_verified('00000000-0000-0000-0000-00000000a271'), 'the identity is verified');

-- ── Educators ──────────────────────────────────────────────────────────────

delete from made;
select throws_ok(
  $$ select public.issue_educator_code('00000000-0000-0000-0000-00000000a272', 'auib', 'e@gmail.com') $$,
  '23514', 'Use your university email', 'a staff email at the university'
);
insert into made (code) select public.issue_educator_code(
  '00000000-0000-0000-0000-00000000a272', 'auib', 'teacher@auib.edu.iq');
select pg_temp.login_as('00000000-0000-0000-0000-00000000a272');
select is(
  (public.confirm_educator_email((select code from made limit 1))).method, 'email',
  'the emailed code gives the badge'
);
select pg_temp.reset_role();
select ok(
  private.is_student('00000000-0000-0000-0000-00000000a272')
    and not private.is_enrolled_student('00000000-0000-0000-0000-00000000a272'),
  'educators get student perks without being students'
);
select is(
  private.pass_card('00000000-0000-0000-0000-00000000a272') - 'name' - 'member_number' - 'since' - 'plan_en' - 'plan_ar',
  '{"student": false, "educator": true}'::jsonb,
  'the Pass card says educator'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a273');
delete from made;
insert into made (request) select public.request_educator_check(
  'Baghdad College', array['00000000-0000-0000-0000-00000000a273/letter.pdf']);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a274', 'aal2');
select public.review_educator_check((select request from made limit 1), true);
select pg_temp.reset_role();
select is(
  (select institution || ' ' || method from public.educator_badges
   where user_id = '00000000-0000-0000-0000-00000000a273'),
  'Baghdad College document', 'support approves a letter'
);

select * from finish();
rollback;
