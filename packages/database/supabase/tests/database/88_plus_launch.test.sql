-- Program revision v1, step 5b: The IDEA Plus launch: places, waitlist, homes, swaps, pause, cancel, plan change, the queue.
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

select plan(39);

-- M has Plus Glow (1 item, 1 home swap a month); A has Plus too; W waits in
-- Baghdad, O in Basra; N has no home yet; S is support.
truncate public.products, public.orders, public.rentals, public.subscriptions, public.plus_waitlist,
  public.plus_homes, public.plus_swaps cascade;
delete from public.staff;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000881', 'member@example.iq', '{"full_name":"Member M"}'),
  ('00000000-0000-0000-0000-000000000882', 'another@example.iq', '{"full_name":"Another A"}'),
  ('00000000-0000-0000-0000-000000000883', 'waiter@example.iq', '{"full_name":"Waiter W"}'),
  ('00000000-0000-0000-0000-000000000884', 'outside@example.iq', '{"full_name":"Outside O"}'),
  ('00000000-0000-0000-0000-000000000885', 'nohome@example.iq', '{"full_name":"No home N"}'),
  ('00000000-0000-0000-0000-000000000886', 'support@example.iq', '{"full_name":"Support S"}');
update public.profiles set birthday = date '1990-01-01' where birthday is null;
insert into public.staff (user_id, role) values ('00000000-0000-0000-0000-000000000886', 'support');

insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier, home_swaps)
values
  ('plus-glow-test', 'Plus Glow', 14750, 'month', 'plus', 1, 1, 1),
  ('plus-blaze-test', 'Plus Blaze', 39750, 'month', 'plus', 4, 3, 4);
insert into public.subscriptions (id, user_id, plan_id, status, provider, current_period_start, current_period_end)
values
  ('88000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000881', 'plus-glow-test', 'active', 'wayl', now(), now() + interval '30 days'),
  ('88000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000882', 'plus-glow-test', 'active', 'wayl', now(), now() + interval '30 days');

update public.store_settings set plus_capacity = 2, plus_invite_hours = 72, extra_swap_fee = 3000,
  cash_on_delivery_enabled = true;

insert into public.plus_areas (id, name_ar, name_en, weekday)
values ('88000000-0000-0000-0000-0000000000b1', 'الكرادة', 'Karrada test', 4);

