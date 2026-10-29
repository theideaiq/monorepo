-- Bulbs at 1 Bulb = 1 IQD (owner's master brief, step 9): rates, rounding, what earns.
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
select plan(6);

-- ── Rates ───────────────────────────────────────────────────────────────────

select is((select bulb_rate from public.store_settings), 2::numeric(4, 2), 'everyone earns 2%');
select results_eq(
  $$ select distinct tier, bulb_rate from public.plans where audience = 'plus' and tier in (1, 2, 3) order by tier $$,
  $$ values (1::smallint, 3::numeric(4, 2)), (2::smallint, 4::numeric(4, 2)), (3::smallint, 5::numeric(4, 2)) $$,
  'Glow, Shine and Blaze earn 3%, 4% and 5%'
);

-- ── Earning ─────────────────────────────────────────────────────────────────
-- M (no plan) gets a 9,750 record, a 4,750 rental with a 50,000 deposit and
-- a Plus swap fee: 2% of 14,500 = 290 Bulbs; the deposit and swap earn none.
truncate public.bulb_entries;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000099e1', 'one-iqd@example.iq', '{"full_name":"Member M"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;

insert into public.orders (id, user_id, status, subtotal, shipping_fee, total, shipping_address) values
  ('99e00000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000099e1', 'shipped', 69500, 5000, 74500, '{}'),
  ('99e00000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000099e1', 'shipped', 9750, 0, 9750, '{}');
insert into public.order_items (order_id, name_ar, name_en, unit_price, quantity, kind) values
  ('99e00000-0000-0000-0000-0000000000b1', 'أسطوانة', 'Record', 9750, 1, 'sale'),
  ('99e00000-0000-0000-0000-0000000000b1', 'إيجار', 'Rent', 4750, 1, 'rental'),
  ('99e00000-0000-0000-0000-0000000000b1', 'تأمين', 'Deposit', 50000, 1, 'deposit'),
  ('99e00000-0000-0000-0000-0000000000b1', 'تبديل', 'Swap', 5000, 1, 'swap'),
  ('99e00000-0000-0000-0000-0000000000b2', 'أسطوانة', 'Record', 9750, 1, 'sale');

update public.orders set status = 'delivered' where id = '99e00000-0000-0000-0000-0000000000b1';
select is(
  (select amount from public.bulb_entries where order_id = '99e00000-0000-0000-0000-0000000000b1' and kind = 'purchase'),
  290, 'goods and rentals earn the rate; deposits and Plus fees don''t'
);
select is(
  (select amount from public.bulb_entries where order_id = '99e00000-0000-0000-0000-0000000000b1' and reason = 'first_order'),
  2000, 'the first order earns 2,000 Bulbs'
);

-- 2% of 9,750 = 195 Bulbs, whole.
update public.orders set status = 'delivered' where id = '99e00000-0000-0000-0000-0000000000b2';
select is(
  (select amount from public.bulb_entries where order_id = '99e00000-0000-0000-0000-0000000000b2' and kind = 'purchase'),
  195, 'earning is rounded to whole Bulbs'
);

-- ── Surveys ─────────────────────────────────────────────────────────────────

select is(private.survey_reward_for(600), 1000, 'ten minutes rewards 1,000 Bulbs');

select * from finish();
rollback;
