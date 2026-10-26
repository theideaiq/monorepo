-- Program revision v1, step 5a: single-item rent, deposits, late fees and Keep it.
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
select plan(22);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- R rents on their own; M has The IDEA Plus; S is support.
truncate public.products, public.orders, public.rentals cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000871', 'renter@example.iq', '{"full_name":"Renter R"}'),
  ('00000000-0000-0000-0000-000000000872', 'member@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-000000000873', 'support@example.iq', '{"full_name":"Support S"}'),
  ('00000000-0000-0000-0000-000000000874', 'finance@example.iq', '{"full_name":"Finance F"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-000000000873', 'support'),
  ('00000000-0000-0000-0000-000000000874', 'finance');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-rent-test', 'Plus Glow', 14750, 'month', 'plus', 1, 1);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000872', 'plus-rent-test', 'active', 'wayl', now(), now() + interval '30 days');

update public.store_settings set cash_on_delivery_enabled = true, pickup_enabled = true,
  pickup_address_en = 'Karrada, Baghdad', rental_deposit_rate = 50;

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('87000000-0000-0000-0000-000000000001', 'rent-game', 'لعبة', 'Game', 59750, 3, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001');

-- ── Rates ───────────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select results_eq(
  $$ select price, days, late_fee, deposit from public.rental_quote('87000000-0000-0000-0000-000000000001') $$,
  $$ values (9750::bigint, 7, 1750::bigint, 29750::bigint) $$,
  'a game rents for 9,750 for 7 days, 1,750 a day late, with half its price as deposit'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000871');
select is_empty(
  $$ update public.rental_rates set price = 1 returning 1 $$,
  'customers can''t change the rates'
);

-- ── Renting one item ────────────────────────────────────────────────────────

create temporary table rented (id uuid) on commit drop;
grant all on rented to authenticated;
insert into rented
select (public.create_rental_order(
  '87000000-0000-0000-0000-000000000001',
  '{"full_name":"R","phone":"+9647700000871"}', 'pickup', 'online')).id;

select results_eq(
  $$ select status::text, subtotal, shipping_fee, total, max_bulbs from public.orders where id = (select id from rented) $$,
  $$ values ('pending', 39500::bigint, 0::bigint, 39500::bigint, 0) $$,
  'the order is the rent plus the deposit, picked up free, and earns no Bulbs'
);
select results_eq(
  $$ select kind, unit_price from public.order_items where order_id = (select id from rented) order by kind desc $$,
  $$ values ('rental', 9750::bigint), ('deposit', 29750::bigint) $$,
  'with a rental line and a deposit line'
);
select results_eq(
  $$ select kind, status::text, days, late_fee, deposit from public.rentals where order_id = (select id from rented) $$,
  $$ values ('single', 'requested', 7, 1750::bigint, 29750::bigint) $$,
  'and a single-item rental holding a copy'
);

select pg_temp.reset_role();
select throws_ok(
  $$ update public.rentals set status = 'active' where order_id = (select id from rented) $$,
  '23514', 'Waiting for payment',
  'the rental can''t start before it''s paid'
);
select public.complete_order_payment((select id from rented));
select is(
  (select count(*) from public.stock_items where product_id = '87000000-0000-0000-0000-000000000001' and status = 'rented')::integer,
  1,
  'paying keeps the held copy rented (no extra copy is sold)'
);
update public.orders set status = 'delivered' where id = (select id from rented);
select results_eq(
  $$ select status::text, due_at - started_at from public.rentals where order_id = (select id from rented) $$,
  $$ values ('active', interval '7 days') $$,
  'collecting it starts the rental for 7 days'
);

-- Returned 3 days late.
update public.rentals set started_at = now() - interval '10 days', due_at = now() - interval '3 days', status = 'returned', returned_at = now()
where order_id = (select id from rented);

select pg_temp.login_as('00000000-0000-0000-0000-000000000871');
select throws_ok(
  $$ select public.settle_rental((select id from public.rentals where order_id = (select id from rented))) $$,
  '42501', 'Not allowed',
  'only support settles'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000873', 'aal2');
select results_eq(
  $$ select late_charge, refund_due, amount_due from public.settle_rental((select id from public.rentals where order_id = (select id from rented)), 0) $$,
  $$ values (5250::bigint, 24500::bigint, 0::bigint) $$,
  '3 days late: 5,250 comes out of the deposit and 24,500 goes back'
);

-- Kept: 15 days late and not returned.
select pg_temp.login_as('00000000-0000-0000-0000-000000000871');
truncate rented;
insert into rented
select (public.create_rental_order(
  '87000000-0000-0000-0000-000000000001',
  '{"full_name":"R","phone":"+9647700000871"}', 'pickup', 'cash_on_delivery')).id;
select is(
  (select status::text from public.orders where id = (select id from rented)), 'confirmed',
  'a cash rental is confirmed at once'
);
select pg_temp.reset_role();
update public.orders set status = 'delivered' where id = (select id from rented);
update public.rentals set started_at = now() - interval '22 days', due_at = now() - interval '15 days' where order_id = (select id from rented);
select pg_temp.login_as('00000000-0000-0000-0000-000000000873', 'aal2');
select results_eq(
  $$ select status::text, refund_due, amount_due from public.settle_rental((select id from public.rentals where order_id = (select id from rented))) $$,
  $$ values ('kept', 0::bigint, 5000::bigint) $$,
  '14 days late or more, the item is kept at its used price (34,750) less the deposit'
);

-- Cancelled before it starts: the copy comes back.
select pg_temp.login_as('00000000-0000-0000-0000-000000000871');
truncate rented;
insert into rented
select (public.create_rental_order(
  '87000000-0000-0000-0000-000000000001',
  '{"full_name":"R","phone":"+9647700000871"}', 'pickup', 'online')).id;
select public.cancel_order((select id from rented));
select pg_temp.reset_role();
select is(
  (select status::text from public.rentals where order_id = (select id from rented)), 'cancelled',
  'cancelling the order cancels the rental'
);
select is(
  (select count(*) from public.stock_items where product_id = '87000000-0000-0000-0000-000000000001' and status = 'available')::integer,
  2,
  'and frees its copy'
);

-- ── Keep it ─────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000872');
create temporary table plus_rental (id uuid) on commit drop;
grant all on plus_rental to authenticated;
insert into plus_rental select (public.request_rental('87000000-0000-0000-0000-000000000001', null)).id;
select pg_temp.reset_role();
update public.rentals set status = 'active' where id = (select id from plus_rental);

select pg_temp.login_as('00000000-0000-0000-0000-000000000872');
select is(
  public.keep_price((select id from plus_rental)), 20000::bigint,
  'Keep it costs the used price (34,750) minus one month of the plan (14,750)'
);
truncate rented;
insert into rented select (public.keep_rental((select id from plus_rental))).id;
select results_eq(
  $$ select o.total, i.kind from public.orders o join public.order_items i on i.order_id = o.id where o.id = (select id from rented) $$,
  $$ values (20000::bigint, 'keep') $$,
  'Keep it makes an order for the rented copy'
);
select throws_ok(
  $$ select public.keep_rental((select id from plus_rental)) $$,
  '23514', 'Already being kept',
  'only once'
);
select pg_temp.reset_role();
select public.complete_order_payment((select id from rented));
select is(
  (select status::text from public.rentals where id = (select id from plus_rental)), 'kept',
  'once paid, the rental ends as kept'
);
select is(
  (select status::text from public.stock_items where order_item_id = (select i.id from public.order_items i where i.order_id = (select id from rented))),
  'sold',
  'and the member owns that copy'
);

-- Finance sets the rates and the deposit; nobody else does.
select pg_temp.login_as('00000000-0000-0000-0000-000000000873', 'aal2');
select throws_ok(
  $$ select public.set_rental_deposit_rate(40) $$,
  '42501', 'Not allowed',
  'only finance sets the deposit rate'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000874', 'aal2');
select lives_ok(
  $$ select public.set_rental_deposit_rate(40) $$,
  'finance sets the deposit rate'
);
update public.rental_rates set price = 4750 where true;
select pg_temp.reset_role();
select results_eq(
  $$ select rental_deposit_rate, (select min(price) from public.rental_rates) from public.store_settings $$,
  $$ values (40::numeric(5, 2), 4750::bigint) $$,
  'and edits the rates'
);

select * from finish();
rollback;
