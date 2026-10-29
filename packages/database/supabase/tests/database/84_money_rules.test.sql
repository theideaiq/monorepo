-- Program revision v1, step 2: the Plus plans, delivery by zone and the price check.
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

-- ── Plans and zones ─────────────────────────────────────────────────────────

select results_eq(
  $$ select id, amount, rental_slots, bulb_rate, free_delivery from public.plans
     where id in ('plus-glow', 'plus-shine', 'plus-blaze') order by amount $$,
  $$ values ('plus-glow', 14750::bigint, 1, 3::numeric(4, 2), false),
            ('plus-shine', 22750::bigint, 2, 4::numeric(4, 2), true),
            ('plus-blaze', 39750::bigint, 4, 5::numeric(4, 2), true) $$,
  'the Plus plans are Glow, Shine and Blaze'
);
select results_eq(
  $$ select free_from, plus_free_delivery from public.delivery_zones where governorate = 'baghdad' $$,
  $$ values (150000::bigint, true) $$,
  'Baghdad delivers free from 150,000 IQD, and to plans with free delivery'
);
select is(
  (select count(*)::int from public.delivery_zones where governorate <> 'baghdad' and (free_from is not null or plus_free_delivery)),
  0, 'other governorates keep their fees'
);
select is(
  (select return_days from public.store_settings), 14::smallint,
  'the return window is 14 days'
);

-- ── The price check ─────────────────────────────────────────────────────────

delete from public.staff;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000084f1', 'pf@example.iq'),
  ('00000000-0000-0000-0000-0000000084f2', 'ps@example.iq');
insert into public.staff (user_id, role) values
  ('00000000-0000-0000-0000-0000000084f1', 'finance'),
  ('00000000-0000-0000-0000-0000000084f2', 'support');
update public.store_settings set
  payment_fee_rate = 3, delivery_cost = 5000, max_giveaway_rate = 20, min_margin_rate = 20;

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind) values
  ('84000000-0000-0000-0000-000000000001', 'price-check', 'فحص', 'Price check', 100000, 0, 'active', 'sale');
-- 100,000 − 3,000 fee − 5,000 delivery − 20,000 giveaway leaves 72,000 before
-- cost; the floor is 20,000. Cost 50,000 leaves 22,000 (fine); 60,000
-- leaves 12,000 (below); no cost can't be checked.
insert into public.stock_items (id, product_id, condition, purpose, cost) values
  ('84100000-0000-0000-0000-000000000001', '84000000-0000-0000-0000-000000000001', 'new', 'sale', 50000),
  ('84100000-0000-0000-0000-000000000002', '84000000-0000-0000-0000-000000000001', 'new', 'sale', 60000),
  ('84100000-0000-0000-0000-000000000003', '84000000-0000-0000-0000-000000000001', 'new', 'sale', null);

select pg_temp.login_as('00000000-0000-0000-0000-0000000084f2', 'aal2');
select throws_ok(
  $$ select * from public.price_check() $$,
  '42501', null, 'support can''t run the price check'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000084f1', 'aal2');
select results_eq(
  $$ select stock_item_id, margin, floor_amount, problem from public.price_check()
     where product_id = '84000000-0000-0000-0000-000000000001' $$,
  $$ values ('84100000-0000-0000-0000-000000000002'::uuid, 12000::bigint, 20000::bigint, 'below_floor'),
            ('84100000-0000-0000-0000-000000000003'::uuid, null::bigint, 20000::bigint, 'no_cost') $$,
  'copies below the floor come first, then copies without a cost'
);
select is_empty(
  $$ select 1 from public.price_check() where stock_item_id = '84100000-0000-0000-0000-000000000001' $$,
  'a price above the floor is fine'
);

-- ── Who sets the rules ──────────────────────────────────────────────────────

select lives_ok(
  $$ select public.set_money_rules('{"cash_limit": null, "max_giveaway_rate": 15}') $$,
  'finance can lift the cash limit and lower the cap'
);
select results_eq(
  $$ select cash_limit, max_giveaway_rate from public.store_settings $$,
  $$ values (null::bigint, 15::numeric(4, 2)) $$,
  'the rules are saved'
);

select * from finish();
rollback;
