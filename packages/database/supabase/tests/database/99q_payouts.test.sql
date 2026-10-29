-- Selling: weekly payouts to shops.
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

select plan(15);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000b01', 'o9q@example.iq'),
  ('00000000-0000-0000-0000-000000000b04', 'c9q@example.iq'),
  ('00000000-0000-0000-0000-000000000b05', 'f9q@example.iq'),
  ('00000000-0000-0000-0000-000000000b06', 's9q@example.iq'),
  ('00000000-0000-0000-0000-000000000b07', 'x9q@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000b05', 'finance'),
  ('00000000-0000-0000-0000-000000000b06', 'support');
insert into public.organizations (id, name, slug, created_by) values
  ('9b500000-0000-0000-0000-0000000000c1', 'Book Shop', 'books-9q', '00000000-0000-0000-0000-000000000b01');
insert into public.organization_members (organization_id, user_id, role) values
  ('9b500000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000b01', 'owner');
insert into public.sellers (id, organization_id, name, status, plan, plan_billing, plan_since) values
  ('9b500000-0000-0000-0000-0000000000d1', '9b500000-0000-0000-0000-0000000000c1', 'Book Shop', 'approved',
   'pro', 'monthly', now() - interval '40 days');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9b500000-0000-0000-0000-000000000001', 'book-9q', 'كتاب', 'Book', 200000, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'books'));
insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address, fulfilment,
  payment_method, paid_at)
values
  ('9b500000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-000000000b04', 'delivered', 600000, 0, 600000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '30 days'),
  ('9b500000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-000000000b04', 'delivered', 200000, 0, 200000,
   '{"full_name":"Ali Hassan","phone":"+9647711111111","address":"House 9, Street 5","city":"Karrada","governorate":"baghdad"}',
   'delivery', 'online', now() - interval '10 days');
-- Three lines: one long delivered, one delivered last week (window open),
-- one long delivered with a return refunded at the shop's fault.
insert into public.order_items (id, order_id, product_id, variant_id, name_ar, name_en, unit_price, quantity, seller_id,
  seller_name)
select x.line, x.ord, v.product_id, v.id, 'كتاب', 'Book', 200000, x.qty,
  '9b500000-0000-0000-0000-0000000000d1', 'Book Shop'
from public.product_variants v,
  (values ('9b500000-0000-0000-0000-0000000000a1'::uuid, 1, '9b500000-0000-0000-0000-0000000000e1'::uuid),
          ('9b500000-0000-0000-0000-0000000000a2'::uuid, 1, '9b500000-0000-0000-0000-0000000000e2'::uuid),
          ('9b500000-0000-0000-0000-0000000000a3'::uuid, 2, '9b500000-0000-0000-0000-0000000000e1'::uuid)) x (line, qty, ord)
where v.product_id = '9b500000-0000-0000-0000-000000000001';
insert into public.shipments (id, order_id, carrier_id, size, seller_id, status, delivered_at) values
  ('9b500000-0000-0000-0000-0000000000f1', '9b500000-0000-0000-0000-0000000000e1', 'bx-9q-1', 'S',
   '9b500000-0000-0000-0000-0000000000d1', 'delivered', now() - interval '20 days'),
  ('9b500000-0000-0000-0000-0000000000f2', '9b500000-0000-0000-0000-0000000000e2', 'bx-9q-2', 'S',
   '9b500000-0000-0000-0000-0000000000d1', 'delivered', now() - interval '5 days');
update public.order_items set seller_status = 'picked_up',
  shipment_id = case when id = '9b500000-0000-0000-0000-0000000000a2' then '9b500000-0000-0000-0000-0000000000f2'::uuid
                     else '9b500000-0000-0000-0000-0000000000f1'::uuid end
where order_id in ('9b500000-0000-0000-0000-0000000000e1', '9b500000-0000-0000-0000-0000000000e2');
insert into public.returns (id, order_id, order_item_id, seller_id, user_id, quantity, reason, photos, status, fault,
  refund_amount, refund_bulbs, refund_due_at, refunded_at, collection_fee, delivery_refund)
