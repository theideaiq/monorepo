-- Selling: claiming and recording return refunds sent through Wayl.
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

select plan(9);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000a01', 'o9p@example.iq'),
  ('00000000-0000-0000-0000-000000000a04', 'c9p@example.iq');
insert into public.organizations (id, name, slug, created_by) values
  ('9b400000-0000-0000-0000-0000000000c1', 'Game Shop', 'games-9p', '00000000-0000-0000-0000-000000000a01');
insert into public.sellers (id, organization_id, name, status) values
  ('9b400000-0000-0000-0000-0000000000d1', '9b400000-0000-0000-0000-0000000000c1', 'Game Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9b400000-0000-0000-0000-000000000001', 'game-9p', 'لعبة', 'Game', 20000, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'games'));
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, fulfilment,
  payment_method, paid_at)
values
  ('9b400000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000a04', 'delivered', 20000, 5000, 25000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '3 days'),
  ('9b400000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000a04', 'delivered', 20000, 5000, 25000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'cash_on_delivery', null);
insert into public.payments (order_id, user_id, provider, reference_id, amount, status, paid_at) values
  ('9b400000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000a04', 'wayl', 'ref-9p', 25000, 'paid', now() - interval '3 days');
insert into public.order_items (id, order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id,
  seller_name, seller_status)
select x.line, x.ord, v.product_id, v.id, 'لعبة', 'Game', 20000, 1, '9b400000-0000-0000-0000-0000000000d1',
  'Game Shop', 'picked_up'
from public.product_variants v,
  (values ('9b400000-0000-0000-0000-0000000000a1'::uuid, '9b400000-0000-0000-0000-0000000000e1'::uuid),
          ('9b400000-0000-0000-0000-0000000000a2'::uuid, '9b400000-0000-0000-0000-0000000000e2'::uuid)) x (line, ord)
where v.product_id = '9b400000-0000-0000-0000-000000000001';
insert into public.returns (id, order_id, order_item_id, seller_id, user_id, quantity, reason, photos, status, fault,
  refund_amount, refund_bulbs, refund_due_at)
values
  ('9b400000-0000-0000-0000-0000000000b1', '9b400000-0000-0000-0000-0000000000e1', '9b400000-0000-0000-0000-0000000000a1',
   '9b400000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a04', 1, 'faulty',
   array['00000000-0000-0000-0000-000000000a04/a.jpg'], 'refund_due', 'shop', 20000, 0, now()),
  ('9b400000-0000-0000-0000-0000000000b2', '9b400000-0000-0000-0000-0000000000e2', '9b400000-0000-0000-0000-0000000000a2',
   '9b400000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000a04', 1, 'faulty',
   array['00000000-0000-0000-0000-000000000a04/a.jpg'], 'refund_due', 'shop', 20000, 0, now());

select is_empty($$ select * from public.claim_return_refunds() $$, 'nothing is claimed while the setting is off');

update public.store_settings set wayl_return_refunds = true;
select results_eq(
  $$ select return_id, amount, payment_reference, refundable, item_name from public.claim_return_refunds() $$,
  $$ values ('9b400000-0000-0000-0000-0000000000b1'::uuid, 20000::bigint, 'ref-9p', 25000::bigint, 'Game') $$,
  'only the online order''s refund is claimed, with its Wayl payment'
);
select is_empty($$ select * from public.claim_return_refunds() $$, 'a claimed refund isn''t claimed twice');

select public.release_return_refund('9b400000-0000-0000-0000-0000000000b1');
select is(
  (select count(*)::integer from public.claim_return_refunds()), 1, 'a released refund is claimed again'
);

update public.returns set refund_claimed_at = now() - interval '2 hours'
where id = '9b400000-0000-0000-0000-0000000000b1';
select is(
  (select count(*)::integer from public.claim_return_refunds()), 1, 'a stale claim is taken again'
);

select is(
  (public.record_return_refund('9b400000-0000-0000-0000-0000000000b1', 'wayl-refund-1')).status,
  'refunded'::public.return_status, 'Wayl''s refund marks the return refunded'
);
select is(
  (select refunded_amount from public.payments where reference_id = 'ref-9p'), 20000::bigint,
  'and the payment remembers what went back'
);
select ok(
  public.record_return_refund('9b400000-0000-0000-0000-0000000000b1', 'again') is null,
  'recording it twice changes nothing'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000a04');
select throws_ok(
  $$ select public.claim_return_refunds() $$, '42501', null, 'customers can''t claim refunds'
);

select * from finish();
rollback;
