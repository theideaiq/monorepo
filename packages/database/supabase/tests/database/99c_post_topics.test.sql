-- The IDEA Club's Read feed: topic tags on posts.
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
select plan(7);

truncate public.posts cascade;

insert into public.posts (slug, title_ar, title_en, section, published_at) values
  ('a-news', 'x', 'x', 'news', now()),
  ('a-guide', 'x', 'x', 'learn', now()),
  ('a-story', 'x', 'x', 'stories', now());

select is(
  (select topics::text from public.posts where slug = 'a-news'), '{news}',
  'a news post is tagged news'
);
select is(
  (select topics::text from public.posts where slug = 'a-guide'), '{guides}',
  'a learn post is tagged guides'
);
select is(
  (select topics::text from public.posts where slug = 'a-story'), '{stories}',
  'a story is tagged stories'
);

update public.posts set topics = '{stories,news,news}' where slug = 'a-news';
select is(
  (select topics::text from public.posts where slug = 'a-news'), '{news,stories}',
  'topics are kept once each, in order'
);

update public.posts set topics = '{}' where slug = 'a-guide';
select is(
  (select topics::text from public.posts where slug = 'a-guide'), '{guides}',
  'a post is never left without a topic'
);

select throws_ok(
  $$ update public.posts set topics = '{music}' where slug = 'a-story' $$,
  '22P02', null, 'only known topics'
);

select is(
  (select count(*)::int from public.posts where topics @> '{news}'), 1,
  'the feed filters by topic'
);

select * from finish();
rollback;
