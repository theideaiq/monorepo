-- Catalog subcategories: one level under a top-level category, the new
-- categories and their rates, a parent's listing and search including its
-- subcategories.
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

-- ── The categories ──────────────────────────────────────────────────────────

select ok(
  exists (select 1 from public.product_categories where slug = 'board-games' and parent_id is null),
  'Board games is a top-level category'
);
select ok(
  exists (select 1 from public.product_categories where slug = 'trading-cards' and parent_id is null),
  'Trading cards is a top-level category'
);
select is(
  (select p.slug from public.product_categories c
   join public.product_categories p on p.id = c.parent_id where c.slug = 'comics-manga'),
  'books',
  'Comics & manga sits under Books'
);
select is(
  (select p.slug from public.product_categories c
   join public.product_categories p on p.id = c.parent_id where c.slug = 'textbooks'),
  'books',
  'Textbooks sit under Books'
);
select is(
  (select r.price from public.rental_rates r
   join public.product_categories c on c.id = r.category_id where c.slug = 'board-games'),
  9750::bigint,
  'Board games rent at the games rate'
);
select ok(
  not exists (
    select 1 from public.rental_rates r
    join public.product_categories c on c.id = r.category_id where c.slug = 'trading-cards'
  ),
  'Trading cards have no rental rate'
);
select ok(
  exists (
    select 1 from public.commission_rates r
    join public.product_categories c on c.id = r.category_id where c.slug = 'comics-manga'
  ),
  'A new category gets a commission rate'
);

-- ── One level ───────────────────────────────────────────────────────────────

select throws_ok(
  $$ insert into public.product_categories (slug, name_ar, name_en, parent_id)
     select 'shonen', 'شونين', 'Shonen', id from public.product_categories where slug = 'comics-manga' $$,
  '23514',
  'Subcategories are one level deep',
  'A subcategory cannot have subcategories'
);
select throws_ok(
  $$ update public.product_categories
     set parent_id = (select id from public.product_categories where slug = 'games')
     where slug = 'books' $$,
  '23514',
  'Subcategories are one level deep',
  'A category with subcategories stays top-level'
);
select throws_ok(
  $$ delete from public.product_categories where slug = 'books' $$,
  '23503',
  null,
  'A category with subcategories cannot be deleted'
);

-- ── Listing and search ──────────────────────────────────────────────────────

insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id)
select '9fd00000-0000-0000-0000-000000000001', 'akira-9zzd', 'أكيرا', 'Akira volume 1', 14750, 'active', 'sale', 'new', id
from public.product_categories where slug = 'comics-manga';

select pg_temp.login_anon();

select ok(
  exists (select 1 from public.listed_categories(false) where slug = 'comics-manga'),
  'A subcategory with products is listed'
);
select ok(
  exists (select 1 from public.listed_categories(false) where slug = 'books'),
  'Its parent is listed with it'
);
select is(
  (select count(*)::int from public.search_products('akira', 'sale', 'books')),
  1,
  'Searching a parent finds its subcategories'' products'
);
select is(
  (select count(*)::int from public.search_products('akira', 'sale', 'games')),
  0,
  'Searching another category does not'
);

select * from finish();
rollback;
