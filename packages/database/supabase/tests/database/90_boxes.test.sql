-- Program revision v1, step 5d: boxes (stock from parts, price check, themes, checkout, packing).
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

-- A is a customer, S is support.
truncate public.products, public.orders cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000901', 'buyer@example.iq', '{"full_name":"Buyer A"}'),
  ('00000000-0000-0000-0000-000000000902', 'support@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-000000000903', 'admin@example.iq', '{"full_name":"Admin A"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000902', 'support'),
  ('00000000-0000-0000-0000-000000000903', 'admin');
update public.store_settings set cash_on_delivery_enabled = true, cash_limit = null;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

-- Parts: a turntable, a cleaning kit, four vinyl records and a CD.
insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, category_id) values
  ('90000000-0000-0000-0000-000000000001', 'box-turntable', 'مشغل', 'Turntable', 200000, 2, 'active',
    (select id from public.product_categories where slug = 'audio')),
  ('90000000-0000-0000-0000-000000000002', 'box-kit', 'طقم', 'Kit', 20000, 5, 'active',
    (select id from public.product_categories where slug = 'audio')),
  ('90000000-0000-0000-0000-000000000011', 'box-record-1', 'أسطوانة ١', 'Record 1', 40000, 1, 'active',
    (select id from public.product_categories where slug = 'music')),
  ('90000000-0000-0000-0000-000000000012', 'box-record-2', 'أسطوانة ٢', 'Record 2', 40000, 1, 'active',
    (select id from public.product_categories where slug = 'music')),
  ('90000000-0000-0000-0000-000000000013', 'box-record-3', 'أسطوانة ٣', 'Record 3', 40000, 1, 'active',
    (select id from public.product_categories where slug = 'music')),
  ('90000000-0000-0000-0000-000000000014', 'box-record-4', 'أسطوانة ٤', 'Record 4', 40000, 1, 'active',
    (select id from public.product_categories where slug = 'music')),
  ('90000000-0000-0000-0000-000000000015', 'box-cd', 'قرص', 'CD', 30000, 3, 'active',
    (select id from public.product_categories where slug = 'music'));
update public.product_variants set attributes = '{"Format": "Vinyl"}'
where product_id::text like '90000000-0000-0000-0000-00000000001_' and product_id <> '90000000-0000-0000-0000-000000000015';
update public.product_variants set attributes = '{"Format": "CD"}'
where product_id = '90000000-0000-0000-0000-000000000015';

-- The box: turntable + kit + 3 records worth at least 120,000 (340,000 in
-- all, so 289,000–306,000).
insert into public.products (id, slug, name_ar, name_en, price, status, category_id) values
  ('90000000-0000-0000-0000-000000000099', 'test-box', 'صندوق', 'Test box', 200000, 'draft',
    (select id from public.product_categories where slug = 'music'));
insert into public.boxes (product_id, min_value) values ('90000000-0000-0000-0000-000000000099', 120000);
insert into public.box_parts (box_id, product_id, variant_id, quantity)
select '90000000-0000-0000-0000-000000000099', v.product_id, v.id, 1
from public.product_variants v
where v.product_id in ('90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002');
insert into public.box_parts (box_id, category_id, format, quantity) values
  ('90000000-0000-0000-0000-000000000099', (select id from public.product_categories where slug = 'music'), 'Vinyl', 3);
insert into public.box_themes (id, box_id, name_ar, name_en, active, position) values
  ('90000000-0000-0000-0000-0000000000a1', '90000000-0000-0000-0000-000000000099', 'روك', 'Rock', true, 1),
  ('90000000-0000-0000-0000-0000000000a2', '90000000-0000-0000-0000-000000000099', 'جاز', 'Jazz', true, 2),
  ('90000000-0000-0000-0000-0000000000a3', '90000000-0000-0000-0000-000000000099', 'قديم', 'Old', false, 3);

-- ── Stock and price ──
select is(private.box_stock('90000000-0000-0000-0000-000000000099'), 1, 'four records make one box');
select is(
  (select stock_count from public.products where id = '90000000-0000-0000-0000-000000000099'), 1,
  'the box''s stock count comes from its parts'
);
select is(private.box_value('90000000-0000-0000-0000-000000000099'), 340000::bigint, 'the parts are worth 340,000');

select throws_ok(
  $$ update public.products set status = 'active' where id = '90000000-0000-0000-0000-000000000099' $$,
  '23514', 'A box costs 10–15% less than its parts',
  'a box priced off the parts can''t go live'
);
update public.products set price = 299750 where id = '90000000-0000-0000-0000-000000000099';
select lives_ok(
  $$ update public.products set status = 'active' where id = '90000000-0000-0000-0000-000000000099' $$,
  'priced 10–15% below its parts, it goes live'
);

update public.products set stock_count = 3 where id = '90000000-0000-0000-0000-000000000011';
select is(
  (select stock_count from public.product_variants where product_id = '90000000-0000-0000-0000-000000000099'), 2,
  'more records, more boxes'
);

select throws_ok(
  $$ insert into public.stock_items (product_id) values ('90000000-0000-0000-0000-000000000099') $$,
  '23514', 'A box''s stock comes from its parts',
  'a box has no copies of its own'
);

-- ── Reading and editing ──
select pg_temp.login_anon();
select is((select count(*)::integer from public.box_themes where box_id = '90000000-0000-0000-0000-000000000099'), 3,
  'anyone sees the box''s themes');
