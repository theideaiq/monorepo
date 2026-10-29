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

select plan(17);

-- O owns the supplier shop, X is someone else, A is a staff admin, F is
-- finance, C rents.
delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a291', 'o9zzq@example.iq'),
  ('00000000-0000-0000-0000-00000000a292', 'x9zzq@example.iq'),
  ('00000000-0000-0000-0000-00000000a293', 'a9zzq@example.iq'),
  ('00000000-0000-0000-0000-00000000a294', 'f9zzq@example.iq'),
  ('00000000-0000-0000-0000-00000000a295', 'c9zzq@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-00000000a293', 'admin'),
  ('00000000-0000-0000-0000-00000000a294', 'finance');
insert into public.organizations (id, name, slug, created_by) values
  ('9a3a0000-0000-0000-0000-0000000000a1', 'Game Den', 'den-9zzq', '00000000-0000-0000-0000-00000000a291'),
  ('9a3a0000-0000-0000-0000-0000000000a2', 'New Shop', 'new-9zzq', '00000000-0000-0000-0000-00000000a291');
insert into public.organization_members (organization_id, user_id, role)
select o, '00000000-0000-0000-0000-00000000a291', 'owner'
from unnest(array['9a3a0000-0000-0000-0000-0000000000a1', '9a3a0000-0000-0000-0000-0000000000a2']::uuid[]) o;
insert into public.sellers (id, organization_id, name, status) values
  ('9a3a0000-0000-0000-0000-0000000000d1', '9a3a0000-0000-0000-0000-0000000000a1', 'Game Den', 'approved'),
  ('9a3a0000-0000-0000-0000-0000000000d2', '9a3a0000-0000-0000-0000-0000000000a2', 'New Shop', 'pending');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition, category_id) values
  ('9a3a0000-0000-0000-0000-000000000001', 'catan-9zzq', 'كاتان', 'Catan', 49750, 'active', 'sale', 'new',
   (select id from public.product_categories where slug = 'games'));
insert into public.stock_items (id, product_id, variant_id, condition, purpose, status, seller_id)
select '9a3a0000-0000-0000-0000-0000000000c1', v.product_id, v.id, 'used', 'rental', 'available',
  '9a3a0000-0000-0000-0000-0000000000d1'
from public.product_variants v where v.product_id = '9a3a0000-0000-0000-0000-000000000001';
insert into public.kit_types (id, name_ar, name_en, price, extra_day_price) values
  ('kit-9zzq', 'طقم', 'Den kit', 25000, 5000);
insert into public.kit_units (id, kit_type, label, seller_id) values
  ('9a3a0000-0000-0000-0000-0000000000b1', 'kit-9zzq', 'Den kit 1', '9a3a0000-0000-0000-0000-0000000000d1'),
  ('9a3a0000-0000-0000-0000-0000000000b2', 'kit-9zzq', 'House kit 1', '00000000-0000-4000-8000-000000000001');

