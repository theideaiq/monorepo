-- Prices: shop sales and quantity deals.
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

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000d01', 'o9s@example.iq'),
  ('00000000-0000-0000-0000-000000000d02', 'b9s@example.iq'),
  ('00000000-0000-0000-0000-000000000d03', 'x9s@example.iq'),
  ('00000000-0000-0000-0000-000000000d05', 'e9s@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000d05', 'editor');
insert into public.organizations (id, name, slug, created_by) values
  ('9d500000-0000-0000-0000-0000000000c1', 'Game Shop', 'games-9s', '00000000-0000-0000-0000-000000000d01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9d500000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000d01', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9d500000-0000-0000-0000-0000000000d1', '9d500000-0000-0000-0000-0000000000c1', 'Game Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9d500000-0000-0000-0000-000000000001', 'game-9s', 'لعبة', 'Game', 24750, 'active', 'sale', 'new'),
  ('9d500000-0000-0000-0000-000000000002', 'house-9s', 'بيت', 'House game', 24750, 'active', 'sale', 'new');
create temporary table ids (name text primary key, id uuid);
grant select on ids to authenticated, anon;
insert into ids select 'v', id from public.product_variants where product_id = '9d500000-0000-0000-0000-000000000001';
insert into ids select 'house', id from public.product_variants where product_id = '9d500000-0000-0000-0000-000000000002';
-- Three copies at the shop at 20,000; one house copy that cost 20,000.
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9d500000-0000-0000-0000-000000000001', 'new', 'sale', 20000, '9d500000-0000-0000-0000-0000000000d1'
from generate_series(1, 3);
insert into public.stock_items (product_id, condition, purpose, price, cost) values
  ('9d500000-0000-0000-0000-000000000002', 'new', 'sale', 24750, 20000);
insert into public.offer_settings (seller_id, variant_id, condition, accept_offers)
select '9d500000-0000-0000-0000-0000000000d1', id, 'new', true from ids where name = 'v';
update public.store_settings set cash_on_delivery_enabled = true;
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── Sales ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d03');
select throws_ok(
  $$ select public.set_listing_sale('9d500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new',
       15000, now(), now() + interval '7 days') $$,
  '42501', null, 'only the shop sets its sales'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d01');
select throws_ok(
  $$ select public.set_listing_sale('9d500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new',
       20000, now(), now() + interval '7 days') $$,
  '23514', null, 'a sale price is below the price'
);
select lives_ok(
  $$ select public.set_listing_sale('9d500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new',
       15000, now() - interval '1 minute', now() + interval '7 days') $$,
  'the shop puts a listing on sale'
);
select throws_ok(
  $$ select public.set_listing_sale('9d500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new',
       14000, now() + interval '3 days', now() + interval '10 days') $$,
  '23505', null, 'sales of one listing never overlap'
);
select is(
  (select count(*)::integer from public.listing_sales),
  1,
  'the shop sees its sale'
);

select pg_temp.login_anon();
select results_eq(
  $$ select price, sale_ends_at is not null from public.product_offers('9d500000-0000-0000-0000-000000000001') $$,
  $$ values (15000::bigint, true) $$,
  'customers see the sale price and when it ends'
);
select is_empty(
  $$ select 1 from public.offerable_listings('9d500000-0000-0000-0000-000000000001') $$,
  'a listing on sale takes no offers'
);
select is_empty($$ select 1 from public.listing_sales $$, 'only the seller sees its sale rows');

-- ── Quantity deals ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d01');
select lives_ok(
  $$ select public.set_quantity_deal('9d500000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 2, 10) $$,
  'the shop sets 10% off from 2'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000d02');
insert into public.cart_items (product_id, variant_id, quantity, condition, seller_id)
select '9d500000-0000-0000-0000-000000000001', id, 2, 'new', '9d500000-0000-0000-0000-0000000000d1' from ids where name = 'v';
select pg_temp.reset_role();
select results_eq(
  $$ select (l ->> 'unit_price')::bigint, (l ->> 'deal_rate')::integer
     from jsonb_array_elements(private.price_checkout('00000000-0000-0000-0000-000000000d02', 'baghdad', 'delivery',
       'cash_on_delivery', null, 0) -> 'lines') l $$,
  $$ values (13500::bigint, 10) $$,
  'checkout charges the sale price less the deal'
);

-- Ending the sale brings the price back.
select pg_temp.login_as('00000000-0000-0000-0000-000000000d01');
select public.end_listing_sale((select id from public.listing_sales limit 1));
select pg_temp.reset_role();
select is(
  (select price from public.product_offers('9d500000-0000-0000-0000-000000000001')),
  20000::bigint,
  'an ended sale gives the price back'
);
select results_eq(
  $$ select price, ended_at is null from public.price_history h join ids on ids.id = h.variant_id and ids.name = 'v'
     order by price, ended_at nulls last $$,
  $$ values (15000::bigint, false), (20000::bigint, false), (20000::bigint, true) $$,
  'price history follows the sale'
);

-- ── The IDEA's own ──
select pg_temp.login_as('00000000-0000-0000-0000-000000000d05', 'aal2');
select throws_ok(
  $$ select public.set_listing_sale('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new',
       20750, now(), now() + interval '7 days') $$,
  '23514', null, 'The IDEA''s sales stay above the margin floor'
);
select throws_ok(
  $$ select public.set_quantity_deal('00000000-0000-4000-8000-000000000001', (select id from ids where name = 'house'), 'new', 2, 50) $$,
  '23514', null, 'and so do its deals'
);

select * from finish();
rollback;
