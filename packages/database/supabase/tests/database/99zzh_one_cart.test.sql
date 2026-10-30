-- One cart: what's bought, auction wins, tickets and kits. Renting one item
-- is gone, so the cart refuses rent lines.
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

select plan(4);

truncate public.products, public.orders, public.rentals cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000c01', 'onecart@example.iq', '{"full_name":"One C"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;

update public.store_settings set cash_on_delivery_enabled = true, cash_limit = null;
update public.delivery_zones set active = true, fee = 5000, free_from = null where governorate = 'baghdad';

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id, images) values
  ('9fc00000-0000-0000-0000-000000000001', 'game-9zzh', 'لعبة', 'Game', 59750, 2, 'active', 'sale', '50000000-0000-0000-0000-000000000001', '{game.jpg}'),
  ('9fc00000-0000-0000-0000-000000000006', 'record-9zzh', 'أسطوانة', 'Record', 20000, 3, 'active', 'sale', '50000000-0000-0000-0000-000000000005', '{record.jpg}');

create temporary table zone_id as
  select id from public.delivery_zones where governorate = 'baghdad' order by position limit 1;
grant select on zone_id to authenticated;

select pg_temp.login_as('00000000-0000-0000-0000-000000000c01');
select lives_ok(
  $$ insert into public.cart_items (product_id, quantity) values ('9fc00000-0000-0000-0000-000000000006', 2) $$,
  'what''s bought goes in the cart'
);
select throws_ok(
  $$ insert into public.cart_items (product_id, purpose) values ('9fc00000-0000-0000-0000-000000000001', 'rent') $$,
  '23514', 'Renting one item is gone: add it to your Plus queue',
  'a rent line is refused'
);
select results_eq(
  $$ select (q ->> 'goods')::bigint, (q ->> 'shipping_fee')::bigint, (q ->> 'total')::bigint
     from public.checkout_quote(delivery_zone => (select id from zone_id)) q $$,
  $$ values (40000::bigint, 5000::bigint, 45000::bigint) $$,
  'the quote is what''s bought and one delivery fee'
);
select pg_temp.reset_role();
select results_eq(
  $$ select jsonb_array_length(q -> 'lines'), jsonb_array_length(coalesce(q -> 'rentals', '[]'::jsonb))
     from private.price_checkout('00000000-0000-0000-0000-000000000c01', null, 'delivery', 'online', (select id from zone_id), 0) q $$,
  $$ values (1, 0) $$,
  'with no rentals to make'
);

select * from finish();
rollback;