insert into public.products (id, slug, name_ar, name_en, price, stock_count, status, kind, category_id) values
  ('88000000-0000-0000-0000-000000000001', 'plus-game-1', 'لعبة 1', 'Game 1', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001'),
  ('88000000-0000-0000-0000-000000000002', 'plus-game-2', 'لعبة 2', 'Game 2', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001'),
  ('88000000-0000-0000-0000-000000000003', 'plus-game-3', 'لعبة 3', 'Game 3', 59750, 2, 'active', 'rental',
   '50000000-0000-0000-0000-000000000001');

-- ── Places and the waitlist ─────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000885');
select results_eq(
  $$ select places_free, join_reason, can_join from public.plus_status() $$,
  $$ values (0, 'needs_home', false) $$,
  'with 2 places and 2 members, someone without a home is asked for their area first'
);
select throws_ok(
  $$ select public.set_plus_home(gen_random_uuid(), 'Street 62', '+9647700000885') $$,
  '23514', 'Area not available',
  'the area must be one Plus delivers to'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000883');
select lives_ok(
  $$ select public.set_plus_home('88000000-0000-0000-0000-0000000000b1', 'Street 62, Karrada', '+9647700000883') $$,
  'a person in Baghdad saves their area and address'
);
select results_eq(
  $$ select join_reason, can_join from public.plus_status() $$,
  $$ values ('full', false) $$,
  'Plus is full for them'
);
select is(public.join_plus_waitlist('plus-glow-test', 'baghdad'), 1, 'so they join the waitlist, first in line');

select pg_temp.reset_role();
update public.plus_waitlist set created_at = now() - interval '1 day';
select pg_temp.login_as('00000000-0000-0000-0000-000000000884');
select is(public.join_plus_waitlist(null, 'basra'), 1, 'someone in Basra waits for their governorate');
select results_eq(
  $$ select join_reason, waitlist_governorate from public.plus_status() $$,
  $$ values ('outside_baghdad', 'basra') $$,
  'and can''t join yet'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
select throws_ok(
  $$ select public.join_plus_waitlist(null, 'baghdad') $$,
  '23514', 'Already a member',
  'members don''t join the waitlist'
);
select is((select join_reason from public.plus_status()), 'member', 'members renew and change plan freely');

-- A leaves: the place goes to W, not to O in Basra.
select pg_temp.reset_role();
update public.subscriptions set status = 'canceled' where id = '88000000-0000-0000-0000-0000000000a2';
select results_eq(
  $$ select user_id::text, status from public.plus_waitlist order by created_at $$,
  $$ values ('00000000-0000-0000-0000-000000000883', 'invited'), ('00000000-0000-0000-0000-000000000884', 'waiting') $$,
  'a place opening invites the next person in Baghdad'
);
select is(
  (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-000000000883' and event = 'plus_invite')::integer,
  1, 'and tells them'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000885');
select is((select join_reason from public.plus_status()), 'needs_home', 'others still can''t take the held place');
select pg_temp.login_as('00000000-0000-0000-0000-000000000883');
select results_eq(
  $$ select join_reason, can_join from public.plus_status() $$,
  $$ values ('invited', true) $$,
  'the invited person can join'
);

select pg_temp.reset_role();
update public.plus_waitlist set invite_expires_at = now() - interval '1 minute' where user_id = '00000000-0000-0000-0000-000000000883';
select is(public.run_plus_waitlist(), 0, 'an expired invite invites nobody else when nobody else waits in Baghdad');
select is(
  (select status from public.plus_waitlist where user_id = '00000000-0000-0000-0000-000000000883'),
  'expired', 'and the invite lapses'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000883');
select results_eq(
  $$ select join_reason, can_join from public.plus_status() $$,
  $$ values ('open', true) $$,
  'with a place free and nobody waiting, anyone with a home can join'
);

-- Joining marks the waitlist place as used.
select pg_temp.reset_role();
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-000000000883', 'plus-glow-test', 'active', 'wayl', now(), now() + interval '30 days');
select is(
  (select status from public.plus_waitlist where user_id = '00000000-0000-0000-0000-000000000883'),
  'joined', 'joining uses the place'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000883');
select throws_ok(
  $$ select public.set_plus_settings(5, 72, 3000) $$,
  '42501', 'Not allowed',
  'only support changes the places'
);

-- ── Swaps ───────────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
select throws_ok(
  $$ select public.book_swap('{}', '{88000000-0000-0000-0000-000000000001}', 'home') $$,
  '23514', 'Add your Plus address first',
  'home swaps need the member''s address'
);
select public.set_plus_home('88000000-0000-0000-0000-0000000000b1', 'Street 1, Karrada', '+9647700000881');
select throws_ok(
  $$ select public.book_swap('{}', '{88000000-0000-0000-0000-000000000001,88000000-0000-0000-0000-000000000002}', 'home') $$,
  '23514', 'No free rental slots',
  'a swap never brings more than the plan holds'
);

create temporary table swap (id uuid) on commit drop;
grant all on swap to authenticated;
insert into swap select (public.book_swap('{}', '{88000000-0000-0000-0000-000000000001}', 'home')).id;
select results_eq(
  $$ select counted, fee, extract(dow from scheduled_for)::integer from public.plus_swaps where id = (select id from swap) $$,
  $$ values (false, 0::bigint, 4) $$,
  'the first delivery is free and comes on the area''s day (Thursday)'
);
select throws_ok(
  $$ select public.book_swap('{}', '{88000000-0000-0000-0000-000000000002}', 'home') $$,
  '23514', 'A swap is already booked',
  'one swap at a time'
);
select throws_ok(
  $$ select public.complete_swap((select id from swap)) $$,
  '42501', 'Not allowed',
  'members can''t complete their own swap'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000886', 'aal2');
select public.complete_swap((select id from swap));
select results_eq(
  $$ select status::text, due_at from public.rentals where swap_id = (select id from swap) $$,
  $$ values ('active', null::timestamptz) $$,
  'done: the item is with the member, with no due date'
);

-- Second: within the month's one home swap.
select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
truncate swap;
insert into swap select (public.book_swap(
  array[(select id from public.rentals where user_id = '00000000-0000-0000-0000-000000000881' and status = 'active')],
  '{88000000-0000-0000-0000-000000000002}', 'home')).id;
select results_eq(
  $$ select counted, fee, order_id from public.plus_swaps where id = (select id from swap) $$,
  $$ values (true, 0::bigint, null::uuid) $$,
  'a swap counts against the month''s home swaps'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000886', 'aal2');
select public.complete_swap((select id from swap));
select results_eq(
  $$ select product_id::text, status::text from public.rentals where user_id = '00000000-0000-0000-0000-000000000881' order by product_id $$,
  $$ values ('88000000-0000-0000-0000-000000000001', 'returned'), ('88000000-0000-0000-0000-000000000002', 'active') $$,
  'what went back is returned and what came is with the member'
);

-- Third this month: an extra home swap, 3,000 IQD.
select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
truncate swap;
insert into swap select (public.book_swap(
  array[(select id from public.rentals where user_id = '00000000-0000-0000-0000-000000000881' and status = 'active')],
  '{88000000-0000-0000-0000-000000000003}', 'home', 'online')).id;
select results_eq(
  $$ select s.fee, o.total, o.status::text, i.kind
     from public.plus_swaps s join public.orders o on o.id = s.order_id join public.order_items i on i.order_id = o.id
     where s.id = (select id from swap) $$,
  $$ values (3000::bigint, 3000::bigint, 'pending', 'swap') $$,
  'beyond the allowance a home swap costs 3,000 as an order'
);
select pg_temp.login_as('00000000-0000-0000-0000-000000000886', 'aal2');
select throws_ok(
  $$ select public.complete_swap((select id from swap)) $$,
  '23514', 'Waiting for payment',
  'and waits for its payment'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
select public.cancel_swap((select id from swap));
select pg_temp.reset_role();
select results_eq(
  $$ select (select status::text from public.orders where id = (select order_id from public.plus_swaps where id = (select id from swap))),
       (select count(*)::integer from public.stock_items where product_id = '88000000-0000-0000-0000-000000000003' and status = 'available'),
       (select count(*)::integer from public.rentals where return_swap_id = (select id from swap)) $$,
  $$ values ('cancelled', 2, 0) $$,
  'cancelling a swap cancels its fee, frees the held copy and keeps the item at home'
);

select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
select throws_ok(
  $$ select public.book_swap(
       array[(select id from public.rentals where user_id = '00000000-0000-0000-0000-000000000881' and status = 'active')],
       '{88000000-0000-0000-0000-000000000003}', 'counter') $$,
  '23514', 'Invalid swap',
  'swaps are home swaps only (there is no counter)'
);
select is(
  (select count(*)::integer from public.plus_swaps where user_id = '00000000-0000-0000-0000-000000000881' and status = 'booked'),
  0, 'and nothing is booked'
);
select pg_temp.reset_role();
update public.plus_swaps set status = 'cancelled' where user_id = '00000000-0000-0000-0000-000000000881' and status = 'booked';

-- ── Pause, cancel, change plan, the queue ───────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-000000000881');
select throws_ok($$ select public.pause_plus(40) $$, '23514', 'Not enough pause days left', 'pauses are up to 31 days a year');
select public.pause_plus(10);
select results_eq(
  $$ select paused_until > now() + interval '9 days', current_period_end > now() + interval '39 days'
     from public.subscriptions where id = '88000000-0000-0000-0000-0000000000a1' $$,
  $$ values (true, true) $$,
  'a pause moves the paid period on by its days'
);
select throws_ok(
  $$ select public.book_swap('{}', '{88000000-0000-0000-0000-000000000001}', 'home') $$,
  '23514', 'Plus is paused',
  'no swaps while paused'
);
select public.resume_plus();
select throws_ok($$ select public.pause_plus(31) $$, '23514', 'Not enough pause days left', 'the days used count (at least one)');

select public.change_plus_plan('plus-blaze-test');
select public.cancel_plus();
select results_eq(
  $$ select next_plan_id, cancel_at_period_end from public.subscriptions where id = '88000000-0000-0000-0000-0000000000a1' $$,
  $$ values (null::text, true) $$,
  'cancelling at the period end drops a pending plan change'
);
select throws_ok(
  $$ select public.book_swap('{}', '{88000000-0000-0000-0000-000000000001}', 'home') $$,
  '23514', 'Plus ends at the end of this period',
  'while cancelling, nothing new comes'
);
select public.change_plus_plan('plus-blaze-test');
select results_eq(
  $$ select next_plan_id, cancel_at_period_end from public.subscriptions where id = '88000000-0000-0000-0000-0000000000a1' $$,
  $$ values ('plus-blaze-test'::text, false) $$,
  'changing plan keeps Plus and switches at renewal'
);

insert into public.wishlist_items (product_id) values
  ('88000000-0000-0000-0000-000000000001'), ('88000000-0000-0000-0000-000000000002'), ('88000000-0000-0000-0000-000000000003');
select public.reorder_saved('{88000000-0000-0000-0000-000000000003,88000000-0000-0000-0000-000000000001,88000000-0000-0000-0000-000000000002}');
select results_eq(
  $$ select product_id::text from public.wishlist_items order by position $$,
  $$ values ('88000000-0000-0000-0000-000000000003'), ('88000000-0000-0000-0000-000000000001'), ('88000000-0000-0000-0000-000000000002') $$,
  'Saved is the queue, in the member''s order'
);

select * from finish();
rollback;
