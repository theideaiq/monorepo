-- Push devices and the notification push queue. Run with `bun run db:test`.
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
-- U and V are customers.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'push-u@example.iq', '{"full_name":"Customer Uday","locale":"en"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'push-v@example.iq', '{"full_name":"Customer Vian"}');

-- ── Registering devices ─────────────────────────────────────────────────────

select pg_temp.login_anon();
select throws_ok(
  $$ select public.register_push_device('fcm-token-device-one-000000', 'ios') $$,
  '42501', null, 'visitors cannot register devices'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select lives_ok(
  $$ select public.register_push_device('fcm-token-device-one-000000', 'ios') $$,
  'customers register their device'
);
select throws_ok(
  $$ select public.register_push_device('fcm-token-device-two-000000', 'windows') $$,
  '22023', null, 'only ios and android devices'
);
select throws_ok(
  $$ select public.register_push_device('short', 'android') $$,
  '23514', null, 'tokens have a minimum length'
);
select throws_ok(
  $$ insert into public.push_devices (user_id, platform, token)
     values ('00000000-0000-0000-0000-0000000000c1', 'android', 'fcm-token-direct-insert-0000') $$,
  '42501', null, 'devices are only added through register_push_device'
);
select lives_ok(
  $$ select public.register_push_device('fcm-token-device-one-000000', 'ios') $$,
  'registering again refreshes the device'
);
select is((select count(*)::int from public.push_devices), 1, 'one row per token');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.push_devices), 0, 'devices are private');
delete from public.push_devices;
select pg_temp.reset_role();
select is((select count(*)::int from public.push_devices), 1, 'nobody removes someone else''s device');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');

-- V signs in on U's phone: the token moves to V.
select public.register_push_device('fcm-token-device-one-000000', 'ios');
select is((select count(*)::int from public.push_devices), 1, 'a token moves to the account that registers it');
select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.push_devices), 0, 'the previous account loses the device');

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c2');
delete from public.push_devices;
select pg_temp.reset_role();
select is((select count(*)::int from public.push_devices), 0, 'customers remove their own device (sign-out)');

-- ── Push queue ──────────────────────────────────────────────────────────────

select pg_temp.login_as('00000000-0000-0000-0000-0000000000c1');
select throws_ok(
  $$ select * from public.claim_push_notifications() $$,
  '42501', null, 'customers cannot claim pushes'
);

select pg_temp.reset_role();
truncate public.notifications;
insert into public.notifications (id, user_id, kind, event, link, created_at) values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000c1', 'order', 'order_shipped', '/orders/view?id=1', now()),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000c2', 'support', 'support_reply', null, now()),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000c2', 'system', 'system_notice', null, now() - interval '3 days');

set local role service_role;
select is(
  (select locale from public.claim_push_notifications(array['70000000-0000-0000-0000-000000000001'::uuid])),
  'en', 'the webhook claims one notification, with the recipient''s language'
);
select is(
  (select array_agg(id::text) from public.claim_push_notifications()),
  array['70000000-0000-0000-0000-000000000002'],
  'the sweep claims only unpushed notifications of the last day'
);
select is(
  (select count(*)::int from public.claim_push_notifications()),
  0, 'a claimed notification is never pushed twice'
);

select * from finish();
rollback;