select pg_temp.login_as('00000000-0000-0000-0000-000000000901');
select throws_ok(
  $$ insert into public.box_themes (box_id, name_ar, name_en) values ('90000000-0000-0000-0000-000000000099', 'x', 'x') $$,
  '42501', null, 'customers don''t edit boxes'
);

-- ── Checkout ──
select throws_ok(
  $$ insert into public.cart_items (product_id, quantity, box_theme_id)
     values ('90000000-0000-0000-0000-000000000099', 1, '90000000-0000-0000-0000-0000000000a3') $$,
  '23514', 'Pick one of the box''s themes',
  'a switched-off theme can''t be picked'
);

insert into public.cart_items (product_id, quantity) values ('90000000-0000-0000-0000-000000000099', 3);
select throws_ok(
  $$ select public.create_order('{"full_name":"A","phone":"+9647700000901","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery') $$,
  '23514', 'Not enough stock',
  'no more boxes than the parts make'
);

update public.cart_items set quantity = 1 where user_id = '00000000-0000-0000-0000-000000000901';
select throws_ok(
  $$ select public.create_order('{"full_name":"A","phone":"+9647700000901","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery') $$,
  '23514', 'Pick a theme for the box',
  'a box with themes needs one picked'
);

update public.cart_items set box_theme_id = '90000000-0000-0000-0000-0000000000a1'
where user_id = '00000000-0000-0000-0000-000000000901';
select lives_ok(
  $$ select public.create_order('{"full_name":"A","phone":"+9647700000901","governorate":"baghdad","address":"Karrada"}',
       'delivery', 'cash_on_delivery') $$,
  'the box is ordered with its theme'
);
select pg_temp.reset_role();

select is(
  (select box_theme_id from public.order_items where product_id = '90000000-0000-0000-0000-000000000099'),
  '90000000-0000-0000-0000-0000000000a1'::uuid,
  'the order line keeps the theme'
);
select is(
  (select array_agg(s.product_id order by s.product_id) from public.stock_items s
   join public.order_items i on i.id = s.order_item_id
   where i.product_id = '90000000-0000-0000-0000-000000000099' and s.status = 'sold'),
  array['90000000-0000-0000-0000-000000000001', '90000000-0000-0000-0000-000000000002']::uuid[],
  'a confirmed order takes the fixed parts'' copies'
);
select is(
  (select stock_count from public.products where id = '90000000-0000-0000-0000-000000000099'), 1,
  'one turntable left, one box left'
);

-- ── Packing ──
-- One cheap record copy (20,000), so three picks can fall short.
update public.stock_items set price = 20000
where product_id = '90000000-0000-0000-0000-000000000012';

create temporary table box_item as
  select id from public.order_items where product_id = '90000000-0000-0000-0000-000000000099';
create temporary table copy_of as
  select id, product_id from public.stock_items where product_id::text like '90000000-0000-0000-0000-0000000000__';
grant select on box_item, copy_of to authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-000000000901');
select throws_ok(
  $$ select public.pack_box((select id from box_item),
       array(select id from copy_of where product_id = '90000000-0000-0000-0000-000000000011')) $$,
  '42501', 'Not allowed',
  'customers don''t pack boxes'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000902', 'aal2');
select throws_ok(
  $$ select public.pack_box((select id from box_item),
       array(select stock_item from public.box_slot_copies(
         (select id from public.box_parts where format = 'Vinyl')) limit 2)) $$,
  '23514', 'Pick 3 copies for the box',
  'the slots are filled in full'
);
select throws_ok(
  $$ select public.pack_box((select id from box_item),
       array(select id from copy_of where product_id in (
         '90000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000015') limit 3 offset 2)) $$,
  '23514', 'A picked copy doesn''t fit the box',
  'a CD doesn''t fill a vinyl slot'
);
select throws_ok(
  $$ select public.pack_box((select id from box_item),
       array(select id from copy_of where product_id in (
         '90000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000012')
         order by product_id limit 3 offset 1)) $$,
  '23514', 'The picked copies are worth less than the box promises',
  'the picks are worth the stated value'
);
select lives_ok(
  $$ select public.pack_box((select id from box_item),
       array(select id from copy_of where product_id = '90000000-0000-0000-0000-000000000011')) $$,
  'staff pack the box from three records'
);
select throws_ok(
  $$ select public.pack_box((select id from box_item),
       array(select id from copy_of where product_id = '90000000-0000-0000-0000-000000000013')) $$,
  '23514', 'The box is already packed',
  'a box is packed once'
);
select pg_temp.reset_role();

select is(
  (select count(*)::integer from public.stock_items s
   where s.order_item_id = (select id from box_item) and s.status = 'sold'),
  5,
  'the packed box holds its five copies'
);

-- ── Winding down (program revision v2) ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000903', 'aal2');
select throws_ok(
  $$ insert into public.boxes (product_id, min_value)
     values ('90000000-0000-0000-0000-000000000001', 100000) $$,
  '42501', null,
  'no new boxes are made, even by admins'
);
select pg_temp.reset_role();
update public.products set stock_count = 0
where id in ('90000000-0000-0000-0000-000000000011', '90000000-0000-0000-0000-000000000012',
  '90000000-0000-0000-0000-000000000013', '90000000-0000-0000-0000-000000000014');
select is(
  (select status::text from public.products where id = '90000000-0000-0000-0000-000000000099'),
  'archived', 'a box leaves the store once its parts sell out'
);

select * from finish();
rollback;