-- ── Terms ──────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a291');
select throws_ok(
  $$ select public.set_supply_terms('9a3a0000-0000-0000-0000-0000000000d1', 2000, 7500) $$,
  '42501', 'Staff only', 'shops can''t set their own fees'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a293', 'aal2');
select throws_ok(
  $$ select public.set_supply_terms('9a3a0000-0000-0000-0000-0000000000d2', 2000, 7500) $$,
  '23514', 'Only an approved shop can supply', 'only approved shops supply'
);
select is(
  (public.set_supply_terms('9a3a0000-0000-0000-0000-0000000000d1', 2000, 7500)).rental_fee,
  2000::bigint, 'staff set a supplier''s fees'
);

-- ── Rentals ────────────────────────────────────────────────────────────────

select pg_temp.reset_role();
insert into public.rentals (id, user_id, product_id, variant_id, name_ar, name_en, status, kind)
select '9a3a0000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000a295',
  v.product_id, v.id, 'كاتان', 'Catan', 'requested', 'plus'
from public.product_variants v where v.product_id = '9a3a0000-0000-0000-0000-000000000001';
update public.stock_items set status = 'rented', rental_id = '9a3a0000-0000-0000-0000-0000000000e1'
where id = '9a3a0000-0000-0000-0000-0000000000c1';
select is(
  (select count(*)::integer from public.supply_earnings), 0, 'a held copy earns nothing yet'
);
update public.rentals set status = 'active', started_at = now() where id = '9a3a0000-0000-0000-0000-0000000000e1';
select results_eq(
  $$ select seller_id, kind, fee, label from public.supply_earnings $$,
  $$ values ('9a3a0000-0000-0000-0000-0000000000d1'::uuid, 'rental', 2000::bigint, 'Catan') $$,
  'the rental going out earns the supplier its fee'
);
update public.rentals set status = 'overdue' where id = '9a3a0000-0000-0000-0000-0000000000e1';
update public.rentals set status = 'active' where id = '9a3a0000-0000-0000-0000-0000000000e1';
select is(
  (select count(*)::integer from public.supply_earnings), 1, 'once per rental'
);

-- ── Kits ───────────────────────────────────────────────────────────────────

insert into public.kit_bookings (id, user_id, kit_type, unit_id, starts_on, ends_on, status) values
  ('9a3a0000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000a295', 'kit-9zzq',
   '9a3a0000-0000-0000-0000-0000000000b1', current_date + 30, current_date + 32, 'booked'),
  ('9a3a0000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000a295', 'kit-9zzq',
   '9a3a0000-0000-0000-0000-0000000000b2', current_date + 30, current_date + 32, 'booked');
update public.kit_bookings set status = 'out'
where id in ('9a3a0000-0000-0000-0000-0000000000f1', '9a3a0000-0000-0000-0000-0000000000f2');
select results_eq(
  $$ select kit_booking_id, fee from public.supply_earnings where kind = 'kit' $$,
  $$ values ('9a3a0000-0000-0000-0000-0000000000f1'::uuid, 7500::bigint) $$,
  'a supplier''s kit going out earns the kit fee; The IDEA''s own earns nothing'
);

-- ── Partners → Supply ──────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a291');
select results_eq(
  $$ select kind, name_en, rentals::integer, earned::integer
     from public.supply_items('9a3a0000-0000-0000-0000-0000000000d1') $$,
  $$ values ('copy', 'Catan', 1, 2000), ('kit', 'Den kit 1', 1, 7500) $$,
  'the supplier sees its copies and kits with what each earned'
);
select is(
  (select sum(fee)::integer from public.supply_earnings), 9500, 'and its earnings'
);
select pg_temp.login_as('00000000-0000-0000-0000-00000000a292');
select throws_ok(
  $$ select * from public.supply_items('9a3a0000-0000-0000-0000-0000000000d1') $$,
  '42501', 'Not allowed', 'others can''t see a supplier''s items'
);
select is((select count(*)::integer from public.supply_earnings), 0, 'or its earnings');

-- ── Payouts ────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-00000000a294', 'aal2');
create temporary table made on commit drop as
  select * from public.prepare_payouts(current_date)
  where seller_id = '9a3a0000-0000-0000-0000-0000000000d1';
select is((select amount from made), 9500::bigint, 'the weekly payout includes the supply fees');
select is(
  (select count(*)::integer from public.supply_earnings e
   join public.payout_lines l on l.id = e.payout_line_id
   where l.payout_id = (select id from made) and l.kind = 'supply' and l.covers_until = current_date),
  2, 'each fee points at the payout''s supply line'
);
select public.cancel_payout((select id from made));
select is(
  (select count(*)::integer from public.supply_earnings where payout_line_id is null), 2,
  'cancelling the payout frees the fees for the next one'
);
select is(
  (select amount from public.prepare_payouts(current_date)
   where seller_id = '9a3a0000-0000-0000-0000-0000000000d1'),
  9500::bigint, 'which pays them'
);

-- ── The Supply section ────────────────────────────────────────────────────

select pg_temp.reset_role();
select lives_ok(
  $$ update public.organizations set features = array['selling', 'supply']
     where id = '9a3a0000-0000-0000-0000-0000000000a1' $$,
  'an organization can add the Supply section'
);
select throws_ok(
  $$ update public.organizations set features = array['nonsense']
     where id = '9a3a0000-0000-0000-0000-0000000000a1' $$,
  '23514', null, 'but not an unknown one'
);

select * from finish();
rollback;
