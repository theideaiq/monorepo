-- Catalog tools (migration 20261120000200): search normalization and
-- ranking, who sees what through search_products, and the spreadsheet
-- import RPC. Run with `bun run db:test`.
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

select plan(28);

-- ── Fixtures ────────────────────────────────────────────────────────────────
truncate public.products, public.product_categories cascade;
delete from public.staff;

-- C is a customer, A an admin, E an editor.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'c@example.iq', '{"full_name":"Customer C"}'),
  ('00000000-0000-0000-0000-0000000000e2', 'a@example.iq', '{"full_name":"Admin A"}'),
  ('00000000-0000-0000-0000-0000000000e3', 'e@example.iq', '{"full_name":"Editor E"}');

insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000000e2', 'admin'),
  ('00000000-0000-0000-0000-0000000000e3', 'editor');

insert into public.product_categories (slug, name_ar, name_en) values
  ('vinyl', 'أسطوانات الفينيل', 'Vinyl records'),
  ('books', 'الكتب', 'Books');

insert into public.products (slug, name_ar, name_en, price, status, kind, details, description_ar, category_id) values
  ('adele-25-vinyl', 'أديل – 25 (أسطوانة فينيل)', 'Adele – 25 (Vinyl)', 69750, 'active', 'sale',
    '{"Artist":"Adele"}', null, (select id from public.product_categories where slug = 'vinyl')),
  ('adele-21-vinyl', 'أديل – 21 (أسطوانة فينيل)', 'Adele – 21 (Vinyl)', 69750, 'draft', 'sale',
    '{"Artist":"Adele"}', null, (select id from public.product_categories where slug = 'vinyl')),
  ('hounds-of-love-vinyl', 'Hounds of Love (أسطوانة فينيل)', 'Hounds of Love (Vinyl)', 49750, 'active', 'sale',
    '{"Artist":"Kate Bush"}', null, (select id from public.product_categories where slug = 'vinyl')),
  ('atomic-habits-book', 'العادات الذرية – جيمس كلير', 'Atomic Habits – James Clear', 20000, 'active', 'sale',
    '{"Author":"James Clear"}', 'كتابٌ عن العاداتِ الصغيرة', (select id from public.product_categories where slug = 'books')),
  ('rubber-soul-vinyl', 'روبر سول', 'Rubber Soul', 60000, 'active', 'sale', '{}', null, null),
  ('soul-blu-ray-rental', 'سول', 'Soul', 10000, 'active', 'rental', '{}', null, null);

-- ── Normalization ───────────────────────────────────────────────────────────

select is(private.normalize_search('أحمد إسلام آمال'), 'احمد اسلام امال',
  'Hamza and madda forms of alef become a bare alef');
select is(private.normalize_search('مكتبة مستشفى'), 'مكتبه مستشفي',
  'Ta marbuta becomes ha and alef maqsura becomes ya');
select is(private.normalize_search('الْعَرَبِيَّةُ'), 'العربيه',
  'Tashkeel is removed');
select is(private.normalize_search('مـــوسـيـقـى'), 'موسيكي',
  'Tatweel is removed (and ق folds to ك)');
select is(private.normalize_search('  Taylor   SWIFT '), 'taylor swift',
  'Latin text is lower-cased and spaces collapsed');
select is(private.normalize_search(null), '', 'Null normalizes to an empty string');

-- ── Search as a visitor ─────────────────────────────────────────────────────

select pg_temp.login_anon();