values
  ('9b500000-0000-0000-0000-0000000000b1', '9b500000-0000-0000-0000-0000000000e1', '9b500000-0000-0000-0000-0000000000a3',
   '9b500000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000b04', 1, 'faulty',
   array['00000000-0000-0000-0000-000000000b04/a.jpg'], 'refunded', 'shop', 203000, 0, now(), now(), 5000, 3000);

-- What each line pays after commission.
create temporary table owed as
select id, seller_payout from public.order_items where seller_id = '9b500000-0000-0000-0000-0000000000d1';
grant select on owed to authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-000000000b06', 'aal2');
select throws_ok($$ select public.prepare_payouts() $$, '42501', null, 'only finance prepares payouts');

select pg_temp.login_as('00000000-0000-0000-0000-000000000b05', 'aal2');
select throws_ok($$ select public.prepare_payouts(current_date + 1) $$, '23514', null, 'a batch can''t pay ahead');
select is((select count(*)::integer from public.prepare_payouts()), 1, 'the shop gets one payout');
select results_eq(
  $$ select kind::text, amount from public.payout_lines order by kind, amount $$,
  $$ values
    ('collection_fee', -5000::bigint),
    ('delivery_fee', -3000::bigint),
    ('pro_fee', -49750::bigint),
    ('pro_fee', -49750::bigint),
    ('sale', least(
      (select seller_payout from owed where id = '9b500000-0000-0000-0000-0000000000a1'),
      (select seller_payout / 2 from owed where id = '9b500000-0000-0000-0000-0000000000a3'))),
    ('sale', greatest(
      (select seller_payout from owed where id = '9b500000-0000-0000-0000-0000000000a1'),
      (select seller_payout / 2 from owed where id = '9b500000-0000-0000-0000-0000000000a3'))) $$,
  'closed lines are paid (less what came back), the shop''s collection and delivery fees and each Pro month begun deducted; the open window waits'
);
select is(
  (select amount from public.payouts),
  (select sum(amount)::bigint from public.payout_lines),
  'the payout is its statement''s total'
);
select is((select count(*)::integer from public.prepare_payouts()), 0, 'nothing is paid twice');

select pg_temp.login_as('00000000-0000-0000-0000-000000000b01');
select is((select count(*)::integer from public.payout_lines), 6, 'the shop sees its statement');
select throws_ok(
  $$ select public.mark_payout_paid((select id from public.payouts), 'bank', 'TX-1') $$,
  '42501', null, 'shops don''t mark payouts paid'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000b07');
select is_empty($$ select 1 from public.payouts $$, 'other people see no payouts');

select pg_temp.login_as('00000000-0000-0000-0000-000000000b05', 'aal2');
select public.cancel_payout((select id from public.payouts));
select is((select count(*)::integer from public.payout_lines), 0, 'a cancelled payout lets go of its lines');
select is((select count(*)::integer from public.prepare_payouts()), 1, 'and the next batch takes them again');
select throws_ok(
  $$ select public.mark_payout_paid((select id from public.payouts where status = 'pending'), 'bank', ' ') $$,
  '23514', null, 'a payout needs its transfer''s reference'
);
select is(
  (public.mark_payout_paid((select id from public.payouts where status = 'pending'), 'zaincash', 'ZC-9')).status,
  'paid'::public.payout_status, 'finance marks it paid'
);

-- A week later the second line's window has closed; the Pro fee isn't due again.
select pg_temp.reset_role();
update public.shipments set delivered_at = now() - interval '15 days' where id = '9b500000-0000-0000-0000-0000000000f2';
select pg_temp.login_as('00000000-0000-0000-0000-000000000b05', 'aal2');
select is((select count(*)::integer from public.prepare_payouts()), 1, 'a week later, a new payout');
select results_eq(
  $$ select l.kind::text, l.amount from public.payouts p join public.payout_lines l on l.payout_id = p.id
     where p.status = 'pending' $$,
  $$ values ('sale', (select seller_payout from owed where id = '9b500000-0000-0000-0000-0000000000a2')) $$,
  'the next batch pays the newly closed line alone'
);

select * from finish();
rollback;
