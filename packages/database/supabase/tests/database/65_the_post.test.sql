-- The IDEA Club: sections, bylines and members' work from accepted submissions.
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

select plan(11);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- M is a member who submits work, E an editor.
delete from public.staff;
truncate public.posts, public.submissions cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'pm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'pe@example.iq', '{"full_name":"Editor E"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000a2', 'editor');

insert into public.submissions (id, author_id, title, type, body, status) values
  ('00000000-0000-0000-0000-00000000a0a1', '00000000-0000-0000-0000-0000000000a1',
   'A poem', 'poetry', 'Lines', 'accepted'),
  ('00000000-0000-0000-0000-00000000a0a2', '00000000-0000-0000-0000-0000000000a1',
   'A draft', 'essay', 'Words', 'under_review');

-- ── Sections ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a2', 'aal2');

select lives_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section, published_at)
     values ('opening', 'افتتاح', 'Opening', 'news', now()),
            ('how-to-rent', 'كيف تستأجر', 'How to rent', 'learn', now()),
            ('draft-story', 'قصة', 'Story', 'stories', null) $$,
  'editors publish in every section'
);
select is(
  (select section::text from public.posts where slug = 'opening'),
  'news', 'posts are news unless editors choose a section'
);
select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en) values ('learn', 'x', 'x') $$,
  '23514', null, 'a post cannot take a section page''s address'
);

select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en) values ('events', 'x', 'x') $$,
  '23514', null, 'a post cannot take the events page''s address'
);
select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section) values ('old-work', 'x', 'x', 'members') $$,
  '23514', null, 'members'' work is published as Stories now'
);

-- ── Members' work ───────────────────────────────────────────────────────────

select lives_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section, byline, submission_id, published_at)
     values ('a-poem', 'قصيدة', 'A poem', 'stories', 'Member M',
             '00000000-0000-0000-0000-00000000a0a1', now()) $$,
  'an accepted submission becomes a story with the member''s byline'
);
select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section, submission_id)
     values ('a-draft', 'مسودة', 'A draft', 'stories', '00000000-0000-0000-0000-00000000a0a2') $$,
  '23514', 'Only an accepted submission can be published',
  'a submission still under review cannot be published'
);
select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section, submission_id)
     values ('a-poem-again', 'قصيدة', 'A poem', 'stories', '00000000-0000-0000-0000-00000000a0a1') $$,
  '23505', null, 'a submission is published once'
);

-- ── Readers ─────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select slug from public.posts order by slug $$,
  array['a-poem', 'how-to-rent', 'opening'],
  'readers see published posts in every section, not drafts'
);
select is(
  (select byline from public.posts where slug = 'a-poem'),
  'Member M', 'readers see the byline'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000a1');
select throws_ok(
  $$ insert into public.posts (slug, title_ar, title_en, section) values ('mine', 'x', 'x', 'stories') $$,
  '42501', null, 'members cannot publish posts themselves'
);

select * from finish();
rollback;
