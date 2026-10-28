-- Selling: the customer's bell follows their return.
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

select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000f01', 'o9o@example.iq'),
  ('00000000-0000-0000-0000-000000000f04', 'c9o@example.iq');
insert into public.organizations (id, name, slug, created_by) values
  ('9b300000-0000-0000-0000-0000000000c1', 'Disc Shop', 'discs-9o', '00000000-0000-0000-0000-000000000f01');
insert into public.sellers (id, organization_id, name, status) values
  ('9b300000-0000-0000-0000-0000000000d1', '9b300000-0000-0000-0000-0000000000c1', 'Disc Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9b300000-0000-0000-0000-000000000001', 'disc-9o', 'أسطوانة', 'Disc', 20000, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'music'));
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, fulfilment,
  payment_method, paid_at)
values
  ('9b300000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000f04', 'delivered', 20000, 5000, 25000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '3 days');
insert into public.order_items (id, order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id,
  seller_name, seller_status)
select '9b300000-0000-0000-0000-0000000000a1', '9b300000-0000-0000-0000-0000000000e1', v.product_id, v.id, 'أسطوانة',
  'Disc', 20000, 1, '9b300000-0000-0000-0000-0000000000d1', 'Disc Shop', 'picked_up'
from public.product_variants v where v.product_id = '9b300000-0000-0000-0000-000000000001';
insert into public.returns (id, order_id, order_item_id, seller_id, user_id, quantity, reason, photos, status, fault)
values
  ('9b300000-0000-0000-0000-0000000000b1', '9b300000-0000-0000-0000-0000000000e1', '9b300000-0000-0000-0000-0000000000a1',
   '9b300000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000f04', 1, 'faulty',
   array['00000000-0000-0000-0000-000000000f04/a.jpg'], 'requested', 'shop');
delete from public.notifications where user_id = '00000000-0000-0000-0000-000000000f04';

update public.returns set status = 'disputed', disputed_at = now() where id = '9b300000-0000-0000-0000-0000000000b1';
select is_empty(
  $$ select 1 from public.notifications where user_id = '00000000-0000-0000-0000-000000000f04' $$,
  'a dispute stays quiet'
);
update public.returns set status = 'approved' where id = '9b300000-0000-0000-0000-0000000000b1';
select results_eq(
  $$ select event, link, data->>'name_en', (data->>'number')::bigint
     from public.notifications where user_id = '00000000-0000-0000-0000-000000000f04' $$,
  $$ values ('return_approved', '/pass/orders/9b300000-0000-0000-0000-0000000000e1', 'Disc',
     (select number from public.returns where id = '9b300000-0000-0000-0000-0000000000b1')) $$,
  'an accepted return tells the customer, linking to the order'
);
update public.returns set status = 'received', received_at = now() where id = '9b300000-0000-0000-0000-0000000000b1';
select is(
  (select count(*)::integer from public.notifications where user_id = '00000000-0000-0000-0000-000000000f04'),
  1, 'back at the shop stays quiet'
);
update public.returns set status = 'refund_due', refund_amount = 20000, refund_bulbs = 0, refund_due_at = now()
where id = '9b300000-0000-0000-0000-0000000000b1';
select is(
  (select data->>'amount' from public.notifications
   where user_id = '00000000-0000-0000-0000-000000000f04' and event = 'return_refund_due'),
  '20000', 'a refund falling due tells the customer how much'
);
update public.returns set status = 'refunded', refunded_at = now(), refund_reference = 'W-1'
where id = '9b300000-0000-0000-0000-0000000000b1';
select ok(
  exists (select 1 from public.notifications
          where user_id = '00000000-0000-0000-0000-000000000f04' and event = 'return_refunded'),
  'and so does the refund'
);

select * from finish();
rollback;
