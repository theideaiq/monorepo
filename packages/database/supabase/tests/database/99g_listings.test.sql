-- Listings: barcodes, shop offers, products shops create (with checks),
-- flags and Notify me.
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

select plan(25);

-- O owns Shop (M a plain member), X runs a pending shop, U a customer, A staff.
truncate public.products, public.orders cascade;
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ae1', 'o9g@example.iq'),
  ('00000000-0000-0000-0000-000000000ae2', 'm9g@example.iq'),
  ('00000000-0000-0000-0000-000000000ae3', 'x9g@example.iq'),
  ('00000000-0000-0000-0000-000000000ae4', 'u9g@example.iq'),
  ('00000000-0000-0000-0000-000000000ae5', 'a9g@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000ae5', 'admin');
insert into public.organizations (id, name, slug, created_by) values
  ('9e000000-0000-0000-0000-0000000000c1', 'Book Shop', 'books-9g', '00000000-0000-0000-0000-000000000ae1'),
  ('9e000000-0000-0000-0000-0000000000c2', 'Other Shop', 'other-9g', '00000000-0000-0000-0000-000000000ae3');
insert into public.organization_members (organization_id, user_id, role) values
  ('9e000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000ae1', 'owner'),
  ('9e000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000ae2', 'member'),
  ('9e000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000ae3', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9e000000-0000-0000-0000-0000000000d1', '9e000000-0000-0000-0000-0000000000c1', 'Book Shop', 'approved'),
  ('9e000000-0000-0000-0000-0000000000d2', '9e000000-0000-0000-0000-0000000000c2', 'Other Shop', 'pending');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9e000000-0000-0000-0000-000000000001', 'dune-9g', 'كثيب', 'Dune', 14750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'books'));
update public.product_variants set barcode = '0-441-17271-7'
where product_id = '9e000000-0000-0000-0000-000000000001';
insert into public.banned_terms (term) values ('replica');

-- ── Barcodes ────────────────────────────────────────────────────────────────

select is(
  (select barcode from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
  '9780441172719', 'An ISBN-10 is stored as its ISBN-13'
);
select throws_ok(
  $$ update public.product_variants set barcode = 'abc' where product_id = '9e000000-0000-0000-0000-000000000001' $$,
  '23514', 'Invalid barcode', 'A barcode must be 8 to 14 digits or an ISBN-10'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select is(
  (select name_en from public.find_by_barcode('978-0441172719')), 'Dune',
  'A shop finds a product by its barcode, typed any way'
);

-- ── Offers ──────────────────────────────────────────────────────────────────

select lives_ok(
  $$ select public.set_offer('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
       'used', 9750, 3, 'BK-001') $$,
  'An owner of an approved shop adds an offer'
);
select pg_temp.reset_role();
select results_eq(
  $$ select count(*)::int, min(price) from public.stock_items
     where seller_id = '9e000000-0000-0000-0000-0000000000d1' and status = 'available' $$,
  $$ values (3, 9750::bigint) $$,
  'The offer has 3 available copies at its price'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select lives_ok(
  $$ select public.set_offer('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
       'used', 8750, 1, 'BK-001') $$,
  'The shop lowers the price and the quantity'
);
select pg_temp.reset_role();
select results_eq(
  $$ select count(*) filter (where status = 'available')::int, count(*) filter (where status = 'retired')::int,
       min(price) filter (where status = 'available')
     from public.stock_items where seller_id = '9e000000-0000-0000-0000-0000000000d1' $$,
  $$ values (1, 2, 8750::bigint) $$,
  'Extra copies are retired and the rest take the new price'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select is(
  (select sku from public.seller_offers), 'BK-001', 'The shop sees its offer and SKU'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae2');
select throws_ok(
  $$ select public.set_offer('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
       'new', 14750, 1) $$,
  '42501', null, 'A plain member can''t list'
);
select is((select count(*)::int from public.seller_offers), 1, 'Members still see the shop''s offers');

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae3');
select throws_ok(
  $$ select public.set_offer('9e000000-0000-0000-0000-0000000000d2',
       (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
       'new', 14750, 1) $$,
  '42501', null, 'A shop that isn''t approved can''t list'
);
select is((select count(*)::int from public.seller_offers), 0, 'Other shops don''t see the offer');

-- ── What Partners shows ─────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae2');
select results_eq(
  $$ select name_en, condition::text, price, sku, available, sold
     from public.seller_listings('9e000000-0000-0000-0000-0000000000d1') $$,
  $$ values ('Dune', 'used', 8750::bigint, 'BK-001', 1, 0) $$,
  'Members see each offer with its product and copies'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ae3');
select is_empty(
  $$ select 1 from public.seller_listings('9e000000-0000-0000-0000-0000000000d1') $$,
  'Other shops see nothing'
);
select pg_temp.login_anon();
select throws_ok(
  $$ select 1 from public.seller_listings('9e000000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'Visitors can''t ask'
);

-- ── Products shops create ───────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select throws_ok(
  $$ select public.create_listing('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_categories where slug = 'books'),
       'Dune again', null, '9780441172719', '{}', '{}', 'new', 14750, 1) $$,
  '23505', 'Product exists', 'A barcode already in the catalogue must be picked, not created'
);
select lives_ok(
  $$ select public.create_listing('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_categories where slug = 'books'),
       'Foundation', 'الأساس', '9780553293357', '{}', '{}', 'new', 19750, 2, 'BK-002') $$,
  'A shop creates a product that isn''t listed yet'
);
select lives_ok(
  $$ select public.create_listing('9e000000-0000-0000-0000-0000000000d1',
       (select id from public.product_categories where slug = 'books'),
       'Replica sword', null, null, '{a.jpg}', '{}', 'new', 49750, 1) $$,
  'A product naming a banned item is still saved'
);

select pg_temp.reset_role();
select results_eq(
  $$ select p.status::text, v.barcode, (select count(*)::int from public.product_variants v2 where v2.product_id = p.id)
     from public.products p join public.product_variants v on v.product_id = p.id
     where p.name_en = 'Foundation' $$,
  $$ values ('active', '9780553293357', 1) $$,
  'It goes live at once with one variant carrying the barcode'
);
select is(
  (select status::text from public.products where name_en = 'Replica sword'), 'draft',
  'A banned item stays a draft'
);
select results_eq(
  $$ select p.name_en, c.reason::text from public.product_checks c
     join public.products p on p.id = c.product_id order by 1, 2 $$,
  $$ values ('Foundation', 'missing_photo'), ('Replica sword', 'banned') $$,
  'The checks send what they find to Staff'
);

-- ── Flags ───────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ae2');
select lives_ok(
  $$ insert into public.product_flags (product_id, seller_id, flagged_by, note)
     values ('9e000000-0000-0000-0000-000000000001', '9e000000-0000-0000-0000-0000000000d1',
             '00000000-0000-0000-0000-000000000ae2', 'The author is missing') $$,
  'A shop member flags wrong details'
);
update public.products set name_en = 'Dune (fixed)' where id = '9e000000-0000-0000-0000-000000000001';
select is(
  (select name_en from public.products where id = '9e000000-0000-0000-0000-000000000001'), 'Dune',
  'Shops never edit products'
);

-- ── Notify me ───────────────────────────────────────────────────────────────

select pg_temp.reset_role();
update public.stock_items set status = 'retired'
where product_id = '9e000000-0000-0000-0000-000000000001' and status = 'available';
select pg_temp.login_as('00000000-0000-0000-0000-000000000ae4');
insert into public.wishlist_items (user_id, product_id)
values ('00000000-0000-0000-0000-000000000ae4', '9e000000-0000-0000-0000-000000000001');
select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select public.set_offer('9e000000-0000-0000-0000-0000000000d1',
  (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
  'used', 8750, 1, 'BK-001');
select pg_temp.reset_role();
select results_eq(
  $$ select event, link from public.notifications where user_id = '00000000-0000-0000-0000-000000000ae4' $$,
  $$ values ('saved_back_in_stock', '/store/dune-9g') $$,
  'A new offer tells those who saved it'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ae1');
select public.set_offer('9e000000-0000-0000-0000-0000000000d1',
  (select id from public.product_variants where product_id = '9e000000-0000-0000-0000-000000000001'),
  'new', 9750, 1, 'BK-9G-NEW');
select pg_temp.reset_role();
select is(
  (select count(*)::int from public.notifications where user_id = '00000000-0000-0000-0000-000000000ae4'),
  1, 'A second listing in stock is not news'
);

select * from finish();
rollback;
