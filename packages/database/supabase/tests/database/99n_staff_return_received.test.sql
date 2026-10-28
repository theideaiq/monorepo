-- Selling: support marks a hand-booked return back at the shop.
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
  ('00000000-0000-0000-0000-000000000e01', 'o9n@example.iq'),
  ('00000000-0000-0000-0000-000000000e04', 'c9n@example.iq'),
  ('00000000-0000-0000-0000-000000000e05', 'f9n@example.iq'),
  ('00000000-0000-0000-0000-000000000e06', 's9n@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000e05', 'finance'),
  ('00000000-0000-0000-0000-000000000e06', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('9b200000-0000-0000-0000-0000000000c1', 'Tape Shop', 'tapes-9n', '00000000-0000-0000-0000-000000000e01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9b200000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000e01', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9b200000-0000-0000-0000-0000000000d1', '9b200000-0000-0000-0000-0000000000c1', 'Tape Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9b200000-0000-0000-0000-000000000001', 'tape-9n', 'شريط', 'Tape', 20000, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, fulfilment,
  payment_method, paid_at)
values
  ('9b200000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000e04', 'delivered', 20000, 5000, 25000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '3 days');
insert into public.order_items (id, order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id,
  seller_name, seller_status)
select '9b200000-0000-0000-0000-0000000000a1', '9b200000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'شريط',
  'Tape', 20000, 1, '9b200000-0000-0000-0000-0000000000d1', 'Tape Shop', 'picked_up'
from public.product_variants v where v.product_id = '9b200000-0000-0000-0000-000000000001';
insert into public.returns (id, order_id, order_item_id, seller_id, user_id, quantity, reason, photos, status, fault)
values
  ('9b200000-0000-0000-0000-0000000000b1', '9b200000-0000-0000-0000-0000000000e1', '9b200000-0000-0000-0000-0000000000a1',
   '9b200000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000e04', 1, 'faulty',
   array['00000000-0000-0000-0000-000000000e04/a.jpg'], 'requested', 'shop');

select pg_temp.login_as('00000000-0000-0000-0000-000000000e06', 'aal2');
select throws_ok(
  $$ select public.staff_mark_return_received('9b200000-0000-0000-0000-0000000000b1') $$,
  '23514', null, 'a return still waiting for the shop can''t be marked received'
);

select pg_temp.reset_role();
update public.returns set status = 'approved', responded_at = now() where id = '9b200000-0000-0000-0000-0000000000b1';

select pg_temp.login_as('00000000-0000-0000-0000-000000000e04');
select throws_ok(
  $$ select public.staff_mark_return_received('9b200000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'customers can''t mark it received'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select throws_ok(
  $$ select public.staff_mark_return_received('9b200000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'shops can''t mark it received'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e05', 'aal2');
select throws_ok(
  $$ select public.staff_mark_return_received('9b200000-0000-0000-0000-0000000000b1') $$,
  '42501', null, 'finance can''t mark it received'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000e06', 'aal2');
select is(
  (public.staff_mark_return_received('9b200000-0000-0000-0000-0000000000b1')).status,
  'received'::public.return_status, 'support marks it back at the shop'
);
select pg_temp.reset_role();
select ok(
  (select check_by between now() + interval '47 hours' and now() + interval '49 hours'
   from public.returns where id = '9b200000-0000-0000-0000-0000000000b1'),
  'the shop''s 48-hour check starts'
);

select * from finish();
rollback;