select results_eq(
  $$ select slug from public.search_products('adele') $$,
  array['adele-25-vinyl'],
  'Visitors find live products only (drafts stay hidden)'
);
select results_eq(
  $$ select slug from public.search_products('الذريه') $$,
  array['atomic-habits-book'],
  'Arabic search ignores the ة/ه difference'
);
select results_eq(
  $$ select slug from public.search_products('العادات الصغيره') $$,
  array['atomic-habits-book'],
  'Arabic search matches the description, without tashkeel'
);
select results_eq(
  $$ select slug from public.search_products('kate bush') $$,
  array['hounds-of-love-vinyl'],
  'Search matches specification values such as the artist'
);
select results_eq(
  $$ select slug from public.search_products('soul') $$,
  array['soul-blu-ray-rental', 'rubber-soul-vinyl'],
  'An exact name ranks before a name that contains the term'
);
select results_eq(
  $$ select slug from public.search_products('soul', 'sale') $$,
  array['rubber-soul-vinyl'],
  'The kind filter applies'
);
select results_eq(
  $$ select slug from public.search_products('clear', null, 'books') $$,
  array['atomic-habits-book'],
  'The category filter applies'
);
select results_eq(
  $$ select slug from public.search_products('adele 25') $$,
  array['adele-25-vinyl'],
  'Every word of a multi-word search must appear'
);
select results_eq(
  $$ select slug from public.search_products('atomik habits') $$,
  array['atomic-habits-book'],
  'Near misses match by trigram similarity'
);
select is_empty(
  $$ select slug from public.search_products('%') $$,
  'LIKE wildcards in the search are literal'
);
select is_empty(
  $$ select slug from public.search_products('   ') $$,
  'A blank search returns nothing'
);
select is_empty(
  $$ select * from public.products where slug = 'adele-21-vinyl' $$,
  'Visitors cannot read draft products directly either'
);

-- ── Search as staff ─────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal2');
select results_eq(
  $$ select slug from public.search_products('adele') $$,
  array['adele-25-vinyl'],
  'The store search shows live products to staff too'
);

-- ── Import ──────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select throws_ok(
  $$ select public.import_products('[]') $$,
  '42501',
  null,
  'Visitors may not import'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e1');
select throws_ok(
  $$ select public.import_products('[]') $$,
  '42501',
  'Not allowed',
  'Customers may not import'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal1');
select throws_ok(
  $$ select public.import_products('[]') $$,
  '42501',
  'Not allowed',
  'Admins need an authenticator-app session to import'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e3', 'aal2');
select throws_ok(
  $$ select public.import_products('[]') $$,
  '42501',
  'Not allowed',
  'Editors may not import'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal2');
select is(
  public.import_products($$[
    {"slug": "new-record-vinyl", "name_ar": "أسطوانة", "name_en": "New record (Vinyl)",
     "price": 50000, "category": "vinyl", "stock_count": 2,
     "images": ["https://coverartarchive.org/release-group/x/front-500"],
     "details": {"Barcode": "123"}},
    {"slug": "adele-25-vinyl", "price": 65000, "stock_count": 4,
     "details": {"SKU": "AD-25"}}
  ]$$),
  '{"inserted": 1, "updated": 1}'::jsonb,
  'Admins import new and existing products in one call'
);

select pg_temp.reset_role();
select results_eq(
  $$ select name_en, price, stock_count, status::text, details
     from public.products where slug = 'adele-25-vinyl' $$,
  $$ values ('Adele – 25 (Vinyl)'::text, 65000::bigint, 4, 'active'::text,
       '{"Artist": "Adele", "SKU": "AD-25"}'::jsonb) $$,
  'Fields missing from the sheet keep their value and details are merged'
);
select results_eq(
  $$ select p.status::text, p.kind::text, c.slug, p.images
     from public.products p join public.product_categories c on c.id = p.category_id
     where p.slug = 'new-record-vinyl' $$,
  $$ values ('draft'::text, 'sale'::text, 'vinyl'::text,
       array['https://coverartarchive.org/release-group/x/front-500']) $$,
  'New products start as drafts in their category'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000e2', 'aal2');
select throws_ok(
  $$ select public.import_products('[{"slug": "adele-25-vinyl", "price": 1},
                                      {"slug": "x", "category": "no-such-category"}]') $$,
  '23503',
  null,
  'An unknown category fails the whole batch'
);

select pg_temp.reset_role();
select is(
  (select price from public.products where slug = 'adele-25-vinyl'),
  65000::bigint,
  'A failed batch changes nothing'
);

select * from finish();
rollback;
