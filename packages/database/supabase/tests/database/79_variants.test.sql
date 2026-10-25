-- Variants: every product has one, prices and stock derive from them, and
-- orders, rentals, search and the import work per variant.
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
select plan(22);

delete from public.staff;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000079a1', 'vm@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-0000000079a2', 'va@example.iq', '{"full_name":"Admin A"}');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-0000000079a2', 'admin');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-variants', 'Plus', 25000, 'month', 'plus', 2, 3);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000079a1', 'plus-variants', 'active', 'wayl', now(), now() + interval '30 days');

-- ── A product gets its default variant ─────────────────────────────────────

insert into public.products (id, slug, name_ar, name_en, price, compare_at_price, stock_count, status) values
  ('79000000-0000-0000-0000-000000000001', 'variants-album', 'ألبوم', 'Album', 30000, 35000, 2, 'active');

select results_eq(
  $$ select price, compare_at_price, stock_count, label_en from public.product_variants
     where product_id = '79000000-0000-0000-0000-000000000001' $$,
  $$ values (30000::bigint, 35000::bigint, 2, null::text) $$,
  'a product inserted on its own gets a default variant with its price and stock'
);

update public.products set price = 32000, stock_count = 3 where id = '79000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select price, stock_count from public.product_variants
     where product_id = '79000000-0000-0000-0000-000000000001' $$,
  $$ values (32000::bigint, 3) $$,
  'with one variant, the product''s price and stock are the variant''s'
);

-- ── Several variants ───────────────────────────────────────────────────────

update public.product_variants set label_en = 'CD', label_ar = 'قرص CD', attributes = '{"Format":"CD"}', sku = 'ALBUM-CD'
where product_id = '79000000-0000-0000-0000-000000000001';
insert into public.product_variants (id, product_id, label_en, label_ar, attributes, price, sku, barcode, stock_count, rental_stock, position) values
  ('79100000-0000-0000-0000-000000000002', '79000000-0000-0000-0000-000000000001',
   'Vinyl', 'أسطوانة فينيل', '{"Format":"Vinyl"}', 70000, 'ALBUM-LP', '0602527000000', 2, 1, 1);

select results_eq(
  $$ select price, stock_count, rental_stock from public.products where id = '79000000-0000-0000-0000-000000000001' $$,
  $$ values (32000::bigint, 5, 1) $$,
  'the product shows the cheapest variant''s price and every variant''s stock'
);

update public.product_variants set price = 25000 where id = '79100000-0000-0000-0000-000000000002';
select is(
  (select price from public.products where id = '79000000-0000-0000-0000-000000000001'), 25000::bigint,
  'a cheaper variant lowers the "from" price'
);

update public.product_variants set active = false where id = '79100000-0000-0000-0000-000000000002';
select results_eq(
  $$ select price, stock_count from public.products where id = '79000000-0000-0000-0000-000000000001' $$,
  $$ values (32000::bigint, 3) $$,
  'a hidden variant leaves the price and stock'
);
select is(
  (select count(*)::integer from public.product_offers('79000000-0000-0000-0000-000000000001')
   where variant_id = '79100000-0000-0000-0000-000000000002'),
  0, 'a hidden variant isn''t offered'
);
update public.product_variants set active = true, price = 70000 where id = '79100000-0000-0000-0000-000000000002';

select throws_ok(
  $$ update public.products set price = 1 where id = '79000000-0000-0000-0000-000000000001' $$,
  '23514', 'This product has variants: set its price and stock on each variant',
  'with several variants, price is set per variant'
);
select throws_ok(
  $$ update public.products set stock_count = 9 where id = '79000000-0000-0000-0000-000000000001' $$,
  '23514', 'This product has variants: set its price and stock on each variant',
  'with several variants, stock is set per variant'
);

select results_eq(
  $$ select variant_id::text, condition::text, purpose::text, available, price
     from public.product_offers('79000000-0000-0000-0000-000000000001') order by purpose desc, price $$,
  $$ values
     ((select id::text from public.product_variants where sku = 'ALBUM-CD'), 'new', 'sale', 3, 32000::bigint),
     ('79100000-0000-0000-0000-000000000002', 'new', 'sale', 2, 70000::bigint),
     ('79100000-0000-0000-0000-000000000002', 'new', 'rental', 1, null::bigint) $$,
  'offers list each variant''s copies for sale and for rent'
);

-- Used copies of the vinyl priced on their own.
insert into public.stock_items (product_id, variant_id, condition, price) values
  ('79000000-0000-0000-0000-000000000001', '79100000-0000-0000-0000-000000000002', 'used', 45000);
