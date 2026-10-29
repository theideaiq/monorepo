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

select plan(16);

-- ── Fixtures ────────────────────────────────────────────────────────────────
-- B sends; R has a home in Baghdad and no Plus; M has Plus Shine; N has no
-- home.
truncate public.products, public.orders, public.subscriptions, public.plus_waitlist cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000cb1', 'plusgiftb@example.iq', '{"full_name":"Basma"}'),
  ('00000000-0000-0000-0000-000000000cb2', 'plusgiftr@example.iq', '{"full_name":"Rami"}'),
  ('00000000-0000-0000-0000-000000000cb3', 'plusgiftm@example.iq', '{"full_name":"Mina"}'),
  ('00000000-0000-0000-0000-000000000cb4', 'plusgiftn@example.iq', '{"full_name":"Noor"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
update public.store_settings set plus_capacity = 60;

insert into public.plus_homes (user_id, area_id, address, phone)
select u, (select id from public.plus_areas order by name_en limit 1), 'Karrada', '+9647700000952'
from unnest(array['00000000-0000-0000-0000-000000000cb2', '00000000-0000-0000-0000-000000000cb3']::uuid[]) u;

insert into public.subscriptions (user_id, plan_id, provider, status, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000cb3', 'plus-shine', 'wayl', 'active',
  now() - interval '20 days', date_trunc('second', now()) + interval '10 days');

create temporary table made (name text primary key, value text);
grant all on made to anon, authenticated;

-- B sends `months` of Plus Glow on their own; the link's token is kept.
create function pg_temp.send_glow(label text, months integer)
returns void
language plpgsql
as $$
declare
  created uuid;
begin
  perform pg_temp.login_as('00000000-0000-0000-0000-000000000cb1');
  insert into public.cart_plus_gifts (plan_id, months) values ('plus-glow', months);
  created := (public.create_gift_order(null)).id;
  insert into made values (label, created), (label || '_token', public.gift_link(created));
  perform pg_temp.reset_role();
  perform public.complete_order_payment(created);
end;
$$;

-- ── In the cart ─────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000cb1');
select throws_ok(
  $$ insert into public.cart_plus_gifts (plan_id, months) values ('plus-glow-student', 3) $$,
  'P0002', 'Item not available',
  'a student price isn''t given'
);
select throws_ok(
  $$ insert into public.cart_plus_gifts (plan_id, months) values ('plus-glow-year', 3) $$,
  'P0002', 'Item not available',
  'months are of a monthly plan'
);
select lives_ok(
  $$ insert into public.cart_plus_gifts (plan_id, months) values ('plus-glow', 3) $$,
  'a member puts 3 months of Plus Glow in the cart'
);

select results_eq(
  $$ select (q ->> 'plus')::bigint, (q ->> 'ships')::boolean, (q ->> 'shipping_fee')::bigint,
       (q ->> 'total')::bigint, (q -> 'plus_gift' ->> 'months')::integer
     from public.checkout_quote() q $$,
  $$ values (44250::bigint, false, 0::bigint, 44250::bigint, 3) $$,
  'priced at the monthly price for each month, with nothing to deliver'
);

select throws_ok(
  $$ select public.create_order('{"full_name":"B","phone":"+9647700000951","governorate":"baghdad","address":"Mansour"}') $$,
  '23514', 'Plus months are sent as a gift',
  'starting Plus for yourself is the plan page''s checkout'
);

insert into made select 'first', (public.create_gift_order(null)).id;
insert into made select 'first_token', public.gift_link((select value::uuid from made where name = 'first'));

select pg_temp.reset_role();
select results_eq(
  $$ select i.kind, i.name_en, i.unit_price, m.months, m.used
     from public.order_items i join public.plus_gift_months m on m.order_id = i.order_id
     where i.order_id = (select value::uuid from made where name = 'first') $$,
  $$ values ('plus', 'Plus Glow · 3 months', 44250::bigint, 3, 0) $$,
  'the order has a Plus line and the months to claim'
);
select is(
  (select count(*)::int from public.cart_plus_gifts),
  0, 'and the cart is empty'
);
select public.complete_order_payment((select value::uuid from made where name = 'first'));

select pg_temp.login_anon();
select is(
  public.gift_preview((select value from made where name = 'first_token')) -> 'plus' ->> 'months',
  '3', 'the link shows the months'
);

-- ── Claiming without Plus ───────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000cb2');
select lives_ok(
  $$ select public.claim_gift((select value from made where name = 'first_token')) $$,
  'the recipient claims it without an address'
);
select pg_temp.reset_role();
select results_eq(
  $$ select s.plan_id, s.status::text, s.provider, s.cancel_at_period_end,
       s.current_period_end between now() + interval '27 days' and now() + interval '32 days',
       m.used, o.status::text
     from public.subscriptions s, public.plus_gift_months m, public.orders o
     where s.user_id = '00000000-0000-0000-0000-000000000cb2'
       and m.order_id = (select value::uuid from made where name = 'first') and o.id = m.order_id $$,
  $$ values ('plus-glow', 'active', 'gift', true, true, 1, 'delivered') $$,
  'Plus starts now for the first month, ends with the gift, and the order is delivered'
);
select results_eq(
  $$ select public.use_plus_gift_month(id), public.use_plus_gift_month(id), public.use_plus_gift_month(id)
     from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000cb2' $$,
  $$ values (true, true, false) $$,
  'each renewal uses a gifted month until none are left'
);

select pg_temp.send_glow('second', 1);
select pg_temp.login_as('00000000-0000-0000-0000-000000000cb4');
select throws_ok(
  $$ select public.claim_gift((select value from made where name = 'second_token')) $$,
  '23514', 'Add your home in Baghdad first',
  'without Plus, the recipient needs a place as joining does'
);

-- ── Claiming with Plus ──────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000cb3');
select lives_ok(
  $$ select public.claim_gift((select value from made where name = 'second_token')) $$,
  'a member claims it'
);
select pg_temp.reset_role();
select results_eq(
  $$ select s.plan_id, s.current_period_end = date_trunc('second', s.created_at) + interval '10 days', m.used
     from public.subscriptions s, public.plus_gift_months m
     where s.user_id = '00000000-0000-0000-0000-000000000cb3'
       and m.order_id = (select value::uuid from made where name = 'second') $$,
  $$ values ('plus-shine', true, 0) $$,
  'the months wait for their next renewal'
);
select public.use_plus_gift_month(id) from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000cb3';
select results_eq(
  $$ select plan_id, next_plan_id, current_period_end = date_trunc('second', created_at) + interval '10 days' + interval '1 month'
     from public.subscriptions where user_id = '00000000-0000-0000-0000-000000000cb3' $$,
  $$ values ('plus-glow', 'plus-shine', true) $$,
  'a renewal runs on the gifted plan, and their own plan comes back after'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000cb3');
select throws_ok(
  $$ select public.use_plus_gift_month(gen_random_uuid()) $$,
  '42501', null,
  'only the renewal job uses gifted months'
);

select * from finish();
rollback;
