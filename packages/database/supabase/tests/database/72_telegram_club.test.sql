-- The Club's join rules (telegram_join_check) and notifications on Telegram.
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

truncate public.telegram_members, public.telegram_chats, public.bulb_entries, public.notifications cascade;
truncate public.orders cascade;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'club1@example.iq', '{"full_name":"Big Spender"}'),
  ('00000000-0000-0000-0000-0000000000f2', 'club2@example.iq', '{"full_name":"New Member"}');

insert into public.telegram_members (id, user_id) values
  (8001, '00000000-0000-0000-0000-0000000000f1'),
  (8002, '00000000-0000-0000-0000-0000000000f2'),
  (8003, null);

-- F1 is a Plus member.
insert into public.plans (id, name, amount, billing_interval, audience, rental_slots, tier)
values ('plus-club-test', 'Plus Test', 14750, 'month', 'plus', 1, 1);
insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
values ('00000000-0000-0000-0000-0000000000f1', 'plus-club-test', 'active', 'wayl', now(), now() + interval '30 days');

insert into public.telegram_chats (id, title, join_rule) values
  (-9001, 'Lobby', 'open'),
  (-9002, 'Members', 'pass'),
  (-9003, 'Plus room', 'plus');

select throws_ok(
  $$ insert into public.telegram_chats (id, title, join_rule) values (-9004, 'Bad', 'tier') $$,
  '23514', null, 'Bulbs tiers are no longer a join rule'
);

select is((select allowed from public.telegram_join_check(-9001, 8003)), true, 'anyone joins an open room');
select results_eq(
  $$ select allowed, linked from public.telegram_join_check(-9002, 8003) $$,
  $$ values (false, false) $$,
  'a members room needs a linked The IDEA Pass'
);
select is((select allowed from public.telegram_join_check(-9002, 8002)), true, 'linked members join a members room');
select is((select allowed from public.telegram_join_check(-9003, 8002)), false, 'a member without Plus can''t join a Plus room');
select is((select allowed from public.telegram_join_check(-9003, 8001)), true, 'a Plus member can');
select is_empty($$ select * from public.telegram_join_check(-1, 8001) $$, 'unknown chats have no rule');

-- Notifications go to linked members once.
insert into public.notifications (user_id, kind, event, link) values
  ('00000000-0000-0000-0000-0000000000f1', 'order', 'order_shipped', '/orders/view?id=x');
select results_eq(
  $$ select telegram_id, event from public.claim_telegram_notifications() $$,
  $$ values (8001::bigint, 'order_shipped') $$,
  'a linked member''s notification is claimed for Telegram'
);
select is_empty($$ select * from public.claim_telegram_notifications() $$, 'and only once');

select * from finish();
rollback;
