-- The UX overhaul: Plus availability in words, Staff's Demand view, and
-- Family (kids' profiles, a teen's requests to their guardian).
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

select plan(12);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f1001', 'owner-trust@example.iq'),
  ('00000000-0000-0000-0000-0000000f1002', 'member-trust@example.iq'),
  ('00000000-0000-0000-0000-0000000f1003', 'other-trust@example.iq');
insert into public.organizations (id, name, slug, created_by) values
  ('9f200000-0000-0000-0000-0000000000c1', 'Crate Shop', 'crate-trust', '00000000-0000-0000-0000-0000000f1001');
insert into public.organization_members (organization_id, user_id, role) values
  ('9f200000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000f1001', 'owner'),
  ('9f200000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000f1002', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9f200000-0000-0000-0000-0000000000d1', '9f200000-0000-0000-0000-0000000000c1', 'Crate Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id, images) values
  ('9f200000-0000-0000-0000-000000000001', 'record-trust', 'أسطوانة', 'Record', 24750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'), '{https://example.iq/a.jpg}');
insert into public.seller_offers (id, seller_id, variant_id, condition, price) values
  ('9f200000-0000-0000-0000-0000000000e1', '9f200000-0000-0000-0000-0000000000d1',
   (select id from public.product_variants where product_id = '9f200000-0000-0000-0000-000000000001'), 'used', 19750),
  ('9f200000-0000-0000-0000-0000000000e2', '9f200000-0000-0000-0000-0000000000d1',
   (select id from public.product_variants where product_id = '9f200000-0000-0000-0000-000000000001'), 'new', 24750);

-- ── The lines behind a score ──
select is(
  (select score_lines from public.sellers where id = '9f200000-0000-0000-0000-0000000000d1'), 0,
  'a shop starts with no record'
);
select ok(public.refresh_seller_scores() >= 1, 'the nightly refresh still scores shops');
select is(
  (select score_lines from public.sellers where id = '9f200000-0000-0000-0000-0000000000d1'), 0,
  'a shop without orders stays at no record, so it shows as new'
);
select pg_temp.login_anon();
select is(
  (select score_lines from public.sellers where id = '9f200000-0000-0000-0000-0000000000d1'), 0,
  'visitors read the record next to the score'
);

-- ── Photos of a used copy ──
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1002');
select throws_ok(
  $$ select public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1',
       '{https://example.iq/1.jpg,https://example.iq/2.jpg,https://example.iq/3.jpg}') $$,
  '42501', null, 'a shop member who isn''t an owner or admin can''t'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1003');
select throws_ok(
  $$ select public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1',
       '{https://example.iq/1.jpg,https://example.iq/2.jpg,https://example.iq/3.jpg}') $$,
  '42501', null, 'nobody outside the shop can'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1001');
select throws_ok(
  $$ select public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1', '{https://example.iq/1.jpg}') $$,
  '23514', 'Add 3 to 10 photos of the copy', 'one photo isn''t enough'
);
select throws_ok(
  $$ select public.set_offer_photos('9f200000-0000-0000-0000-0000000000e2',
       '{https://example.iq/1.jpg,https://example.iq/2.jpg,https://example.iq/3.jpg}') $$,
  '23514', null, 'new listings use the product''s pictures'
);
select throws_ok(
  $$ select public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1',
       '{javascript:alert(1),https://example.iq/2.jpg,https://example.iq/3.jpg}') $$,
  '23514', 'Photos are uploaded images', 'only uploaded images'
);
select is(
  (public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1',
     '{https://example.iq/1.jpg,https://example.iq/2.jpg,https://example.iq/3.jpg}')).photos,
  '{https://example.iq/1.jpg,https://example.iq/2.jpg,https://example.iq/3.jpg}'::text[],
  'an owner sets three photos of the used copy'
);
select pg_temp.login_anon();
select results_eq(
  $$ select condition::text, cardinality(photos) from public.offer_photos('9f200000-0000-0000-0000-000000000001') $$,
  $$ values ('used', 3) $$,
  'visitors see the used copy''s photos on the product page'
);
select pg_temp.login_as('00000000-0000-0000-0000-0000000f1001');
select is(
  cardinality((public.set_offer_photos('9f200000-0000-0000-0000-0000000000e1', '{}')).photos), 0,
  'the shop can take them down again'
);

select * from finish();
