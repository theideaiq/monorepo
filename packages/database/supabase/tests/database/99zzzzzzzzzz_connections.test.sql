-- Connections: external IDs, list imports and wanted items, music tastes. Run with `bun run db:test`.
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

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- L imports a list; V is someone else.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'cl@example.iq', '{"full_name":"List L"}'),
  ('00000000-0000-0000-0000-0000000000b2', 'cv@example.iq', '{"full_name":"Other V"}');

insert into public.saved_lists (id, user_id, name) values
  ('99100000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', 'Reading');

create temporary table seeded as
select p.id, p.name_en, p.slug from public.products p where p.name_en in ('Kind of Blue', 'The Alchemist');
grant select on seeded to public;

update public.product_variants set barcode = '9780061122415'
where product_id = (select id from seeded where name_en = 'The Alchemist');

-- ── External IDs ───────────────────────────────────────────────────────────

select throws_ok(
  $$ update public.products set external_ids = '[]' where name_en = 'Kind of Blue' $$,
  '23514', null, 'external IDs are an object'
);
update public.products set external_ids = '{"discogs": "123"}' where name_en = 'Kind of Blue';

-- ── Importing a list ───────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select throws_ok(
  $$ select * from public.import_list_items('99100000-0000-0000-0000-0000000000a1', '[]') $$,
  '42501', null, 'only the list''s owner imports into it'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select results_eq(
  $$ select matched, wanted from public.import_list_items(
       '99100000-0000-0000-0000-0000000000a1',
       '[
         {"source": "goodreads", "kind": "book", "title": "Some other title", "barcode": "978-0-06-112241-5"},
         {"source": "discogs", "kind": "record", "title": "Not the name", "external_ids": {"discogs": "123"}},
         {"source": "letterboxd", "kind": "film", "title": "Paris, Texas", "year": "1984"},
         {"source": "goodreads", "kind": "book", "title": "  "},
         {"source": "spotify", "kind": "record", "title": "Ignored"}
       ]'::jsonb) $$,
  $$ values (2, 1) $$,
  'matches by ISBN and by external ID; keeps the rest as wanted; skips bad rows'
);
select is(
  (select count(*)::integer from public.wishlist_items
   where user_id = '00000000-0000-0000-0000-0000000000b1'
     and list_id = '99100000-0000-0000-0000-0000000000a1' and notify),
  2, 'matches join the list with alerts on'
);
select results_eq(
  $$ select title, kind, year from public.wanted_items $$,
  $$ values ('Paris, Texas'::text, 'film'::text, 1984) $$,
  'the member sees what is wanted'
);
select is(
  (select matched from public.import_list_items(
     '99100000-0000-0000-0000-0000000000a1',
     '[{"source": "letterboxd", "kind": "film", "title": "Paris, Texas", "year": "1984"}]'::jsonb)),
  0, 'importing again keeps one wanted item'
);
select is((select count(*)::integer from public.wanted_items), 1, 'with no duplicate');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::integer from public.wanted_items), 0, 'others see none of it');

-- ── A wanted item arrives ──────────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.products (slug, name_ar, name_en, price, stock_count, status, kind, category_id)
select 'paris-texas-test', 'باريس، تكساس', 'Paris, Texas', 24750, 2, 'active', 'sale', c.id
from public.product_categories c where c.slug = 'films';
select is(
  (select count(*)::integer from public.wanted_items where matched_at is not null),
  1, 'when it goes live the wanted item is matched'
);
select is(
  (select count(*)::integer from public.wishlist_items w
   join public.products p on p.id = w.product_id
   where w.user_id = '00000000-0000-0000-0000-0000000000b1' and p.slug = 'paris-texas-test'),
  1, 'joins the list'
);
select is(
  (select link from public.notifications
   where user_id = '00000000-0000-0000-0000-0000000000b1' and event = 'wanted_in_store'),
  '/store/paris-texas-test', 'and the member is told'
);

-- ── Music tastes ───────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select throws_ok(
  $$ select public.save_music_taste('00000000-0000-0000-0000-0000000000b1', 'lastfm', 'me', '{x}') $$,
  '42501', null, 'only the API saves music tastes'
);

select pg_temp.reset_role();
select public.save_music_taste(
  '00000000-0000-0000-0000-0000000000b1', 'spotify', 'List L',
  array['Miles Davis', 'MILES DAVIS', 'Fleetwood Mac'], 'refresh-token'
);
select is(
  (select artists from public.music_tastes where user_id = '00000000-0000-0000-0000-0000000000b1'),
  array['miles davis', 'fleetwood mac'],
  'artists are folded, once each, in listening order'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000b1');
select ok(
  (select count(*) >= 1 from public.vinyl_from_my_artists()
   where product_id = (select id from seeded where name_en = 'Kind of Blue')),
  'the Store''s vinyl by those artists is suggested'
);
delete from public.music_tastes;
select pg_temp.reset_role();
select is(
  (select count(*)::integer from private.music_tokens where user_id = '00000000-0000-0000-0000-0000000000b1'),
  0, 'disconnecting forgets the Spotify token'
);

select * from finish();
rollback;
