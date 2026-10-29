-- Renting together: up to 3 films, books or games in one order with one
-- delivery fee, the free-delivery threshold on the rent, the quote, and
-- one item through the old path.
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

select plan(13);

-- ── Fixtures ────────────────────────────────────────────────────────────────
truncate public.products, public.orders, public.rentals cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000e01', 'together@example.iq', '{"full_name":"Together T"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;

update public.store_settings set cash_on_delivery_enabled = true, rental_deposit_rate = 50;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';
insert into public.rental_rates (category_id, price, days, late_fee)
values ('50000000-0000-0000-0000-000000000002', 19750, 7, 2750)
on conflict (category_id) do nothing;

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('9fe00000-0000-0000-0000-000000000001', 'game-9zze', 'لعبة', 'Game', 59750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000001'),
  ('9fe00000-0000-0000-0000-000000000002', 'book-9zze', 'كتاب', 'Book', 19750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000004'),
  ('9fe00000-0000-0000-0000-000000000003', 'film-9zze', 'فيلم', 'Film', 9750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000006'),
  ('9fe00000-0000-0000-0000-000000000004', 'manga-9zze', 'مانغا', 'Manga', 9750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000007'),
  ('9fe00000-0000-0000-0000-000000000005', 'camera-9zze', 'كاميرا', 'Camera', 299750, 2, 'active', 'rental', '50000000-0000-0000-0000-000000000002');

create temporary table made (name text primary key, id uuid);
grant all on made to authenticated;
create temporary table zone_id as
  select id from public.delivery_zones where governorate = 'baghdad' order by position limit 1;
grant select on zone_id to anon, authenticated;

-- ── The quote ───────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select is(
  public.rentals_quote(
    '[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000002"},{"product":"9fe00000-0000-0000-0000-000000000003"}]',
    (select id from zone_id)
  ) - 'items',
  '{"rent": 16250, "deposit": 44250, "fee": 5000, "free_from": null, "total": 65500}'::jsonb,
  'three items: their rent and deposits, and one delivery fee'
);
select is(
  jsonb_array_length(public.rentals_quote(
    '[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000004"}]'
  ) -> 'items'),
  2,
  'Books'' subcategories rent with games'
);
select throws_ok(
  $$ select public.rentals_quote('[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000005"}]') $$,
  '23514', 'Only films, books and games rent together',
  'gear rents on its own'
);
select throws_ok(
  $$ select public.rentals_quote('[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000002"},{"product":"9fe00000-0000-0000-0000-000000000003"},{"product":"9fe00000-0000-0000-0000-000000000004"}]') $$,
  '23514', 'Rent 1 to 3 items at a time',
  'at most three items'
);
select throws_ok(
  $$ select public.rentals_quote('[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000001"}]') $$,
  '23514', 'Each item once',
  'each item once'
);
select is(
  (public.rentals_quote('[{"product":"9fe00000-0000-0000-0000-000000000005"}]') ->> 'rent')::bigint,
  19750::bigint,
  'gear rents alone'
);

-- ── The order ───────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
insert into made
select 'three', (public.create_rentals_order(
  '[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000002"},{"product":"9fe00000-0000-0000-0000-000000000003"}]',
  '{"full_name":"T","phone":"+9647700000901","governorate":"baghdad","address":"Mansour"}'
)).id;

select pg_temp.reset_role();
select results_eq(
  $$ select subtotal, shipping_fee, total from public.orders where id = (select id from made where name = 'three') $$,
  $$ values (60500::bigint, 5000::bigint, 65500::bigint) $$,
  'one order with one delivery fee'
);
select is(
  (select count(*)::int from public.rentals where order_id = (select id from made where name = 'three')),
  3,
  'a rental for each item'
);
select is(
  (select count(*)::int from public.stock_items
   where status = 'rented' and rental_id in (select id from public.rentals where order_id = (select id from made where name = 'three'))),
  3,
  'each holding its own copy'
);
select is(
  (select count(*)::int from public.order_items where order_id = (select id from made where name = 'three')),
  6,
  'with a rental and a deposit line each'
);

-- ── Free delivery from the threshold ────────────────────────────────────────

update public.delivery_zones set free_from = 15000 where governorate = 'baghdad';
select pg_temp.login_as('00000000-0000-0000-0000-000000000e01');
select is(
  (public.rentals_quote(
    '[{"product":"9fe00000-0000-0000-0000-000000000001"},{"product":"9fe00000-0000-0000-0000-000000000002"},{"product":"9fe00000-0000-0000-0000-000000000003"}]',
    (select id from zone_id)
  ) ->> 'fee')::bigint,
  0::bigint,
  'rent reaching the threshold delivers free'
);
select is(
  (public.rentals_quote('[{"product":"9fe00000-0000-0000-0000-000000000003"}]', (select id from zone_id)) ->> 'fee')::bigint,
  5000::bigint,
  'rent below it pays the fee (deposits don''t count)'
);

-- ── One item, the old way ───────────────────────────────────────────────────

select is(
  (public.create_rental_order(
    '9fe00000-0000-0000-0000-000000000005',
    '{"full_name":"T","phone":"+9647700000901","governorate":"baghdad","address":"Mansour"}', 'delivery', 'online'
  )).shipping_fee,
  0::bigint,
  'one item still rents through create_rental_order, with the threshold'
);

select * from finish();
rollback;