select is(
  (select stock_count from public.product_variants where id = '79100000-0000-0000-0000-000000000002'), 3,
  'the variant counts its used copies too'
);
select throws_ok(
  $$ insert into public.stock_items (product_id, condition) values ('79000000-0000-0000-0000-000000000001', 'new') $$,
  '23514', 'Choose a variant', 'a copy of a product with several variants names its variant'
);
select throws_ok(
  $$ insert into public.stock_items (product_id, variant_id) values
     ((select id from public.products where slug <> 'variants-album' limit 1), '79100000-0000-0000-0000-000000000002') $$,
  '23503', null, 'a copy''s variant must be its product''s'
);

-- ── At least one variant ───────────────────────────────────────────────────

select throws_ok(
  $$ delete from public.product_variants where product_id = '79000000-0000-0000-0000-000000000001' $$,
  '23514', 'A product needs at least one variant', 'the last variant can''t be deleted'
);
select lives_ok(
  $$ delete from public.product_variants where id = '79100000-0000-0000-0000-000000000002' $$,
  'a variant can be deleted while another remains'
);
insert into public.product_variants (id, product_id, label_en, label_ar, attributes, price, sku, barcode, stock_count, rental_stock, position) values
  ('79100000-0000-0000-0000-000000000002', '79000000-0000-0000-0000-000000000001',
   'Vinyl', 'أسطوانة فينيل', '{"Format":"Vinyl"}', 70000, 'ALBUM-LP', '0602527000000', 2, 1, 1);

-- ── Search ─────────────────────────────────────────────────────────────────

select is(
  (select count(*)::integer from public.search_products('vinyl') where id = '79000000-0000-0000-0000-000000000001'),
  1, 'search finds a product by a variant''s label'
);
select is(
  (select count(*)::integer from public.search_products('0602527000000') where id = '79000000-0000-0000-0000-000000000001'),
  1, 'search finds a product by a variant''s barcode'
);

-- ── Cart, order and rental per variant ─────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000079a1');
select throws_ok(
  $$ insert into public.cart_items (product_id, quantity) values ('79000000-0000-0000-0000-000000000001', 1) $$,
  '23514', 'Choose a variant', 'adding a product with several variants to the cart needs one chosen'
);
insert into public.cart_items (product_id, variant_id, quantity, condition)
values ('79000000-0000-0000-0000-000000000001', '79100000-0000-0000-0000-000000000002', 1, 'new');
select lives_ok(
  $$ select public.create_order('{"full_name":"M","phone":"+9647700000101","address":"Karrada"}', 'pickup', 'cash_on_delivery') $$,
  'an order takes the chosen variant'
);
select results_eq(
  $$ select unit_price, attributes from public.order_items i join public.orders o on o.id = i.order_id
     where o.user_id = '00000000-0000-0000-0000-0000000079a1' $$,
  $$ values (70000::bigint, '{"Format":"Vinyl"}'::jsonb) $$,
  'the order line is priced and labelled from the variant'
);

select results_eq(
  $$ select variant_id from public.request_rental('79000000-0000-0000-0000-000000000001') $$,
  $$ values ('79100000-0000-0000-0000-000000000002'::uuid) $$,
  'a rental takes a copy of a variant with one for rent'
);
select pg_temp.reset_role();
select is(
  (select rental_stock from public.product_variants where id = '79100000-0000-0000-0000-000000000002'), 0,
  'the rented copy leaves the variant''s rental stock'
);

-- ── Import with variants ───────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000079a2', 'aal2');
select public.import_products($$[
  {"slug": "variants-imported", "name_ar": "مستورد", "name_en": "Imported", "status": "active",
   "variants": [
     {"label_en": "CD", "label_ar": "قرص CD", "attributes": {"Format": "CD"}, "price": 20000, "stock_count": 1},
     {"label_en": "Vinyl", "label_ar": "أسطوانة فينيل", "attributes": {"Format": "Vinyl"}, "price": 60000, "stock_count": 2}
   ]}
]$$::jsonb);
select public.import_products($$[
  {"slug": "variants-imported", "variants": [{"label_en": "Vinyl", "price": 55000}]}
]$$::jsonb);
select results_eq(
  $$ select v.label_en, v.price, v.stock_count from public.product_variants v
     join public.products p on p.id = v.product_id where p.slug = 'variants-imported' order by v.position $$,
  $$ values ('CD'::text, 20000::bigint, 1), ('Vinyl'::text, 55000::bigint, 2) $$,
  'the import creates variants, then updates them by label'
);
select pg_temp.reset_role();

select * from finish();
rollback;
