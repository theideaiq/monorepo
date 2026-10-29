-- Selling: commission rates, the Free and Pro plans and each line's commission.
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
  ('00000000-0000-0000-0000-000000000b01', 'o9j@example.iq'),
  ('00000000-0000-0000-0000-000000000b02', 'm9j@example.iq'),
  ('00000000-0000-0000-0000-000000000b03', 'f9j@example.iq'),
  ('00000000-0000-0000-0000-000000000b04', 'c9j@example.iq');
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000b03', 'finance');
insert into public.organizations (id, name, slug, created_by) values
  ('9f000000-0000-0000-0000-0000000000c1', 'Game Shop', 'games-9j', '00000000-0000-0000-0000-000000000b01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9f000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000b01', 'owner'),
  ('9f000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000b02', 'member');
insert into public.sellers (id, organization_id, name, status) values
  ('9f000000-0000-0000-0000-0000000000d1', '9f000000-0000-0000-0000-0000000000c1', 'Game Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9f000000-0000-0000-0000-000000000001', 'zelda-9j', 'زيلدا', 'Zelda', 59750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'games'));

-- ── Rates ──
select results_eq(
  $$ select c.slug, r.standard_rate, r.pro_rate from public.commission_rates r
     join public.product_categories c on c.id = r.category_id order by c.slug $$,
  $$ values ('board-games'::text, 0.10::numeric, 0.08::numeric), ('books', 0.12, 0.10),
       ('comics-manga', 0.12, 0.10), ('films', 0.12, 0.10), ('games', 0.10, 0.08),
       ('gear', 0.09, 0.07), ('music', 0.12, 0.10), ('textbooks', 0.12, 0.10),
       ('trading-cards', 0.12, 0.10) $$,
  'the brief''s rates, standard and Pro'
);
select pg_temp.login_anon();
select is((select count(*)::integer from public.commission_rates), 9, 'anyone sees the rates');

select pg_temp.login_as('00000000-0000-0000-0000-000000000b01');
select is_empty(
  $$ update public.commission_rates set standard_rate = 0.01 returning 1 $$,
  'a shop can''t change them'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000b03', 'aal2');
select results_eq(
  $$ update public.commission_rates set standard_rate = 0.11
     where category_id = (select id from public.product_categories where slug = 'games') returning standard_rate $$,
  $$ values (0.11::numeric) $$,
  'finance staff change them'
);
select throws_ok(
  $$ update public.commission_rates set pro_rate = 0.2
     where category_id = (select id from public.product_categories where slug = 'games') $$,
  '23514', null, 'Pro is never above standard'
);
select pg_temp.reset_role();
update public.commission_rates set standard_rate = 0.10
where category_id = (select id from public.product_categories where slug = 'games');

-- ── Plans ──
select is((select plan::text from public.sellers where id = '9f000000-0000-0000-0000-0000000000d1'), 'free',
  'shops start on Free');
select pg_temp.login_as('00000000-0000-0000-0000-000000000b02');
select throws_ok(
  $$ select public.set_seller_plan('9f000000-0000-0000-0000-0000000000d1', 'pro', 'monthly') $$,
  '42501', null, 'a member can''t change the plan'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000b01');
select throws_ok(
  $$ select public.set_seller_plan('9f000000-0000-0000-0000-0000000000d1', 'pro') $$,
  '23514', null, 'Pro needs monthly or yearly'
);
select is(public.seller_plan_price('yearly'), 497500::bigint, 'Pro is 497,500 IQD a year');

-- Free allows 100 active listings.
select pg_temp.reset_role();
insert into public.products (slug, name_ar, name_en, price, status, kind, condition, category_id)
select 'filler-9j-' || n, 'لعبة', 'Game ' || n, 9750, 'active', 'sale', 'new',
  (select id from public.product_categories where slug = 'games')
from generate_series(1, 100) n;
insert into public.seller_offers (seller_id, variant_id, condition, price)
select '9f000000-0000-0000-0000-0000000000d1', v.id, 'new', 9750
from public.product_variants v join public.products p on p.id = v.product_id
where p.slug like 'filler-9j-%';
select throws_ok(
  $$ insert into public.seller_offers (seller_id, variant_id, condition, price)
     select '9f000000-0000-0000-0000-0000000000d1', v.id, 'new', 59750
     from public.product_variants v where v.product_id = '9f000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'a Free shop can''t pass 100 active listings'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000b01');
select is((public.set_seller_plan('9f000000-0000-0000-0000-0000000000d1', 'pro', 'monthly')).plan_billing, 'monthly',
  'the owner moves to Pro, monthly');
select pg_temp.reset_role();
insert into public.seller_offers (seller_id, variant_id, condition, price)
select '9f000000-0000-0000-0000-0000000000d1', v.id, 'new', 59750
from public.product_variants v where v.product_id = '9f000000-0000-0000-0000-000000000001';
select pg_temp.login_as('00000000-0000-0000-0000-000000000b01');
select throws_ok(
  $$ select public.set_seller_plan('9f000000-0000-0000-0000-0000000000d1', 'free') $$,
  '23514', null, 'back to Free only with 100 or fewer active listings'
);

-- ── Commission on order lines ──
select pg_temp.reset_role();
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, max_bulbs, shipping_address, fulfilment, payment_method)
values ('9f000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000b04', 'pending', 179250, 0, 179250, 0,
  '{"full_name":"Ali","phone":"+9647701234567","address":"Street 1","city":"Karrada","governorate":"baghdad"}',
  'delivery', 'cash_on_delivery');
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
select '9f000000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'زيلدا', 'Zelda', 59750, 3,
  '9f000000-0000-0000-0000-0000000000d1', 'Game Shop'
from public.product_variants v where v.product_id = '9f000000-0000-0000-0000-000000000001';
select results_eq(
  $$ select commission_rate, commission, seller_payout from public.order_items
     where order_id = '9f000000-0000-0000-0000-0000000000e1' $$,
  $$ values (0.08::numeric, 14340::bigint, 164910::bigint) $$,
  'a Pro shop''s line keeps 8% for Games, and the payout after it'
);
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity)
select '9f000000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'زيلدا', 'Zelda', 59750, 1
from public.product_variants v where v.product_id = '9f000000-0000-0000-0000-000000000001';
select is(
  (select commission from public.order_items
   where order_id = '9f000000-0000-0000-0000-0000000000e1' and seller_id = '00000000-0000-4000-8000-000000000001'),
  null, 'The IDEA''s own stock pays no commission'
);

select * from finish();
rollback;
