-- Prices: student prices.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f01', 'o9v@example.iq'),
  ('00000000-0000-0000-0000-000000000f02', 's9v@example.iq'),
  ('00000000-0000-0000-0000-000000000f03', 'x9v@example.iq'),
  ('00000000-0000-0000-0000-000000000f05', 'e9v@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000f05', 'editor');
insert into public.universities (id, name_en, name_ar, domains)
values ('uni-9v', 'University 9v', 'جامعة', '{uni9v.edu.iq}')
on conflict (id) do nothing;
insert into public.student_badges (user_id, university_id, valid_until, method)
values ('00000000-0000-0000-0000-000000000f02', 'uni-9v', current_date + 100, 'email');
insert into public.organizations (id, name, slug, created_by) values
  ('9f500000-0000-0000-0000-0000000000c1', 'Book Shop', 'books-9v', '00000000-0000-0000-0000-000000000f01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9f500000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000f01', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9f500000-0000-0000-0000-0000000000d1', '9f500000-0000-0000-0000-0000000000c1', 'Book Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9f500000-0000-0000-0000-000000000001', 'book-9v', 'كتاب', 'Book', 24750, 'active', 'sale', 'new'),
  ('9f500000-0000-0000-0000-000000000002', 'house-9v', 'بيت', 'House book', 24750, 'active', 'sale', 'new');
create temporary table ids (name text primary key, id uuid);
grant select on ids to authenticated, anon;
insert into ids select 'v', id from public.product_variants where product_id = '9f500000-0000-0000-0000-000000000001';
insert into ids select 'house', id from public.product_variants where product_id = '9f500000-0000-0000-0000-000000000002';
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9f500000-0000-0000-0000-000000000001', 'new', 'sale', 20000, '9f500000-0000-0000-0000-0000000000d1'
from generate_series(1, 2);
insert into public.stock_items (product_id, condition, purpose, price, cost) values
  ('9f500000-0000-0000-0000-000000000002', 'new', 'sale', 24750, 20000);
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

select pg_temp.login_as('00000000-0000-0000-0000-000000000f03');
select throws_ok(
  $$ select public.set_student_price('9f500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 15000) $$,
  '42501', null, 'only the shop sets its student prices'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000f01');
select throws_ok(
  $$ select public.set_student_price('9f500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 20000) $$,
  '23514', null, 'a student price is below the price'
);
select lives_ok(
  $$ select public.set_student_price('9f500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 15000) $$,
  'the shop sets a student price'
);
select lives_ok(
  $$ select public.set_student_price('9f500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 16000) $$,
  'and changes it'
);

select pg_temp.login_anon();
select results_eq(
  $$ select price, student_price from public.product_offers('9f500000-0000-0000-0000-000000000001') $$,
  $$ values (20000::bigint, null::bigint) $$,
  'visitors never see the student price'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000f03');
select is(
  (select student_price from public.product_offers('9f500000-0000-0000-0000-000000000001')),
  null::bigint,
  'nor do members who are not students'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000f02');
select is(
  (select student_price from public.product_offers('9f500000-0000-0000-0000-000000000001')),
  16000::bigint,
  'verified students see it'
);
insert into public.cart_items (product_id, variant_id, quantity, condition, seller_id)
select '9f500000-0000-0000-0000-000000000001', id, 1, 'new', '9f500000-0000-0000-0000-0000000000d1' from ids where name = 'v';
select pg_temp.reset_role();
select results_eq(
  $$ select (l ->> 'unit_price')::bigint, (l ->> 'student_price')::boolean
     from jsonb_array_elements(private.price_checkout('00000000-0000-0000-0000-000000000f02', 'baghdad', 'delivery',
       'cash_on_delivery', null, 0) -> 'lines') l $$,
  $$ values (16000::bigint, true) $$,
  'checkout charges students the student price'
);
-- Not a public price: it never enters price history.
select is_empty(
  $$ select 1 from public.price_history h join ids on ids.id = h.variant_id and ids.name = 'v' where h.price = 16000 $$,
  'the student price stays out of price history'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000f05', 'aal2');
select throws_ok(
  $$ select public.set_student_price('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new', 20750) $$,
  '23514', null, 'The IDEA''s student prices stay above the margin floor'
);

select * from finish();
rollback;
