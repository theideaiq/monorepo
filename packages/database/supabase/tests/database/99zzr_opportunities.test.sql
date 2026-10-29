-- Opportunities: organizations post, editors review, members follow.
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

select plan(23);

-- O owns Org (M a member), X is someone else, E is an editor, F follows.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a2a1', 'o9zzr@example.iq'),
  ('00000000-0000-0000-0000-00000000a2a2', 'm9zzr@example.iq'),
  ('00000000-0000-0000-0000-00000000a2a3', 'x9zzr@example.iq'),
  ('00000000-0000-0000-0000-00000000a2a4', 'e9zzr@example.iq'),
  ('00000000-0000-0000-0000-00000000a2a5', 'f9zzr@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000a2a4', 'editor');
insert into public.organizations (id, name, slug, created_by, features) values
  ('9a4a0000-0000-0000-0000-0000000000a1', 'Tech Co', 'tech-9zzr', '00000000-0000-0000-0000-00000000a2a1', '{opportunities}');
insert into public.organization_members (organization_id, user_id, role) values
  ('9a4a0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a2a1', 'owner'),
  ('9a4a0000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000a2a2', 'member');

-- ── Posting ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a2');
select throws_ok(
  $$ insert into public.opportunities (organization_id, kind, title_ar, title_en, remote)
     values ('9a4a0000-0000-0000-0000-0000000000a1', 'job', 'وظيفة', 'A job', true) $$,
  '42501', null, 'members can''t post'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a1');
insert into public.opportunities (id, organization_id, kind, title_ar, title_en, remote, status, featured_until, apply_url)
values ('9a4a0000-0000-0000-0000-0000000000b1', '9a4a0000-0000-0000-0000-0000000000a1', 'internship',
  'تدريب صيفي', 'Summer Internship', true, 'approved', now() + interval '1 year', 'https://tech.example/apply');
select results_eq(
  $$ select status, featured_until is null, slug like 'summer-internship-%'
     from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('draft'::text, true, true) $$,
  'an organization''s new opportunity is a draft, unfeatured, with a slug'
);
select throws_ok(
  $$ insert into public.opportunities (organization_id, kind, title_ar, title_en)
     values ('9a4a0000-0000-0000-0000-0000000000a1', 'job', 'وظيفة', 'A job') $$,
  '23514', null, 'an opportunity is remote or has a place'
);
select throws_ok(
  $$ update public.opportunities set status = 'approved' where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  '42501', 'Only editors decide on opportunities', 'organizations can''t approve their own'
);
update public.opportunities set status = 'pending' where id = '9a4a0000-0000-0000-0000-0000000000b1';
select isnt(
  (select submitted_at from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1'),
  null, 'sending it for review records when'
);

select pg_temp.login_anon();
select is_empty(
  $$ select 1 from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  'visitors don''t see it before review'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a3');
select is_empty(
  $$ select 1 from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  'nor does anyone outside the organization'
);
select throws_ok(
  $$ select public.review_opportunity('9a4a0000-0000-0000-0000-0000000000b1', 'approved') $$,
  '42501', 'Not allowed', 'only editors review'
);

-- ── Review ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a4', 'aal2');
select throws_ok(
  $$ select public.review_opportunity('9a4a0000-0000-0000-0000-0000000000b1', 'changes') $$,
  '23514', 'Say what to change', 'asking for changes needs a note'
);
select public.review_opportunity('9a4a0000-0000-0000-0000-0000000000b1', 'changes', 'Add the deadline');
select pg_temp.reset_role();
select is(
  (select count(*)::integer from public.notifications
   where user_id = '00000000-0000-0000-0000-00000000a2a1' and event = 'opportunity_changes'
     and link = '/business/opportunities'),
  1, 'the owner hears what to change'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a1');
update public.opportunities set deadline = now() + interval '2 days', status = 'pending'
where id = '9a4a0000-0000-0000-0000-0000000000b1';
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a4', 'aal2');
select public.review_opportunity('9a4a0000-0000-0000-0000-0000000000b1', 'approved');
update public.opportunities set featured_until = now() + interval '7 days'
where id = '9a4a0000-0000-0000-0000-0000000000b1';
select results_eq(
  $$ select status, published_at is not null, featured_until is not null
     from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('approved'::text, true, true) $$,
  'an editor approves it and features it'
);

select pg_temp.login_anon();
select is(
  (select title_en from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1'),
  'Summer Internship', 'once approved, everyone sees it'
);

-- Editing a listed opportunity sends it back for review; review fields stay.
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a1');
update public.opportunities set title_en = 'Summer Internship 2027', featured_until = null
where id = '9a4a0000-0000-0000-0000-0000000000b1';
select results_eq(
  $$ select status, featured_until is not null
     from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  $$ values ('pending'::text, true) $$,
  'changing a listed opportunity sends it back for review (still featured)'
);
delete from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1';
select isnt_empty(
  $$ select 1 from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b1' $$,
  'a listed (or pending) opportunity can''t be deleted by its organization'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a4', 'aal2');
select public.review_opportunity('9a4a0000-0000-0000-0000-0000000000b1', 'approved');

-- ── Following ──────────────────────────────────────────────────────────────

-- The IDEA's own program, not open yet.
insert into public.opportunities (id, kind, title_ar, title_en, location, status, opens_at, deadline)
values ('9a4a0000-0000-0000-0000-0000000000b2', 'program', 'برنامج', 'Exchange program', 'Baghdad',
  'approved', now() + interval '10 days', now() + interval '40 days');
select is(
  (select organization_id from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b2'),
  null, 'editors post The IDEA''s own'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a5');
insert into public.opportunity_follows (user_id, opportunity_id) values
  ('00000000-0000-0000-0000-00000000a2a5', '9a4a0000-0000-0000-0000-0000000000b1'),
  ('00000000-0000-0000-0000-00000000a2a5', '9a4a0000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$ insert into public.opportunity_follows (user_id, opportunity_id)
     values ('00000000-0000-0000-0000-00000000a2a3', '9a4a0000-0000-0000-0000-0000000000b2') $$,
  '42501', null, 'members follow only for themselves'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a3');
select is_empty(
  $$ select 1 from public.opportunity_follows $$, 'members see only what they follow'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a2');
select results_eq(
  $$ select followers from public.opportunity_followers('9a4a0000-0000-0000-0000-0000000000a1') $$,
  $$ values (1::bigint) $$,
  'the organization sees how many follow, not who'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a2a3');
select throws_ok(
  $$ select * from public.opportunity_followers('9a4a0000-0000-0000-0000-0000000000a1') $$,
  '42501', 'Not allowed', 'others don''t'
);

-- The cron: the internship is open and closes within three days; the
-- program hasn't opened yet.
select pg_temp.reset_role();
select is(public.notify_opportunity_followers(), 2, 'followers hear it opened and that it closes soon');
select results_eq(
  $$ select event from public.notifications
     where user_id = '00000000-0000-0000-0000-00000000a2a5' order by event $$,
  $$ values ('opportunity_deadline'::text), ('opportunity_open'::text) $$,
  'one notification each'
);
select is(public.notify_opportunity_followers(), 0, 'and only once');

-- Past its deadline it closes, and stays listed so people can follow it.
update public.opportunities set deadline = now() - interval '1 minute', opens_at = null
where id = '9a4a0000-0000-0000-0000-0000000000b2';
select public.notify_opportunity_followers();
select is(
  (select status from public.opportunities where id = '9a4a0000-0000-0000-0000-0000000000b2'),
  'closed', 'an opportunity past its deadline closes'
);

select * from finish();
rollback;
