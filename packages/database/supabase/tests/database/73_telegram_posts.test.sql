-- Automatic posts to the Club's topics: the queue (telegram_posts) and its claim.
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

truncate public.telegram_posts;

-- A published post, a scheduled one and a draft.
insert into public.posts (id, section, slug, title_ar, title_en, body_ar, body_en, published_at) values
  ('00000000-0000-0000-0000-00000000a001', 'news', 'tp-now', 'خبر', 'News', 'نص', 'Body', now()),
  ('00000000-0000-0000-0000-00000000a002', 'news', 'tp-later', 'لاحقاً', 'Later', 'نص', 'Body', now() + interval '1 day'),
  ('00000000-0000-0000-0000-00000000a003', 'news', 'tp-draft', 'مسودة', 'Draft', 'نص', 'Body', null);

select results_eq(
  $$ select ref_id from public.telegram_posts where kind = 'news' $$,
  $$ values ('00000000-0000-0000-0000-00000000a001'::uuid) $$,
  'only a post published now is queued'
);

update public.posts set published_at = now() where id = '00000000-0000-0000-0000-00000000a003';
select is(
  (select count(*)::integer from public.telegram_posts where kind = 'news'),
  2,
  'publishing a draft queues it'
);
update public.posts set title_en = 'News, edited', published_at = now()
  where id = '00000000-0000-0000-0000-00000000a001';
select is(
  (select count(*)::integer from public.telegram_posts where kind = 'news'),
  2,
  'editing a published post queues nothing new'
);

-- Events: published and upcoming only.
insert into public.events (id, slug, title_ar, title_en, location, starts_at, published) values
  ('00000000-0000-0000-0000-00000000b001', 'tp-event', 'أمسية', 'Night', 'Baghdad', now() + interval '3 days', true),
  ('00000000-0000-0000-0000-00000000b002', 'tp-hidden', 'مخفية', 'Hidden', 'Baghdad', now() + interval '3 days', false),
  ('00000000-0000-0000-0000-00000000b003', 'tp-past', 'ماضية', 'Past', 'Baghdad', now() - interval '3 days', true);
select results_eq(
  $$ select ref_id from public.telegram_posts where kind = 'events' $$,
  $$ values ('00000000-0000-0000-0000-00000000b001'::uuid) $$,
  'a published upcoming event is queued'
);
update public.events set published = true where id = '00000000-0000-0000-0000-00000000b002';
select is(
  (select count(*)::integer from public.telegram_posts where kind = 'events'),
  2,
  'publishing an event queues it'
);

-- Products: new ones that go on sale, not old ones coming back.
insert into public.products (id, slug, name_ar, name_en, price, status, created_at, images) values
  ('00000000-0000-0000-0000-00000000c001', 'tp-new', 'جديد', 'New thing', 1000, 'active', now(), '{new.jpg}'),
  ('00000000-0000-0000-0000-00000000c002', 'tp-draft', 'مسودة', 'Draft thing', 1000, 'draft', now(), '{draft.jpg}'),
  ('00000000-0000-0000-0000-00000000c003', 'tp-old', 'قديم', 'Old thing', 1000, 'archived', now() - interval '60 days', '{old.jpg}');
update public.products set status = 'active'
  where id in ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-00000000c003');
select results_eq(
  $$ select ref_id from public.telegram_posts where kind = 'arrivals' order by ref_id $$,
  $$ values ('00000000-0000-0000-0000-00000000c001'::uuid), ('00000000-0000-0000-0000-00000000c002'::uuid) $$,
  'new products that go on sale are queued, old ones coming back are not'
);

-- The catch-up queues scheduled posts once their time has come (the seed's
-- posts move out of its two-day window first).
update public.posts set published_at = now() - interval '10 days' where slug not like 'tp-%';
update public.posts set published_at = now() - interval '1 minute'
  where id = '00000000-0000-0000-0000-00000000a002';
select is(
  (select count(*)::integer from public.telegram_posts where ref_id = '00000000-0000-0000-0000-00000000a002'),
  1,
  'bringing a scheduled post forward queues it'
);
-- A scheduled post whose time simply came has no update to fire on.
delete from public.telegram_posts where ref_id = '00000000-0000-0000-0000-00000000a002';
select is(public.queue_due_telegram_posts(), 1, 'the catch-up queues a post whose time has come');

-- Claiming: each row once.
select is((select count(*)::integer from public.claim_telegram_posts()), 7, 'claims every unsent post');
select is_empty($$ select * from public.claim_telegram_posts() $$, 'and never twice');

-- Only the service role may claim.
select pg_temp.login_anon();
select throws_ok($$ select * from public.claim_telegram_posts() $$, '42501', null, 'visitors can''t claim posts');
select pg_temp.reset_role();

select * from finish();
rollback;
