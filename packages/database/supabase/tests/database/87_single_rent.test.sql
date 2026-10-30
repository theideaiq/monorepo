-- Keep it: a Plus member buys the copy they are renting (renting one item
-- on its own is gone).
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

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- M has The IDEA Plus.
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

update public.store_settings set cash_on_delivery_enabled = true, rental_deposit_rate = 50;
update public.delivery_zones set active = true, fee = 5000 where governorate = 'baghdad';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('87000000-0000-0000-0000-000000000001', 'rent-game', 'لعبة', 'Game', 59750, 3, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001');

create temporary table rented (id uuid) on commit drop;
grant all on rented to authenticated;

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

select * from finish();
rollback;
