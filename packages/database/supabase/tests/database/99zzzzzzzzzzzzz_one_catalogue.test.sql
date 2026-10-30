-- One catalogue: games, books and films are in Plus as well as the Store,
-- rent-only items are gone, and pictures are mandatory to go live.
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

select plan(10);

truncate public.products, public.product_categories cascade;

insert into public.product_categories (id, slug, name_ar, name_en, position, in_plus) values
  ('9b100000-0000-0000-0000-0000000000c1', 'games', 'الألعاب', 'Games', 1, true),
  ('9b100000-0000-0000-0000-0000000000c2', 'music', 'الموسيقى', 'Music', 2, false);
insert into public.product_categories (id, slug, name_ar, name_en, position, parent_id) values
  ('9b100000-0000-0000-0000-0000000000c3', 'retro', 'ألعاب قديمة', 'Retro games', 1, '9b100000-0000-0000-0000-0000000000c1');

insert into public.products (id, slug, status, category_id, name_ar, name_en, price, images) values
  ('9b100000-0000-0000-0000-0000000000a1', 'it-takes-two', 'active', '9b100000-0000-0000-0000-0000000000c1',
    'It Takes Two', 'It Takes Two', 39750, '{itt.jpg}'),
  ('9b100000-0000-0000-0000-0000000000a2', 'tetris', 'active', '9b100000-0000-0000-0000-0000000000c3',
    'Tetris', 'Tetris', 9750, '{tetris.jpg}'),
  ('9b100000-0000-0000-0000-0000000000a3', 'rumours', 'active', '9b100000-0000-0000-0000-0000000000c2',
    'Rumours', 'Rumours', 34750, '{rumours.jpg}'),
  ('9b100000-0000-0000-0000-0000000000a4', 'no-photo', 'draft', '9b100000-0000-0000-0000-0000000000c2',
    'No photo', 'No photo', 9750, '{}');

-- ── In Plus ──
select ok(
  (select rentable from public.products where slug = 'it-takes-two'),
  'a game is in Plus before any copy for rent comes in'
);
select ok(
  (select rentable from public.products where slug = 'tetris'),
  'so is a product of a Plus category''s subcategory'
);
select ok(
  not (select rentable from public.products where slug = 'rumours'),
  'music is not'
);

update public.products set category_id = '9b100000-0000-0000-0000-0000000000c1' where slug = 'rumours';
select ok(
  (select rentable from public.products where slug = 'rumours'),
  'moving a product into a Plus category puts it in Plus'
);
update public.product_categories set in_plus = false where slug = 'games';
select ok(
  not (select rentable from public.products where slug = 'tetris'),
  'taking a category out of Plus takes its subcategories'' products out'
);
update public.product_categories set in_plus = true where slug = 'games';

select is(
  (select count(*)::integer from public.products where kind = 'rental'),
  0,
  'no rent-only items are left'
);

-- ── Pictures ──
select throws_ok(
  $$ update public.products set status = 'active' where slug = 'no-photo' $$,
  '23514', 'Add a picture before publishing',
  'a product without a picture cannot go live'
);
update public.products set images = '{new.jpg}' where slug = 'no-photo';
select lives_ok(
  $$ update public.products set status = 'active' where slug = 'no-photo' $$,
  'with one it can'
);
update public.products set images = '{}' where slug = 'no-photo';
select is(
  (select status::text from public.products where slug = 'no-photo'),
  'draft',
  'a live product that loses its last picture goes back to draft'
);

update public.products set images = '{}' where slug = 'tetris';
insert into public.product_variants (product_id, label_en, label_ar, images, price)
select id, 'Game Boy', 'Game Boy', '{gb.jpg}', 9750 from public.products where slug = 'tetris';
update public.products set status = 'active' where slug = 'tetris';
select is(
  (select status::text from public.products where slug = 'tetris'),
  'active',
  'a variant''s picture is enough to go live'
);

select * from finish();
rollback;
