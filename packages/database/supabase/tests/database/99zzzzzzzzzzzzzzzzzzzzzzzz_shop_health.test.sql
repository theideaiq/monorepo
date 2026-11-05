-- PR 7, A24: shop health for the shop and staff.
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

select plan(6);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f7001', 'owner-health@example.iq'),
  ('00000000-0000-0000-0000-0000000f7002', 'buyer-health@example.iq'),
  ('00000000-0000-0000-0000-0000000f7003', 'staff-health@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000f7003', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('9f700000-0000-0000-0000-0000000000c1', 'Health Shop', 'health-shop', '00000000-0000-0000-0000-0000000f7001');
insert into public.organization_members (organization_id, user_id, role) values
  ('9f700000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000f7001', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9f700000-0000-0000-0000-0000000000d1', '9f700000-0000-0000-0000-0000000000c1', 'Health Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id, images) values
  ('9f700000-0000-0000-0000-000000000001', 'record-health', 'أسطوانة', 'Record', 24750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'), '{https://example.iq/a.jpg}');
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, paid_at)
values ('9f700000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000f7002', 'paid', 74250, 0, 74250,
  '{"city": "Baghdad"}', now());
insert into public.order_items (order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id, seller_name)
select '9f700000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'أسطوانة', 'Record', 24750, 1,
  '9f700000-0000-0000-0000-0000000000d1', 'Health Shop'
from public.product_variants v, generate_series(1, 3)
where v.product_id = '9f700000-0000-0000-0000-000000000001';
-- One line ready on time, one ready late, one canceled as out of stock.
with numbered as (
  select id, row_number() over (order by id) as n from public.order_items
  where order_id = '9f700000-0000-0000-0000-0000000000e1'
)
update public.order_items i set
  ready_by = now() - interval '2 days',
  ready_at = case n when 1 then now() - interval '3 days' when 2 then now() - interval '1 day' end,
  seller_status = case n when 3 then 'out_of_stock' else 'ready' end::public.seller_line_status
from numbered where numbered.id = i.id;
select public.refresh_seller_scores();

select pg_temp.login_as('00000000-0000-0000-0000-0000000f7001');
select results_eq(
  $$ select lines, late, out_of_stock, shop_returns, wrong_marks
     from public.shop_health('9f700000-0000-0000-0000-0000000000d1') $$,
  $$ values (3, 1, 1, 0, 0) $$,
  'the shop sees what its score is made of'
);
select is(
  (select score from public.shop_health('9f700000-0000-0000-0000-0000000000d1')),
  (select score from public.sellers where id = '9f700000-0000-0000-0000-0000000000d1'),
  'with the score buyers see'
);
select is(
  (select score from public.shop_health('9f700000-0000-0000-0000-0000000000d1')),
  0::numeric,
  'a late line counts once and a missing item twice'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f7002');
select is_empty(
  $$ select * from public.shop_health('9f700000-0000-0000-0000-0000000000d1') $$,
  'a buyer does not'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000f7003', 'aal2');
select is(
  (select lines from public.shop_health('9f700000-0000-0000-0000-0000000000d1')),
  3,
  'staff do'
);

select pg_temp.login_anon();
select throws_ok(
  $$ select * from public.shop_health('9f700000-0000-0000-0000-0000000000d1') $$,
  '42501', null, 'visitors cannot call it'
);

select * from finish();
rollback;
