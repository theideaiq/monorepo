-- Rentable products and the categories each tab lists.
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
select plan(9);

truncate public.products, public.product_categories cascade;

insert into public.product_categories (id, slug, name_ar, name_en, position) values
  ('82000000-0000-0000-0000-0000000000c1', 'gaming', 'الألعاب', 'Gaming', 1),
  ('82000000-0000-0000-0000-0000000000c2', 'films', 'الأفلام', 'Films', 2),
  ('82000000-0000-0000-0000-0000000000c3', 'phones', 'الهواتف', 'Phones', 3),
  ('82000000-0000-0000-0000-0000000000c4', 'music', 'الموسيقى', 'Music', 4);

insert into public.products (id, slug, kind, status, category_id, name_ar, name_en, price, stock_count) values
  ('82000000-0000-0000-0000-0000000000a1', 'astro-bot', 'sale', 'active', '82000000-0000-0000-0000-0000000000c1',
    'Astro Bot', 'Astro Bot', 89750, 3),
  ('82000000-0000-0000-0000-0000000000a2', 'dune-part-two', 'rental', 'active', '82000000-0000-0000-0000-0000000000c2',
    'Dune: Part Two', 'Dune: Part Two', 24750, 2),
  ('82000000-0000-0000-0000-0000000000a3', 'adele-21', 'sale', 'draft', '82000000-0000-0000-0000-0000000000c4',
    'Adele – 21', 'Adele – 21', 39750, 1);

-- ── Rentable ───────────────────────────────────────────────────────────────

select ok(
  (select rentable from public.products where slug = 'dune-part-two'),
  'a rental item can be rented'
);
select ok(
  not (select rentable from public.products where slug = 'astro-bot'),
  'a shop product without copies for rent cannot'
);

insert into public.stock_items (product_id, condition, purpose)
values ('82000000-0000-0000-0000-0000000000a1', 'new', 'rental');
select ok(
  (select rentable from public.products where slug = 'astro-bot'),
  'a copy for rent makes a shop product rentable'
);

update public.stock_items set status = 'rented'
where product_id = '82000000-0000-0000-0000-0000000000a1' and purpose = 'rental';
select ok(
  (select rentable from public.products where slug = 'astro-bot'),
  'it stays rentable while its copy is out'
);

update public.stock_items set status = 'retired'
where product_id = '82000000-0000-0000-0000-0000000000a1' and purpose = 'rental';
select ok(
  not (select rentable from public.products where slug = 'astro-bot'),
  'retiring its last copy for rent takes it off the Rent tab'
);

update public.stock_items set status = 'available'
where product_id = '82000000-0000-0000-0000-0000000000a1' and purpose = 'rental';

-- ── Listed categories ──────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select slug from public.listed_categories() $$,
  $$ values ('gaming') $$,
  'the shop lists categories with active products for sale'
);
select results_eq(
  $$ select slug from public.listed_categories(true) $$,
  $$ values ('gaming'), ('films') $$,
  'the Rent tab lists categories with rentable products, in order'
);
select pg_temp.reset_role();

update public.products set status = 'active' where slug = 'adele-21';
select pg_temp.login_anon();
select results_eq(
  $$ select slug from public.listed_categories() $$,
  $$ values ('gaming'), ('music') $$,
  'a category shows once it has an active product'
);
select pg_temp.reset_role();

select hasnt_column('public', 'product_categories', 'kind', 'categories have no kind');

select * from finish();
rollback;
