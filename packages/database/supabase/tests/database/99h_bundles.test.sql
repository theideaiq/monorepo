-- Bundles: a shop lists several of its own items as one offer.
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

-- O owns Shop (M a plain member), X owns a pending shop.
truncate public.products, public.orders cascade;
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000af1', 'o9h@example.iq'),
  ('00000000-0000-0000-0000-000000000af2', 'm9h@example.iq'),
  ('00000000-0000-0000-0000-000000000af3', 'x9h@example.iq');
insert into public.organizations (id, name, slug, created_by) values
  ('9f000000-0000-0000-0000-0000000000c1', 'Record Shop', 'records-9h', '00000000-0000-0000-0000-000000000af1'),
  ('9f000000-0000-0000-0000-0000000000c2', 'Other Shop', 'other-9h', '00000000-0000-0000-0000-000000000af3');
insert into public.memberships (organization_id, user_id, role) values
  ('9f000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000af1', 'owner'),
  ('9f000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000af2', 'member'),
  ('9f000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000af3', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9f000000-0000-0000-0000-0000000000d1', '9f000000-0000-0000-0000-0000000000c1', 'Record Shop', 'approved'),
  ('9f000000-0000-0000-0000-0000000000d2', '9f000000-0000-0000-0000-0000000000c2', 'Other Shop', 'pending');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9f000000-0000-0000-0000-000000000001', 'turntable-9h', 'مشغل أسطوانات', 'Turntable', 199750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'gear')),
  ('9f000000-0000-0000-0000-000000000002', 'record-9h', 'أسطوانة', 'Record', 29750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music')),
  ('9f000000-0000-0000-0000-000000000003', 'other-9h', 'أخرى', 'Not offered', 9750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));

create temporary table v9h as
select
  (select id from public.product_variants where product_id = '9f000000-0000-0000-0000-000000000001') as turntable,
  (select id from public.product_variants where product_id = '9f000000-0000-0000-0000-000000000002') as record,
  (select id from public.product_variants where product_id = '9f000000-0000-0000-0000-000000000003') as other;
grant select on v9h to authenticated, anon;

select pg_temp.login_as('00000000-0000-0000-0000-000000000af1');
select public.set_offer('9f000000-0000-0000-0000-0000000000d1', (select turntable from v9h), 'used', 149750, 1);
select public.set_offer('9f000000-0000-0000-0000-0000000000d1', (select record from v9h), 'new', 24750, 5);

-- ── Creating ────────────────────────────────────────────────────────────────

select lives_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1',
       (select id from public.product_categories where slug = 'gear'),
       'Turntable and 3 records', 'مشغل و3 أسطوانات', '{bundle.jpg}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select turntable from v9h)),
         jsonb_build_object('variant_id', (select record from v9h), 'quantity', 3)
       ),
       'used', 199750, 2, 'BNDL-1') $$,
  'An owner bundles items the shop offers'
);

select pg_temp.reset_role();
select results_eq(
  $$ select v.product_id, b.quantity, b.position
     from public.bundle_items b join public.product_variants v on v.id = b.variant_id
     order by b.position $$,
  $$ values ('9f000000-0000-0000-0000-000000000001'::uuid, 1, 0),
            ('9f000000-0000-0000-0000-000000000002'::uuid, 3, 1) $$,
  'The bundle lists what it holds, in order'
);
select results_eq(
  $$ select p.status::text, p.created_by_seller, count(s.id)::int, min(s.price)
     from public.products p
     join public.stock_items s on s.product_id = p.id and s.status = 'available'
     where p.name_en = 'Turntable and 3 records'
     group by p.id $$,
  $$ values ('active', '9f000000-0000-0000-0000-0000000000d1'::uuid, 2, 199750::bigint) $$,
  'The bundle is live with its own offer: 2 copies at its price'
);
select is(
  (select o.sku from public.seller_offers o
   join public.product_variants v on v.id = o.variant_id
   join public.products p on p.id = v.product_id
   where p.name_en = 'Turntable and 3 records'),
  'BNDL-1', 'The bundle''s offer has the shop''s SKU'
);

select pg_temp.login_anon();
select is(
  (select count(*)::int from public.bundle_items), 2,
  'Visitors see what a live bundle holds'
);

-- ── Refused ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000af1');
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Bad', null, '{}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select turntable from v9h)),
         jsonb_build_object('variant_id', (select other from v9h))
       ), 'new', 9750, 1) $$,
  '23514', 'A bundle holds only items the shop offers', 'Only the shop''s own items'
);
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Bad', null, '{}',
       jsonb_build_array(jsonb_build_object('variant_id', (select record from v9h))),
       'new', 9750, 1) $$,
  '23514', 'A bundle holds at least 2 items', 'One item isn''t a bundle'
);
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Bad', null, '{}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select record from v9h)),
         jsonb_build_object('variant_id', (select record from v9h))
       ), 'new', 9750, 1) $$,
  '23514', 'Each item once, 1 to 20 of it', 'Each item is listed once, with its quantity'
);
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Bad', null, '{}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select v.id from public.product_variants v
           join public.products p on p.id = v.product_id where p.name_en = 'Turntable and 3 records')),
         jsonb_build_object('variant_id', (select record from v9h))
       ), 'new', 9750, 1) $$,
  '23514', null, 'A bundle can''t hold a bundle'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000af2');
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Mine', null, '{}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select turntable from v9h)),
         jsonb_build_object('variant_id', (select record from v9h))
       ), 'new', 9750, 1) $$,
  '42501', null, 'A plain member can''t list a bundle'
);
select throws_ok(
  $$ insert into public.bundle_items (bundle_id, variant_id)
     values ('9f000000-0000-0000-0000-000000000003', (select record from v9h)) $$,
  '42501', null, 'Nobody adds to a bundle directly'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000af3');
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d2', null, 'Pending', null, '{}',
       jsonb_build_array(
         jsonb_build_object('variant_id', (select turntable from v9h)),
         jsonb_build_object('variant_id', (select record from v9h))
       ), 'new', 9750, 1) $$,
  '42501', null, 'A shop that isn''t approved can''t list a bundle'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select public.create_bundle('9f000000-0000-0000-0000-0000000000d1', null, 'Anon', null, '{}',
       '[]'::jsonb, 'new', 9750, 1) $$,
  '42501', null, 'Visitors can''t list'
);

-- A paused or draft bundle hides its contents with it.
select pg_temp.reset_role();
update public.products set status = 'draft' where name_en = 'Turntable and 3 records';
select pg_temp.login_anon();
select is(
  (select count(*)::int from public.bundle_items), 0,
  'A bundle that isn''t live hides what it holds'
);

select * from finish();
rollback;
