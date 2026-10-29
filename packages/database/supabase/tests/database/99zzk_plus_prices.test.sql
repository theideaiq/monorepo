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

select plan(12);

-- O owns the shop; G has Plus Glow, S Shine, B Blaze; X has no Plus.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000ec1', 'o9zzk@example.iq'),
  ('00000000-0000-0000-0000-000000000ec2', 'g9zzk@example.iq'),
  ('00000000-0000-0000-0000-000000000ec3', 's9zzk@example.iq'),
  ('00000000-0000-0000-0000-000000000ec4', 'b9zzk@example.iq'),
  ('00000000-0000-0000-0000-000000000ec5', 'x9zzk@example.iq');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end) values
  ('00000000-0000-0000-0000-000000000ec2', 'plus-glow', 'wayl', 'active', now(), now() + interval '20 days'),
  ('00000000-0000-0000-0000-000000000ec3', 'plus-shine', 'wayl', 'active', now(), now() + interval '20 days'),
  ('00000000-0000-0000-0000-000000000ec4', 'plus-blaze', 'wayl', 'active', now(), now() + interval '20 days');
insert into public.organizations (id, name, slug, created_by) values
  ('9fb00000-0000-0000-0000-0000000000c1', 'Book Shop', 'books-9zzk', '00000000-0000-0000-0000-000000000ec1');
insert into public.organization_members (organization_id, user_id, role) values
  ('9fb00000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000ec1', 'owner');
insert into public.sellers (id, organization_id, name, status) values
  ('9fb00000-0000-0000-0000-0000000000d1', '9fb00000-0000-0000-0000-0000000000c1', 'Book Shop', 'approved');
insert into public.products (id, slug, name_ar, name_en, price, status, kind, condition) values
  ('9fb00000-0000-0000-0000-000000000001', 'book-9zzk', 'كتاب', 'Book', 24750, 'active', 'sale', 'new');
create temporary table ids (name text primary key, id uuid);
grant select on ids to authenticated, anon;
insert into ids select 'v', id from public.product_variants where product_id = '9fb00000-0000-0000-0000-000000000001';
insert into public.stock_items (product_id, condition, purpose, price, seller_id)
select '9fb00000-0000-0000-0000-000000000001', 'new', 'sale', 20000, '9fb00000-0000-0000-0000-0000000000d1'
from generate_series(1, 2);
update public.delivery_zones set active = true where governorate = 'baghdad';

-- ── Setting a Plus price ────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ec5');
select throws_ok(
  $$ select public.set_plus_price('9fb00000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 17000) $$,
  '42501', null, 'only the shop sets its Plus prices'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ec1');
select throws_ok(
  $$ select public.set_plus_price('9fb00000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 20000) $$,
  '23514', 'A Plus price is below the price', 'a Plus price is below the price'
);
select lives_ok(
  $$ select public.set_plus_price('9fb00000-0000-0000-0000-0000000000d1', (select id from ids where name = 'v'), 'new', 17000) $$,
  'the shop sets a Plus price'
);

-- ── Who sees it ────────────────────────────────────────────────────────────

select pg_temp.login_anon();
select is(
  (select plus_price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  null::bigint, 'visitors never see the Plus price'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ec5');
select is(
  (select plus_price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  null::bigint, 'nor do members without Plus'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ec2');
select is(
  (select plus_price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  17000::bigint, 'Plus members see it'
);
insert into public.cart_items (product_id, variant_id, quantity, condition, seller_id)
select '9fb00000-0000-0000-0000-000000000001', id, 1, 'new', '9fb00000-0000-0000-0000-0000000000d1' from ids where name = 'v';
select pg_temp.reset_role();
select results_eq(
  $$ select (l ->> 'unit_price')::bigint, (l ->> 'plus_price')::boolean
     from jsonb_array_elements(private.price_checkout('00000000-0000-0000-0000-000000000ec2', 'baghdad', 'delivery',
       'online', null, 0) -> 'lines') l $$,
  $$ values (17000::bigint, true) $$,
  'and pay it at checkout'
);
select is_empty(
  $$ select 1 from public.price_history h join ids on ids.id = h.variant_id and ids.name = 'v' where h.price = 17000 $$,
  'the Plus price stays out of price history'
);

-- ── Early access to campaigns ──────────────────────────────────────────────
-- A campaign taking 30% off opens in 30 hours: Blaze sees it now (48 hours
-- early), Glow not yet (24 hours).

insert into public.campaigns (id, slug, name_en, name_ar, starts_at, ends_at, published) values
  ('9fb00000-0000-0000-0000-0000000000e1', 'soon-9zzk', 'Soon', 'قريبًا', now() + interval '30 hours', now() + interval '10 days', true);
insert into public.campaign_entries (campaign_id, seller_id, discount_rate) values
  ('9fb00000-0000-0000-0000-0000000000e1', '9fb00000-0000-0000-0000-0000000000d1', 30);

select pg_temp.login_as('00000000-0000-0000-0000-000000000ec4');
select is(
  (select plus_price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  14000::bigint, 'Blaze gets a campaign''s price 48 hours early'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000ec2');
select is(
  (select plus_price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  17000::bigint, 'other plans 24 hours early'
);
select pg_temp.login_anon();
select is(
  (select price from public.product_offers('9fb00000-0000-0000-0000-000000000001')),
  20000::bigint, 'and everyone else when it opens'
);

-- ── Kits ────────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000ec3');
select is(
  (select price from public.kit_weekends('retro') limit 1),
  (select private.price_step_250(k.price * 0.9) from public.kit_types k where k.id = 'retro'),
  'Shine gets 10% off kits'
);

select * from finish();
rollback;
